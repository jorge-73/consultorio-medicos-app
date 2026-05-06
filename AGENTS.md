# AGENTS.md

## Project Overview
- **Type**: Full-stack medical appointment management (Express + React)
- **Backend**: Express + TypeScript + Prisma + MySQL (port 3000)
- **Frontend**: React + TypeScript + Vite (port 5173)

## Commands

### Backend
```powershell
cd backend
npm run dev          # Dev server with hot reload (nodemon + ts-node)
npm run build       # Compile TypeScript
npm run start        # Run compiled (dist/app.js)
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run migrations
```

### Frontend
```powershell
cd frontend
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # TypeScript + Vite build
npm run lint        # ESLint
```

## Key Commands Required

1. **Database setup** (after cloning):
   ```powershell
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

2. **Run sequence**: Backend first, then frontend

## Architecture

- **Backend layers**: controllers → services → repositories
- **API routes**: `/api/auth`, `/api/doctors`, `/api/appointments`
- **Auth**: JWT with roles (ADMIN, DOCTOR, PATIENT)
- **Database**: Prisma ORM, MySQL provider

## Entry Points
- Backend: `backend/src/app.ts`
- Frontend: `frontend/src/main.tsx`

## Environment
- Backend requires `.env` with `DATABASE_URL` and `FRONTEND_URL`
- Frontend proxies API to backend via Vite config