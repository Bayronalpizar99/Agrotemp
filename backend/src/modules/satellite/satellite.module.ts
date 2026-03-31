import { Module } from '@nestjs/common';
import { SatelliteController } from './satellite.controller';
import { SatelliteService } from './satellite.service';

@Module({
  controllers: [SatelliteController],
  providers: [SatelliteService],
  exports: [SatelliteService],
})
export class SatelliteModule {}
