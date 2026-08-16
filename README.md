# Consultorio Médicos App

Plataforma full-stack de gestión de turnos médicos con reserva de citas, gestión de agendas por profesional y panel de administración.

- **Backend**: Express + TypeScript + Prisma + MySQL (puerto 3000)
- **Frontend**: React + TypeScript + Vite + FullCalendar (puerto 5173)

## Funcionalidades

- **Pacientes**: registro, login, búsqueda de médicos por especialidad, reserva de turnos, cancelación de turnos propios, historial de citas.
- **Médicos**: agenda semanal con FullCalendar, confirmación de turnos, gestión de horarios (alta/baja de bloques por día), registro con especialidad y matrícula.
- **Administrador**: gestión de médicos (crear, editar, desactivar) y de pacientes, control total sobre los turnos.
- **Landing page** con diseño clínico elegante, SEO y accesibilidad (WCAG).

## Stack tecnológico

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, TypeScript, Vite, FullCalendar, React Router 7, Axios |
| Backend | Node.js, Express 4, TypeScript, Prisma ORM |
| Base de datos | MySQL |
| Autenticación | JWT (roles: ADMIN, DOCTOR, PATIENT) |
| Seguridad | Helmet, CORS, express-rate-limit, bcrypt, validación Zod |
| Testing | Vitest (unit tests de servicios, sin BD) |
| Linting | ESLint 10 con typescript-eslint (flat config) |

## Estructura del proyecto

```
consultorio-medicos-app/
├── backend/                  # API REST
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos (User, Doctor, Schedule, Appointment)
│   │   ├── migrations/       # Migraciones versionadas
│   │   └── seed.ts           # Datos demo idempotentes
│   ├── src/
│   │   ├── controllers/      # Rutas + validación Zod
│   │   ├── services/         # Lógica de negocio
│   │   ├── repositories/     # Acceso a datos (Prisma)
│   │   ├── middleware/       # auth, error handler
│   │   ├── utils/            # dateUtils, validaciones de turnos
│   │   ├── __tests__/        # Tests unitarios de servicios
│   │   ├── app.ts            # Entry point
│   │   └── types/            # Tipos compartidos
│   └── eslint.config.js
└── frontend/                 # SPA React
    ├── src/
    │   ├── pages/            # Landing, Login, Register, Dashboard, Profile, DoctorPanel, AdminPanel
    │   ├── components/       # ConfirmModal, ToastNotification
    │   ├── context/          # AuthContext, ToastContext
    │   ├── services/         # Cliente Axios tipado
    │   └── utils/            # dateUtils (zona horaria)
    └── eslint.config.js
```

## Requisitos

- Node.js 18+
- MySQL 5.7+ (o XAMPP/WAMP)

## Puesta en marcha

### 1. Configurar la base de datos

Crear la base MySQL, por ejemplo:

```sql
CREATE DATABASE medical_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configurar el backend

```powershell
cd backend
Copy-Item .env.example .env
```

Editar `.env`:

```ini
DATABASE_URL="mysql://usuario:password@localhost:3306/medical_app"
JWT_SECRET=cadena-larga-aleatoria
FRONTEND_URL=http://localhost:5173
# Opcional (emails de confirmación por SMTP):
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=tu-contrasena-de-app
```

Generar el cliente Prisma, aplicar migraciones y sembrar datos demo:

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Configurar el frontend

```powershell
cd frontend
npm install
```

### 4. Ejecutar (backend primero, luego frontend)

```powershell
# Terminal 1
cd backend
npm run dev          # http://localhost:3000

# Terminal 2
cd frontend
npm run dev          # http://localhost:5173
```

## Credenciales demo (seed)

Todas con contraseña `password123`:

| Rol | Email |
|---|---|
| Administrador | `admin@medicare.local` |
| Doctor (Clínica Médica) | `carla.mendez@medicare.local` |
| Doctor (Pediatría) | `luis.fernandez@medicare.local` |
| Doctor (Dermatología) | `ana.rodriguez@medicare.local` |
| Paciente | `juan.perez@example.com`, `maria.garcia@example.com`, `pedro.lopez@example.com` |

## Scripts

### Backend (`cd backend`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload (nodemon + tsx) |
| `npm run build` | Compilar TypeScript |
| `npm run start` | Ejecutar compilado (`dist/app.js`) |
| `npm test` | Tests unitarios (Vitest, no requiere BD) |
| `npm run lint` | ESLint |
| `npm run prisma:generate` | Generar cliente Prisma |
| `npm run prisma:migrate` | Aplicar migraciones |
| `npm run prisma:seed` | Sembrar datos demo (idempotente) |
| `npm run prisma:studio` | Abrir Prisma Studio |

### Frontend (`cd frontend`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server Vite |
| `npm run build` | TypeScript + build de producción |
| `npm run lint` | ESLint |
| `npm run preview` | Servir el build de producción |

## API

Base URL: `http://localhost:3000/api`. Autenticación por `Authorization: Bearer <token>`.

