# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agrotemp / Smart View** is a precision agriculture weather monitoring platform. It consists of a **NestJS backend** (`backend/`) and a **React + Vite frontend** (`Frontend/`). The backend reads weather data from **Firebase Firestore** and exposes it via a REST API, and integrates **Google Gemini AI** for agronomy reports. The primary language across the codebase is **Spanish** (UI text, comments, field names from the weather station).

## Commands

All commands must be run from within the respective subdirectory.

### Backend (`backend/`)

```bash
npm run start:dev        # Dev server with watch mode (port 5000)
npm run build            # Production build
npm run start:prod       # Run production build
npm run lint             # Lint with auto-fix
npm run format           # Prettier format
npm run test             # Unit tests (Jest)
npm run test:e2e         # E2E tests (in backend/test/*.e2e-spec.ts)
npm run test:cov         # Test coverage
npx jest --testPathPattern=<filename>.spec.ts  # Run a single test file
```

### Frontend (`Frontend/`)

```bash
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc + vite build
npm run lint             # ESLint
npm run preview          # Preview production build
```

## Environment Variables

### Backend (`backend/.env`)
- `GEMINI_API_KEY` — Google Gemini API key for AI agro reports
- `FIREBASE_SERVICE_ACCOUNT` — JSON string of Firebase credentials (production; dev uses `src/config/credentials/firebase-service-account.json`)
- `PORT` — server port (default 5000)
- `NODE_ENV`, `CACHE_TTL`, `CORS_ORIGIN` — optional

### Frontend (`Frontend/.env`)
- `VITE_API_URL` — backend API base URL (default `http://localhost:5000/api`; production: `https://agrotemp.onrender.com/api` via `.env.production`)

## Architecture

### Backend (NestJS)

Bootstraps in `main.ts` with global prefix `/api`, `ValidationPipe` (whitelist + transform + forbidNonWhitelisted), and CORS. Swagger available at `/api/docs`.

**Module structure:**
- `FirebaseModule` — provides a `FIRESTORE` injection token via `initializeFirebase()` factory. All modules needing Firestore import this.
- `WeatherModule` — queries Firestore collections `datos_actuales` and `datos_horarios`. Endpoints: `/api/weather/current`, `/api/weather/hourly`, `/api/weather/range`, `/api/weather/stats`. Uses `CacheInterceptor`.
- `ExcelModule` — `/api/excel/download` generates `.xlsx` exports using `exceljs`, streamed directly to the response.
- `AgroAnalyticsModule` — depends on `WeatherModule`. Computes GDD, stress hours, water balance, ETo (Hargreaves-Samani), disease risk, and spray windows from hourly data, then calls **Gemini 2.5 Flash** for AI narrative. Endpoints: `/api/agro-analytics/report` (GET), `/api/agro-analytics/chat` (POST).

**Key data quirks:**
- Firestore stores dates in non-standard format (e.g. `"19/02/2026 02:00 p.m."`). `WeatherService` has custom parsing logic (`parseCustomDate`, `sortDocsByCustomDate`).
- Date range queries fetch up to 2000 docs and filter in memory (no Firestore indexes).
- Weather station field names: `Tmax`, `Tmin`, `Vmax`, `SUM_lluv`, `Temp`, `Lluvia`, `Rad_max`. Note `HourlyWeatherData.fecha` is lowercase while the Firestore field `Fecha` is uppercase.
- `shared/`, `routes/`, `controllers/`, and `models/` in `backend/src/` are legacy/duplicate — canonical code lives in `modules/` and `excel/`.
- There is a Mongoose schema in `schemas/datos-horarios.schema.ts` that is currently unused (the app uses Firestore, not MongoDB).

### Frontend (React + Vite + Chakra UI v2)

Entry: `main.tsx` wraps `App` in `ChakraProvider` with a custom dark theme (`theme.ts`).

**Navigation** is state-based (no router). `App.tsx` uses `activePage` state persisted to `sessionStorage`. Pages: `Dashboard`, `Reporte IA`, `Info`. Pages are rendered with CSS `display: block/none` (all mounted simultaneously).

**Key components:**
- `WeatherDashboard` — current + hourly weather, auto-refreshes every 5 minutes.
- `AgroReportPage` — AI report interface with crop parameter selection, metrics display, Recharts charts (LineChart, BarChart, ComposedChart), AI narrative, and chat. State persisted to `sessionStorage`.
- `Header` — fixed nav bar with gradient-border active tab styling; includes Excel export modal using `react-datepicker`.
- `HistoryPage` — static demo data with Chart.js (not connected to the API).
- `ParticleBackground` — fullscreen `@tsparticles/react` background, handles window resize.

**Services** (`src/services/`): thin `fetch` wrappers. `weather.service.ts` covers current, hourly, stats, and Excel download. `agro-analytics.service.ts` covers report generation and chat.

### Design System Conventions (`theme.ts`)

- Dark base `#171717`, primary accent orange gradient `#ff8a50 → #ff6b35`.
- Cards use a **gradient-border wrapper pattern**: outer `Box` with `p="1px"` and `bgGradient`, inner `Box` with solid `#1A1A1A` background.
- Orange gradient text: `bgGradient + bgClip="text"`.
- Hover effects: `translateY(-2px)` or `translateY(-4px)` with `boxShadow: 'glow'` (`0 0 12px 1px rgba(255, 129, 68, 0.15)`).
- Brand color tokens available via `brand.*` (e.g. `brand.orange`, `brand.cardBg`, `brand.border`).
