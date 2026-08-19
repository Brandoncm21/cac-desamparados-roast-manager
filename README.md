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
- `GET/POST /api/admin/servicios` - Listar/crear servicios (con intervalos de precio)
- `GET/PUT/DELETE /api/admin/servicios/[id]` - Obtener/actualizar/desactivar servicio e intervalos
- `GET/POST /api/admin/empaques` - Listar/crear empaques
- `GET/PUT/DELETE /api/admin/empaques/[id]` - Obtener/actualizar/desactivar empaque
- `GET/POST /api/admin/empaques/[id]/precios` - Historial/nuevo precio de empaque
- `GET /api/servicios-activos` - Servicios activos con sus intervalos y empaques activos con precio vigente

## 📦 Módulo Productos/Servicios y Empaques

El módulo permite al Admin gestionar un catálogo maestro de servicios con **tarifas por intervalo de peso** y empaques con precios vigentes.

### Cómo crear/editar un servicio
1. En **Admin → Servicios → Nuevo Servicio**.
2. Complete `nombre`, `descripcion` (opcional), `prioridad` (orden en el proceso, único) y `tipo`:
   - **General**: proceso regular (chancado, trillado, molido, etc.).
   - **Tueste**: paso especial que requiere confirmación manual del operador.
   - **Empacado**: paso especial que solicita selección de empaque.
3. Agregue uno o más **intervalos de precio**:
   - `peso_min_kg` (inclusive), `peso_max_kg` (exclusivo; vacío = sin límite superior), `precio_por_kg`.
4. Validaciones: mínimo 1 intervalo, `peso_min < peso_max`, `precio > 0`, sin solapes entre intervalos del mismo servicio.
5. Guarde: el servicio y sus intervalos se persisten juntos.
6. Para editar, desde la lista pulse el lápiz: puede modificar datos, agregar/editar/eliminar intervalos y **desactivar** (soft delete) el servicio.

### Cómo funcionan los intervalos de precio
- El precio se aplica por **rango de peso**: `peso_min_kg <= peso < peso_max_kg`.
- Al iniciar un paso de la orden, el sistema busca la tarifa que corresponda al peso inicial.
- Los intervalos no pueden solaparse (validado en frontend, API y base de datos con un trigger).
- Los intervalos inactivos no se consideran al cotizar ni al resolver la tarifa.

### Flujo de creación de órdenes
1. El formulario de nueva orden carga los servicios activos (con sus intervalos) desde `/api/servicios-activos`.
2. El operador selecciona los servicios; el costo se calculará por intervalo al ejecutar cada paso en la orden.

### Datos iniciales (seed)
La migración `0021` inserta servicios base (Chancado, Trillado, Clasificación Mecánica/Manual, Tueste, Molido, Empacado) con **3 intervalos de ejemplo cada uno** (Chancado usa rangos más amplios).

> **Importante:** estos precios son valores **de referencia iniciales**, totalmente editables por el Admin desde la UI. No representan tarifas fijas de mercado.

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
