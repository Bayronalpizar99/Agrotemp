import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NDVIResult, NDVITimePoint } from './interfaces/ndvi.interface';

const NDVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08"], units: "REFLECTANCE" }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return {
    ndvi: [ndvi],
    dataMask: [1]
  };
}
`;

const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const STATS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

@Injectable()
export class SatelliteService {
  private readonly logger = new Logger(SatelliteService.name);
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 30_000) {
      return this.cachedToken.token;
    }

    const clientId = this.config.get<string>('SENTINEL_HUB_CLIENT_ID');
    const clientSecret = this.config.get<string>('SENTINEL_HUB_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Sentinel Hub credentials not configured (SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET)');
    }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sentinel Hub auth failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    this.logger.log('Sentinel Hub OAuth token obtained');
    return this.cachedToken.token;
  }

  async getNDVI(bbox: number[], from: string, to: string): Promise<NDVIResult> {
    const token = await this.getToken();

    const body = {
      input: {
        bounds: {
          bbox,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [
          {
            type: 'S2L2A',
            dataFilter: {
              timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
              maxCloudCoverage: 80,
            },
          },
        ],
      },
      aggregation: {
        timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
        aggregationInterval: { of: 'P5D' },
        evalscript: NDVI_EVALSCRIPT,
        resx: 0.0009,
        resy: 0.0009,
      },
      calculations: {
        ndvi: {
          statistics: {
            default: {
              percentiles: { k: [25, 50, 75] },
            },
          },
        },
      },
    };

    const res = await fetch(STATS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Sentinel Hub Statistical API error (${res.status}): ${text}`);
      throw new Error(`Error al obtener datos NDVI (${res.status}): ${text}`);
    }

    const result = await res.json();
    return this.parseStatisticalResponse(result, bbox, from, to);
  }

  private parseStatisticalResponse(
    raw: any,
    bbox: number[],
    from: string,
    to: string,
  ): NDVIResult {
    const timeSeries: NDVITimePoint[] = [];

    const intervals = raw?.data ?? [];
    for (const entry of intervals) {
      const dateFrom = entry.interval?.from?.split('T')[0];
      const stats = entry.outputs?.ndvi?.bands?.B0?.stats;
      if (!stats || stats.sampleCount === 0 || stats.mean === null || stats.mean === undefined) continue;

      const total = stats.sampleCount + (stats.noDataCount ?? 0);
      timeSeries.push({
        date: dateFrom,
        mean: Math.round(stats.mean * 1000) / 1000,
        min: Math.round(stats.min * 1000) / 1000,
        max: Math.round(stats.max * 1000) / 1000,
        stDev: Math.round(stats.stDev * 1000) / 1000,
        noDataPercent: total > 0 ? Math.round(((stats.noDataCount ?? 0) / total) * 100) : 0,
      });
    }

    const means = timeSeries.map((p) => p.mean);
    const avgNDVI = means.length > 0 ? Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 1000) / 1000 : 0;
    const minNDVI = means.length > 0 ? Math.min(...timeSeries.map((p) => p.min)) : 0;
    const maxNDVI = means.length > 0 ? Math.max(...timeSeries.map((p) => p.max)) : 0;

    let trend: 'subiendo' | 'bajando' | 'estable' = 'estable';
    if (means.length >= 2) {
      const firstHalf = means.slice(0, Math.floor(means.length / 2));
      const secondHalf = means.slice(Math.floor(means.length / 2));
      const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = avg2 - avg1;
      if (diff > 0.03) trend = 'subiendo';
      else if (diff < -0.03) trend = 'bajando';
    }

    const classification = this.classifyNDVI(avgNDVI);

    return {
      bbox,
      period: { from, to },
      timeSeries,
      summary: { avgNDVI, minNDVI, maxNDVI, classification, trend },
    };
  }

  private classifyNDVI(value: number): string {
    if (value < 0.2) return 'Suelo desnudo / agua';
    if (value < 0.4) return 'Vegetación escasa';
    if (value < 0.6) return 'Vegetación moderada';
    if (value < 0.8) return 'Vegetación densa';
    return 'Vegetación muy densa';
  }
}
