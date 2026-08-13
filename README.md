# SCACR - Sistema de Gestión de Torrefacción

Sistema completo de gestión para el Centro Agrícola Cantonal de Desamparados (CAC).
Administra órdenes de trabajo, clientes, empleados y perfiles de tueste de café.

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn
- Cuenta Supabase

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd cac-desamparados-roast-manager

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar migrations (si aplica)
npx supabase db push

# Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:3016

## 📋 Variables de Entorno Requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3016
NODE_ENV=development
```

## 📁 Estructura del Proyecto

```
app/
  ├── (auth)/          # Rutas de autenticación
  ├── (dashboard)/     # Rutas protegidas
  └── api/             # API REST endpoints

lib/
  ├── supabase/        # Clientes Supabase
  ├── services/        # Lógica de negocio
  ├── schemas/         # Validaciones Zod
  ├── offline/         # IndexedDB + sync offline
  ├── env.ts           # Validación de variables de entorno
  ├── error-handler.ts # Manejo de errores tipados
  └── api-helpers.ts   # Helpers para APIs

components/
  ├── ui/              # Componentes Shadcn/ui
  ├── forms/           # Formularios del dominio
  └── layout/          # Componentes de layout
```

## 🏗️ Arquitectura

### Flujo de datos
```
Client Browser
    ↓
Middleware (Autenticación)
    ↓
API Route (/api/*)
    ↓
Service Layer (Lógica)
    ↓
Supabase (PostgreSQL + Auth)
```

### Validación en capas
- **Frontend:** Validación Zod en formularios
- **API:** Validación Zod en request body
- **Database:** Constraints SQL y RLS policies

## 📚 API Endpoints

Todas las rutas `/api/*` requieren autenticación mediante Supabase Auth.

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `GET /api/clientes/[id]` - Obtener cliente
- `PUT /api/clientes/[id]` - Actualizar cliente

### Órdenes de Trabajo
- `GET /api/ordenes` - Listar órdenes
- `POST /api/ordenes` - Crear orden
- `GET /api/ordenes/[id]` - Obtener orden
- `PUT /api/ordenes/[id]` - Actualizar orden
- `POST /api/ordenes/[id]/servicios` - Agregar servicios
- `PUT /api/ordenes/[id]/estado` - Cambiar estado
- `POST /api/ordenes/[id]/especificaciones` - Agregar especificaciones

### Perfiles de Tueste
- `GET /api/perfiles-tueste/[id]` - Obtener perfil
- `POST /api/perfiles-tueste` - Crear perfil
- `GET /api/perfiles-tueste/[id]/temperaturas` - Obtener temperaturas
- `POST /api/perfiles-tueste/[id]/temperaturas` - Registrar temperaturas
- `PUT /api/perfiles-tueste/[id]/hitos/[tipoHito]` - Registrar hito
- `PUT /api/perfiles-tueste/[id]/metricas/[tipoMetrica]` - Registrar métrica
- `POST /api/perfiles-tueste/[id]/ajustes` - Registrar ajuste

### Otros
- `GET /api/empleados` - Listar empleados
- `GET /api/zonas` - Listar zonas de finca
- `POST /api/sync` - Sincronizar datos offline

### Administración (solo Admin)
- `GET/POST /api/admin/servicios` - Listar/crear servicios del maestro
- `GET/PUT/DELETE /api/admin/servicios/[id]` - Obtener/actualizar/desactivar servicio
- `GET/POST /api/admin/servicios/[id]/precios` - Historial/nuevo precio por kg
- `GET/POST /api/admin/empaques` - Listar/crear empaques
- `GET/PUT/DELETE /api/admin/empaques/[id]` - Obtener/actualizar/desactivar empaque
- `GET/POST /api/admin/empaques/[id]/precios` - Historial/nuevo precio de empaque
- `GET /api/servicios-activos` - Servicios y empaques activos con precio vigente

## 📦 Módulo Productos/Servicios y Empaques

El módulo permite al Admin gestionar un catálogo maestro de servicios y empaques con precios históricos.

### Flujo de creación de órdenes
1. El formulario de nueva orden carga los servicios/empaques activos desde `/api/servicios-activos`.
2. Al seleccionar un servicio, se auto-completa `peso_inicial` (desde `default_peso_kg`) y `precio` (precio vigente por kg).
3. Al seleccionar un empaque, se agrega su precio vigente.
4. El sistema calcula `linea_total = peso_kg * precio_por_kg + precio_empaque` en tiempo real.
5. Si el usuario modifica el precio manualmente, debe marcar el override y registrar un motivo (auditoría).

### Snapshots de precios
Cada línea de `servicios_ejecutados` guarda:
- `snapshot_precio_por_kg`: precio por kg al momento de crear la orden
- `snapshot_precio_empaque`: precio del empaque al momento
- `linea_total`: total calculado
- `override_precio` / `override_motivo`: si el precio se modificó manualmente

Cambiar un precio desde el módulo Admin **no altera** órdenes ya creadas: cada cambio cierra el precio anterior (`valid_to`) y crea uno nuevo (`valid_from`).

### Precios históricos
- `servicio_precios` y `empaque_precios` guardan la historia con `valid_from`/`valid_to`.
- Solo un precio vigente por servicio/empaque (aquel con `valid_to IS NULL`).
- Los cambios registran `creado_por` (usuario autenticado).

### Nota sobre unidades
Los pesos se almacenan en **kilogramos** usando `NUMERIC(10,2)` (nunca FLOAT) para evitar errores de precisión.

## 🔐 Autenticación

Utiliza Supabase Auth con política de sesión basada en cookies. El middleware verifica automáticamente cada request y redirige a `/login` si es necesario.

Las APIs requieren autenticación mediante `requireAuth()` en cada handler.

## 🛠️ Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Linting
npm run lint

# Verificar TypeScript
npx tsc --noEmit
```

## 📄 Licencia

MIT