### Auth (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/register` | Público | Registro (paciente o doctor; doctor: `specialty`, `licenseNum` opcionales) |
| POST | `/login` | Público | Login, devuelve JWT con `id`, `role` y `doctorId` |
| GET | `/profile` | Autenticado | Perfil propio |
| PUT | `/profile` | Autenticado | Actualizar perfil |
| PUT | `/password` | Autenticado | Cambiar contraseña |
| GET | `/patients` | ADMIN | Listar pacientes |

### Doctores (`/api/doctors`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/` | ADMIN | Crear doctor |
| GET | `/` | Público | Listar doctores activos |
| GET | `/user/:userId` | Público | Doctor por usuario |
| GET | `/:id` | Público | Doctor por id |
| PUT | `/:id` | ADMIN | Editar doctor |
| DELETE | `/:id` | ADMIN | Eliminar doctor |
| GET | `/:id/schedules` | Público | Horarios del doctor |
| POST | `/:id/schedules` | ADMIN, DOCTOR | Reemplazar horarios (solo propio si es DOCTOR) |
| DELETE | `/schedules/:scheduleId` | ADMIN, DOCTOR | Eliminar un horario (solo propio si es DOCTOR) |

### Turnos (`/api/appointments`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/` | Autenticado | Crear turno (paciente) |
| GET | `/` | Autenticado | Listar turnos (DOCTOR: solo los suyos) |
| GET | `/available-slots` | Público | Slots libres (`doctorId`, `date`) |
| GET | `/:id` | Autenticado | Detalle (solo dueño o ADMIN) |
| PUT | `/:id/status` | ADMIN, DOCTOR | Cambiar estado (DOCTOR: solo suyos) |
| PUT | `/:id/cancel` | Autenticado | Cancelar (solo el paciente dueño) |
| PUT | `/:id/confirm` | ADMIN, DOCTOR | Confirmar |

Estados de turno: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.

## Reglas de negocio

- Los turnos duran **30 minutos** y deben alinearse a esa grilla.
- Solo se reservan dentro del horario del doctor y en días con agenda activa.
- No se permiten turnos en el pasado ni superpuestos (constraint `@@unique([doctorId, date, startTime])`).
- Los pacientes solo pueden cancelar sus propios turnos; los doctores solo gestionar sus propios turnos y horarios.

## Seguridad

- JWT con `doctorId` para doctores: la autorización de turnos/horarios se valida contra el `Doctor.id` del token, no contra IDs enviados por el cliente (protección IDOR).
- Validación estricta con Zod (fechas `YYYY-MM-DD`, horas `HH:mm`) y respuestas 400 con detalle.
- Rate limiting (`express-rate-limit`, 10 req/min) en `/api/auth`.
- Helmet, CORS restringido a `FRONTEND_URL`, contraseñas con bcrypt (cost 12).
- Las respuestas de perfil/usuarios nunca incluyen el hash de contraseña.
- Manejo de errores centralizado y graceful shutdown.
- `npm audit`: 0 vulnerabilidades en backend y frontend.

## Testing

```powershell
cd backend
npm test
```

56 tests unitarios (Vitest) sobre `appointmentService` y `doctorService`: validaciones de creación de turnos, conflictos de horario, permisos por rol, IDOR y `getAvailableSlots`. Los repositorios, Prisma y el servicio de email están mockeados: no requieren base de datos.

## Notas

- Los tokens JWT emitidos antes del cambio que incorporó `doctorId` no lo incluyen: los doctores deben volver a iniciar sesión.
- El frontend normaliza fechas y horarios a la zona horaria de Argentina (America/Argentina/Buenos_Aires) para mostrar el calendario.
- Los emails (confirmación/cancelación) se envían por SMTP si `SMTP_HOST` está configurado; si falla el envío se registra el error pero la operación continúa (la app funciona sin SMTP).