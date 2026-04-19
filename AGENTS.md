# AGENTS.md

This file provides guidance to AI coding agents working in this repository.

## Project Overview
**Agrotemp / Smart View**: Precision agriculture weather monitoring platform.
- **Backend**: NestJS (REST API)
- **Frontend**: React + Vite + Chakra UI v2
- **Primary Language**: **Spanish** (UI text, comments, variable names).

## Commands
Run commands from within the respective subdirectory (ackend/ or Frontend/).

### Backend (ackend/)
- Dev: 
pm run start:dev (port 5000)
- Test: 
pm run test (Jest unit), 
pm run test:e2e
- Lint/Format: 
pm run lint, 
pm run format

### Frontend (Frontend/)
- Dev: 
pm run dev (port 5173)
- Build: 
pm run build

## Architecture & Conventions

### Backend (NestJS)
- Use **Firebase Firestore** for database queries. Range queries filter in-memory up to 2000 docs.
- The ackend/.env file uses GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT (JSON, prod only), and PORT.
- **Legacy Code Warning**: shared/, outes/, controllers/, and models/ in ackend/src/ are legacy/duplicate. Canonical code lives in modules/ and excel/.
- Ignore Mongoose schemas (e.g. schemas/datos-horarios.schema.ts); the app uses Firestore.
- Globals: /api prefix, ValidationPipe enabled.

### Frontend (React + Chakra UI)
- For UI rules, routing (via ctivePage), design patterns (gradient-border cards), and environment variables, see:
  ➡️ **[.agents/skills/frontend-guidelines/SKILL.md](.agents/skills/frontend-guidelines/SKILL.md)**
