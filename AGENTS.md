# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Smart View is a precision agriculture weather monitoring platform. It consists of a **NestJS backend** (`backend/`) and a **React + Vite frontend** (`Frontend/`). The backend reads weather data from **Firebase Firestore** and exposes it via a REST API. It also integrates **Google Gemini AI** for agronomy reports. The frontend displays dashboards, historical data, Excel exports, and an AI-powered agro-analytics chat interface.

The primary language across the codebase is **Spanish** (UI text, comments, variable names in data models).

## Build and Run Commands

### Backend (`backend/`)

- **Install:** `npm install`
- **Dev server (watch mode):** `npm run start:dev` — runs on port 5000
- **Production build:** `npm run build` then `npm run start:prod`
- **Lint (with auto-fix):** `npm run lint`
- **Format:** `npm run format`
- **Unit tests:** `npm run test`
- **Single test file:** `npx jest --testPathPattern=<filename>.spec.ts`
- **E2E tests:** `npm run test:e2e`
- **Test coverage:** `npm run test:cov`

Unit tests use **Jest** with `ts-jest`. Test files are co-located with source as `*.spec.ts` (rootDir: `src`). E2E tests live in `backend/test/` and match `*.e2e-spec.ts`.

### Frontend (`Frontend/`)

- **Install:** `npm install`
- **Dev server:** `npm run dev` — runs Vite on port 5173
- **Production build:** `npm run build` (runs `tsc` then `vite build`)
- **Lint:** `npm run lint`
- **Preview production build:** `npm run preview`

## Environment Variables

### Backend
Required in `backend/.env`:
- `NODE_ENV` — `development` or `production`
- `PORT` — server port (default 5000)
- `GEMINI_API_KEY` — Google Gemini API key for AI-powered agro reports
- `FIREBASE_SERVICE_ACCOUNT` — JSON string of Firebase credentials (production only; in dev, uses `src/config/credentials/firebase-service-account.json`)
- `CACHE_TTL`, `CORS_ORIGIN` — optional

### Frontend
Required in `Frontend/.env`:
- `VITE_API_URL` — backend API base URL (default `http://localhost:5000/api`; production uses `https://agrotemp.onrender.com/api` via `.env.production`)

## Architecture

### Backend (NestJS)

The app bootstraps in `main.ts` with global prefix `/api`, a `ValidationPipe` (whitelist + transform + forbidNonWhitelisted), and CORS configured for the frontend origin.

**Module structure:**
- `AppModule` — root module; imports ConfigModule (global), CacheModule (global, 60s TTL), and all feature modules.
- `FirebaseModule` — provides a `FIRESTORE` injection token via `initializeFirebase()` factory. All modules that need Firestore import this module and inject `'FIRESTORE'`.
- `WeatherModule` — `WeatherService` queries Firestore collections `datos_actuales` and `datos_horarios`. Endpoints: `/api/weather/current`, `/api/weather/hourly`, `/api/weather/range`, `/api/weather/stats`. Uses `CacheInterceptor`.
- `ExcelModule` — `ExcelController` at `/api/excel/download` generates `.xlsx` exports using `exceljs`, streaming directly to the response.
- `AgroAnalyticsModule` — depends on `WeatherModule`. `AgroAnalyticsService` computes agronomic metrics (GDD, stress hours, water balance, ETo via Hargreaves-Samani, disease risk, spray windows) from hourly weather data, then calls **Gemini 2.5 Flash** for AI narrative. Exposes `/api/agro-analytics/report` (GET) and `/api/agro-analytics/chat` (POST).

**Key data flow:** Firestore stores raw weather station data with custom date formats (e.g. `"19/02/2026 02:00 p.m."`). `WeatherService` has custom date parsing logic (`parseCustomDate`, `sortDocsByCustomDate`) to handle this non-standard format. Date range queries fetch up to 2000 docs and filter in memory rather than relying on Firestore indexes.

**Interfaces:** `CurrentWeatherData` and `HourlyWeatherData` in `modules/weather/interfaces/`. Field names come from the weather station (e.g. `Tmax`, `Tmin`, `Vmax`, `SUM_lluv`, `Temp`, `Lluvia`, `Rad_max`). Note `HourlyWeatherData.fecha` is lowercase while Firestore field `Fecha` is uppercase — the service maps between them.

There is also a Mongoose schema in `schemas/datos-horarios.schema.ts` which is currently unused (the app uses Firestore, not MongoDB, despite `@nestjs/mongoose` being in dependencies).

### Frontend (React + Vite + Chakra UI v2)

Entry point: `main.tsx` wraps `App` in `ChakraProvider` with a custom dark theme (`theme.ts`). The theme defines brand colors (orange gradient palette on dark `#171717` background), custom component styles (Button, Card, Link), and a `glow` shadow.

**Page navigation** is state-based (no router). `App.tsx` uses `activePage` state persisted to `sessionStorage`. Pages: `Dashboard`, `Reporte IA`, `Info`.

**Components:**
- `WeatherDashboard` — fetches current + hourly weather via `weatherService`, auto-refreshes every 5 minutes.
- `AgroReportPage` — the AI report interface. Has a chat-style UI with crop parameter selection (predefined crops with base/max temps), calls `agroAnalyticsService.getReport()` and `.chatWithReport()`. Displays metrics, charts (Recharts: LineChart, BarChart, ComposedChart), and AI narrative. State is persisted to `sessionStorage`.
- `Header` — fixed nav bar with gradient-border active tab styling, includes an Excel export modal using `react-datepicker`.
- `HistoryPage` — static demo data with Chart.js charts (not connected to the API).

**Services** (`services/`): Thin fetch wrappers over the backend API. `weather.service.ts` handles current, hourly, stats, and Excel download endpoints. `agro-analytics.service.ts` handles report generation and chat.

### Design System Conventions
- Cards use a gradient-border wrapper pattern: outer `Box` with 1px padding and `bgGradient`, inner `Box` with solid `#1A1A1A` background.
- Text values use `bgGradient + bgClip="text"` for the orange gradient text effect.
- Hover effects use `translateY(-2px)` or `translateY(-4px)` with `boxShadow: 'glow'`.

## Important Notes

- The backend `.gitignore` excludes `.env` and `firebase-service-account.json` — these must be set up locally.
- Swagger docs are available at `/api/docs` (the root `/` redirects there).
- Backend ESLint has `@typescript-eslint/no-explicit-any: off` and Prettier with `endOfLine: auto`.
- The `shared/`, `routes/`, `controllers/`, and `models/` directories in `backend/src/` contain legacy or duplicate files — the canonical code lives in `modules/` and `excel/`.
