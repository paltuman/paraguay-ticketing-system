# Sistema de Tickets - Documentación Completa

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Base de Datos](#base-de-datos)
6. [Autenticación y Autorización](#autenticación-y-autorización)
7. [Roles y Permisos](#roles-y-permisos)
8. [Funcionalidades](#funcionalidades)
9. [API y Endpoints](#api-y-endpoints)
10. [Guía de Instalación](#guía-de-instalación)
11. [Configuración](#configuración)
12. [Despliegue](#despliegue)

---

## Descripción General

El **Sistema de Tickets** es una aplicación web completa para la gestión de tickets de soporte técnico. Permite a los usuarios crear, gestionar y dar seguimiento a solicitudes de soporte, mientras que los administradores pueden asignar, resolver y analizar el rendimiento del equipo.

### Características Principales

- ✅ Gestión completa de tickets (CRUD)
- ✅ Sistema de chat en tiempo real
- ✅ Asignación automática y manual de tickets
- ✅ Historial de cambios de estado
- ✅ Adjuntos de archivos y notas de voz
- ✅ Encuestas de satisfacción
- ✅ Dashboard con estadísticas
- ✅ Reportes exportables (PDF/Excel)
- ✅ Gestión de usuarios y roles
- ✅ Logs de auditoría
- ✅ Modo oscuro/claro
- ✅ Notificaciones en tiempo real
- ✅ Presencia de usuarios online

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │  Components │  │      Contexts       │  │
│  │  - Auth     │  │  - UI       │  │  - AuthContext      │  │
│  │  - Dashboard│  │  - Layout   │  │  - ImpersonationCtx │  │
│  │  - Tickets  │  │  - Charts   │  │                     │  │
│  │  - Users    │  │  - Forms    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Auth      │  │  Database   │  │     Storage         │  │
│  │  - JWT      │  │  - Postgres │  │  - Avatars          │  │
│  │  - Sessions │  │  - RLS      │  │  - Attachments      │  │
│  │  - OAuth    │  │  - Triggers │  │  - Voice Notes      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │  Realtime   │  │          Edge Functions             │   │
│  │  - Presence │  │  - send-password-reset              │   │
│  │  - Changes  │  │                                     │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| React | 18.3.1 | Biblioteca de UI |
| TypeScript | - | Tipado estático |
| Vite | - | Build tool |
| Tailwind CSS | - | Framework CSS |
| shadcn/ui | - | Componentes UI |
| React Router | 6.30.1 | Enrutamiento |
| TanStack Query | 5.83.0 | Gestión de estado del servidor |
| Recharts | 2.15.4 | Gráficos y visualizaciones |
| Zod | 3.25.76 | Validación de esquemas |
| Lucide React | 0.462.0 | Iconos |

### Backend
| Tecnología | Descripción |
|------------|-------------|
| Supabase | Backend as a Service |
| PostgreSQL | Base de datos |
| Row Level Security | Seguridad a nivel de fila |
| Edge Functions | Funciones serverless (Deno) |
| Realtime | WebSockets para tiempo real |

### Librerías Adicionales
| Librería | Uso |
|----------|-----|
| jsPDF | Exportación a PDF |
| XLSX | Exportación a Excel |
| date-fns | Manipulación de fechas |
| Sonner | Notificaciones toast |
| Framer Motion | Animaciones |

---

## Estructura del Proyecto

```
src/
├── assets/                    # Recursos estáticos
│   ├── Logo_Subsistema.png
│   └── logo-pai.png
├── components/
│   ├── auth/                  # Componentes de autenticación
│   │   └── PasswordStrengthIndicator.tsx
│   ├── chat/                  # Componentes del chat
│   │   ├── MessageStatus.tsx
│   │   ├── OnlineUsers.tsx
│   │   ├── SatisfactionSurvey.tsx
│   │   ├── VoicePlayer.tsx
│   │   └── VoiceRecorder.tsx
│   ├── dashboard/             # Componentes del dashboard
│   │   ├── AgentRatingsChart.tsx
│   │   ├── ResponseTimeChart.tsx
│   │   ├── SatisfactionChart.tsx
│   │   ├── TicketTrendsChart.tsx
│   │   └── TopPerformers.tsx
│   ├── layout/                # Componentes de layout
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   ├── ImpersonationBanner.tsx
│   │   ├── OnlineUsersIndicator.tsx
│   │   ├── Sidebar.tsx
│   │   └── ThemeToggle.tsx
│   ├── onboarding/            # Tour guiado
│   │   ├── GuidedTour.tsx
│   │   └── HelpIndicator.tsx
│   ├── statistics/            # Estadísticas
│   │   ├── ExportButton.tsx
│   │   └── TopTicketCreators.tsx
│   └── ui/                    # Componentes UI (shadcn)
├── contexts/
│   ├── AuthContext.tsx        # Contexto de autenticación
│   └── ImpersonationContext.tsx # Contexto de impersonación
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useOnlinePresence.ts   # Presencia de usuarios
│   ├── useTheme.ts
│   └── useThemeSettings.ts
├── integrations/
│   └── supabase/
│       ├── client.ts          # Cliente Supabase
│       └── types.ts           # Tipos generados
├── lib/
│   ├── audit.ts               # Funciones de auditoría
│   └── utils.ts               # Utilidades
├── pages/
│   ├── Auth.tsx               # Página de autenticación
│   ├── AuditLogs.tsx          # Logs de auditoría
│   ├── CreateTicket.tsx       # Crear ticket
│   ├── Dashboard.tsx          # Dashboard principal
│   ├── Index.tsx              # Página inicial
│   ├── NotFound.tsx           # 404
│   ├── Profile.tsx            # Perfil de usuario
│   ├── ResetPassword.tsx      # Restablecer contraseña
│   ├── Settings.tsx           # Configuración
│   ├── Statistics.tsx         # Estadísticas
│   ├── TicketDetail.tsx       # Detalle de ticket
│   ├── Tickets.tsx            # Lista de tickets
│   └── Users.tsx              # Gestión de usuarios
├── types/
│   └── database.ts            # Tipos de la base de datos
├── App.tsx                    # Componente principal
├── App.css                    # Estilos globales
├── index.css                  # Variables CSS y Tailwind
└── main.tsx                   # Punto de entrada
```

---

## Base de Datos

### Diagrama Entidad-Relación

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   departments   │     │    profiles     │     │   user_roles    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄────│ department_id   │     │ id (PK)         │
│ name            │     │ id (PK/FK)      │◄────│ user_id (FK)    │
│ description     │     │ full_name       │     │ role            │
│ created_at      │     │ email           │     │ created_at      │
└─────────────────┘     │ position        │     └─────────────────┘
                        │ avatar_url      │
                        │ is_active       │
                        │ created_at      │
                        │ updated_at      │
                        └─────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    tickets      │     │  ticket_msgs    │     │   audit_logs    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄────│ ticket_id (FK)  │     │ id (PK)         │
│ ticket_number   │     │ id (PK)         │     │ user_id (FK)    │
│ title           │     │ sender_id (FK)  │     │ action          │
│ description     │     │ message         │     │ entity_type     │
│ status          │     │ is_system_msg   │     │ entity_id       │
│ priority        │     │ status          │     │ details         │
│ created_by (FK) │     │ voice_note_url  │     │ created_at      │
│ assigned_to(FK) │     │ created_at      │     │ ip_address      │
│ department_id   │     └─────────────────┘     │ user_agent      │
│ created_at      │                             └─────────────────┘
│ updated_at      │
│ resolved_at     │     ┌─────────────────┐     ┌─────────────────┐
│ closed_at       │     │ ticket_history  │     │ ticket_attach   │
└─────────────────┘     ├─────────────────┤     ├─────────────────┤
        │               │ id (PK)         │     │ id (PK)         │
        │               │ ticket_id (FK)  │     │ ticket_id (FK)  │
        └──────────────►│ old_status      │     │ message_id (FK) │
                        │ new_status      │     │ file_name       │
                        │ changed_by (FK) │     │ file_path       │
                        │ notes           │     │ file_size       │
                        │ created_at      │     │ file_type       │
                        └─────────────────┘     │ uploaded_by(FK) │
                                                │ created_at      │
                                                └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ common_issues   │     │ notifications   │     │ satisfaction    │
├─────────────────┤     ├─────────────────┤     │    surveys      │
│ id (PK)         │     │ id (PK)         │     ├─────────────────┤
│ title           │     │ user_id (FK)    │     │ id (PK)         │
│ description     │     │ ticket_id (FK)  │     │ ticket_id (FK)  │
│ department_id   │     │ title           │     │ user_id (FK)    │
│ keywords[]      │     │ message         │     │ rating          │
│ usage_count     │     │ type            │     │ comment         │
│ is_active       │     │ is_read         │     │ created_at      │
│ created_at      │     │ created_at      │     └─────────────────┘
│ updated_at      │     └─────────────────┘
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│ ticket_viewers  │     │  rate_limits    │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ ticket_id (FK)  │     │ user_id (FK)    │
│ user_id (FK)    │     │ action          │
│ last_seen       │     │ created_at      │
└─────────────────┘     └─────────────────┘
```

### Tablas

#### 1. `departments` - Departamentos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| name | TEXT | Nombre del departamento |
| description | TEXT | Descripción |
| created_at | TIMESTAMPTZ | Fecha de creación |

#### 2. `profiles` - Perfiles de Usuario
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID del usuario (FK auth.users) |
| full_name | TEXT | Nombre completo |
| email | TEXT | Correo electrónico |
| department_id | UUID | Departamento asignado |
| position | TEXT | Cargo/Posición |
| avatar_url | TEXT | URL del avatar |
| is_active | BOOLEAN | Estado activo/inactivo |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

#### 3. `user_roles` - Roles de Usuario
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | ID del usuario |
| role | app_role | Rol asignado |
| created_at | TIMESTAMPTZ | Fecha de asignación |

**Enum `app_role`:**
- `superadmin` - Super Administrador
- `admin` - Administrador
- `supervisor` - Supervisor
- `support_user` - Usuario de Soporte

#### 4. `tickets` - Tickets
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| ticket_number | INTEGER | Número secuencial |
| title | TEXT | Título del ticket |
| description | TEXT | Descripción detallada |
| status | ticket_status | Estado actual |
| priority | ticket_priority | Prioridad |
| created_by | UUID | Usuario creador |
| assigned_to | UUID | Usuario asignado |
| department_id | UUID | Departamento |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |
| resolved_at | TIMESTAMPTZ | Fecha de resolución |
| closed_at | TIMESTAMPTZ | Fecha de cierre |

**Enum `ticket_status`:**
- `open` - Abierto
- `in_progress` - En Proceso
- `resolved` - Resuelto
- `closed` - Cerrado

**Enum `ticket_priority`:**
- `low` - Baja
- `medium` - Media
- `high` - Alta
- `urgent` - Urgente

#### 5. `ticket_messages` - Mensajes de Ticket
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| ticket_id | UUID | ID del ticket |
| sender_id | UUID | ID del remitente |
| message | TEXT | Contenido del mensaje |
| is_system_message | BOOLEAN | Es mensaje del sistema |
| status | TEXT | Estado (sent/delivered/read) |
| voice_note_url | TEXT | URL de nota de voz |
| created_at | TIMESTAMPTZ | Fecha de creación |

#### 6. `ticket_status_history` - Historial de Estados
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| ticket_id | UUID | ID del ticket |
| old_status | ticket_status | Estado anterior |
| new_status | ticket_status | Nuevo estado |
| changed_by | UUID | Usuario que cambió |
| notes | TEXT | Notas del cambio |
| created_at | TIMESTAMPTZ | Fecha del cambio |

#### 7. `ticket_attachments` - Adjuntos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| ticket_id | UUID | ID del ticket |
| message_id | UUID | ID del mensaje (opcional) |
| file_name | TEXT | Nombre del archivo |
| file_path | TEXT | Ruta en storage |
| file_size | INTEGER | Tamaño en bytes |
| file_type | TEXT | Tipo MIME |
| uploaded_by | UUID | Usuario que subió |
| created_at | TIMESTAMPTZ | Fecha de subida |

#### 8. `common_issues` - Problemas Comunes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| title | TEXT | Título del problema |
| description | TEXT | Descripción/solución |
| department_id | UUID | Departamento relacionado |
| keywords | TEXT[] | Palabras clave |
| usage_count | INTEGER | Veces utilizado |
| is_active | BOOLEAN | Activo/inactivo |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |

#### 9. `notifications` - Notificaciones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | Usuario destinatario |
| ticket_id | UUID | Ticket relacionado |
| title | TEXT | Título |
| message | TEXT | Contenido |
| type | TEXT | Tipo de notificación |
| is_read | BOOLEAN | Leída/no leída |
| created_at | TIMESTAMPTZ | Fecha de creación |

#### 10. `satisfaction_surveys` - Encuestas de Satisfacción
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| ticket_id | UUID | ID del ticket |
| user_id | UUID | Usuario que respondió |
| rating | INTEGER | Calificación (1-5) |
| comment | TEXT | Comentario opcional |
| created_at | TIMESTAMPTZ | Fecha de respuesta |

#### 11. `audit_logs` - Logs de Auditoría
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | Usuario que realizó acción |
| action | TEXT | Tipo de acción |
| entity_type | TEXT | Tipo de entidad |
| entity_id | TEXT | ID de la entidad |
| details | JSONB | Detalles adicionales |
| ip_address | TEXT | Dirección IP |
| user_agent | TEXT | User Agent |
| created_at | TIMESTAMPTZ | Fecha de la acción |

#### 12. `ticket_viewers` - Visualizadores de Ticket
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| ticket_id | UUID | ID del ticket |
| user_id | UUID | Usuario visualizando |
| last_seen | TIMESTAMPTZ | Última actividad |

#### 13. `rate_limits` - Límites de Tasa
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | ID del usuario |
| action | TEXT | Tipo de acción |
| created_at | TIMESTAMPTZ | Fecha de la acción |

---

## Autenticación y Autorización

### Flujo de Autenticación

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuario    │     │   Frontend   │     │   Supabase   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  1. Login/Signup   │                    │
       │───────────────────►│                    │
       │                    │  2. Auth Request   │
       │                    │───────────────────►│
       │                    │                    │
       │                    │  3. JWT Token      │
       │                    │◄───────────────────│
       │                    │                    │
       │  4. Session        │                    │
       │◄───────────────────│                    │
       │                    │                    │
       │  5. API Request    │                    │
       │───────────────────►│                    │
       │                    │  6. Request + JWT  │
       │                    │───────────────────►│
       │                    │                    │
       │                    │  7. RLS Validation │
       │                    │     + Response     │
       │                    │◄───────────────────│
       │  8. Data           │                    │
       │◄───────────────────│                    │
       │                    │                    │
```

### Características de Seguridad

1. **JWT Tokens**: Tokens firmados para autenticación
2. **Row Level Security (RLS)**: Políticas de seguridad a nivel de fila
3. **Funciones Security Definer**: Funciones con privilegios elevados
4. **Rate Limiting**: Límite de creación de tickets y mensajes
5. **Validación de Entrada**: Triggers para validar datos
6. **Auditoría**: Registro de todas las acciones importantes

---

## Roles y Permisos

### Matriz de Permisos

| Funcionalidad | Support User | Supervisor | Admin | Superadmin |
|---------------|:------------:|:----------:|:-----:|:----------:|
| Ver tickets propios | ✅ | ✅ | ✅ | ✅ |
| Ver todos los tickets | ❌ | ✅ | ✅ | ✅ |
| Crear tickets | ✅ | ✅ | ✅ | ✅ |
| Actualizar tickets propios | ✅ | ✅ | ✅ | ✅ |
| Actualizar cualquier ticket | ❌ | ❌ | ✅ | ✅ |
| Eliminar tickets | ❌ | ❌ | ✅ | ✅ |
| Reasignar tickets | ❌ | ❌ | ✅ | ✅ |
| Ver dashboard completo | ❌ | ✅ | ✅ | ✅ |
| Ver estadísticas | ❌ | ✅ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ | ✅ |
| Gestionar departamentos | ❌ | ❌ | ✅ | ✅ |
| Ver logs de auditoría | ❌ | ❌ | ✅ | ✅ |
| Impersonar usuarios | ❌ | ❌ | ❌ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ❌ | ✅ |
| Configuración del sistema | ❌ | ❌ | ✅ | ✅ |

---

## Funcionalidades

### 1. Gestión de Tickets

#### Crear Ticket
- Título y descripción obligatorios
- Selección de departamento
- Selección de prioridad
- Adjuntar archivos (max 10MB)
- Sugerencias de problemas comunes

#### Ver/Editar Ticket
- Chat en tiempo real
- Cambio de estado
- Reasignación (admins)
- Adjuntos y notas de voz
- Historial de cambios
- Indicador de usuarios viendo

#### Estados del Ticket
```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌────────┐
│   Open   │────►│ In Progress │────►│ Resolved │────►│ Closed │
└──────────┘     └─────────────┘     └──────────┘     └────────┘
     │                  │                  │
     └──────────────────┴──────────────────┘
              (puede regresar)
```

### 2. Dashboard

#### Para Usuarios de Soporte
- Resumen de tickets propios
- Tickets recientes
- Acceso rápido a crear ticket

#### Para Administradores/Supervisores
- Estadísticas generales
- Gráficos de tendencias
- Filtros por departamento y período
- Top performers
- Tasa de resolución

### 3. Estadísticas

- Tickets por estado
- Tickets por departamento
- Tickets por prioridad
- Tendencia de creación
- Calificaciones de agentes
- Top creadores de tickets
- Problemas más frecuentes
- Exportación a PDF/Excel

### 4. Gestión de Usuarios

- Lista de usuarios con roles
- Cambio de roles
- Activar/desactivar usuarios
- Reset de contraseña
- Impersonación (superadmin)
- Eliminación (superadmin)

### 5. Configuración

- Gestión de departamentos
- Problemas comunes
- Configuración de notificaciones
- Configuración del sistema
- Temas (claro/oscuro)
- Políticas de seguridad

### 6. Auditoría

- Registro de todas las acciones
- Filtros por acción y fecha
- Búsqueda
- Exportación

---

## API y Endpoints

### Autenticación

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: { full_name: 'John Doe' }
  }
});

// Logout
await supabase.auth.signOut();

// Reset Password
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/reset-password`
});
```

### Tickets

```typescript
// Listar tickets
const { data } = await supabase
  .from('tickets')
  .select('*, creator:profiles!created_by(*), department:departments(*)')
  .order('created_at', { ascending: false });

// Crear ticket
const { data } = await supabase
  .from('tickets')
  .insert({
    title: 'Ticket Title',
    description: 'Description',
    department_id: 'uuid',
    priority: 'medium',
    created_by: userId
  })
  .select()
  .single();

// Actualizar estado
await supabase
  .from('tickets')
  .update({ status: 'in_progress' })
  .eq('id', ticketId);
```

### Mensajes

```typescript
// Obtener mensajes
const { data } = await supabase
  .from('ticket_messages')
  .select('*, sender:profiles(*)')
  .eq('ticket_id', ticketId)
  .order('created_at', { ascending: true });

// Enviar mensaje
await supabase
  .from('ticket_messages')
  .insert({
    ticket_id: ticketId,
    sender_id: userId,
    message: 'Message content'
  });
```

### Realtime

```typescript
// Suscripción a mensajes
supabase
  .channel(`ticket-${ticketId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ticket_messages',
    filter: `ticket_id=eq.${ticketId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe();

// Presencia global
supabase
  .channel('global-presence')
  .on('presence', { event: 'sync' }, () => {
    // Handle presence sync
  })
  .subscribe();
```

---

## Guía de Instalación

### Requisitos Previos

- Node.js 18+
- npm o bun
- Cuenta de Supabase (o Lovable Cloud)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd <project-directory>
```

2. **Instalar dependencias**
```bash
npm install
# o
bun install
```

3. **Configurar variables de entorno**
```bash
# Crear archivo .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

4. **Iniciar servidor de desarrollo**
```bash
npm run dev
# o
bun dev
```

5. **Acceder a la aplicación**
```
http://localhost:5173
```

---

## Configuración

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| VITE_SUPABASE_URL | URL del proyecto Supabase |
| VITE_SUPABASE_PUBLISHABLE_KEY | Clave pública de Supabase |
| VITE_SUPABASE_PROJECT_ID | ID del proyecto |

### Configuración de Supabase

1. **Authentication**
   - Habilitar Email/Password
   - Configurar Site URL
   - Agregar Redirect URLs

2. **Storage Buckets**
   - `avatars` (público)
   - `ticket-attachments` (privado)
   - `voice-notes` (privado)

3. **Email Templates**
   - Personalizar plantilla de reset password
   - Personalizar plantilla de confirmación

---

## Despliegue

### Firebase Hosting

1. **Instalar Firebase CLI**
```bash
npm install -g firebase-tools
```

2. **Inicializar proyecto**
```bash
firebase init hosting
```

3. **Configurar firebase.json**
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

4. **Build y despliegue**
```bash
npm run build
firebase deploy
```

5. **Configurar URLs en Supabase**
   - Site URL: `https://tu-proyecto.web.app`
   - Redirect URLs: `https://tu-proyecto.web.app/reset-password`

### Lovable

1. Hacer clic en "Share" → "Publish"
2. La aplicación se desplegará automáticamente

---

## Mantenimiento

### Tareas Programadas

- Limpieza de logs de auditoría (90 días)
- Limpieza de rate limits (24 horas)

### Monitoreo

- Logs de Edge Functions
- Métricas de base de datos
- Alertas de errores

### Backups

- Backups automáticos de Supabase
- Exportación manual disponible

---

## Soporte

Para soporte técnico o reportar problemas:

1. Crear un ticket en el sistema
2. Contactar al equipo de desarrollo

---

## Changelog

### Versión 1.0.0
- Lanzamiento inicial
- Gestión completa de tickets
- Sistema de roles y permisos
- Dashboard con estadísticas
- Chat en tiempo real
- Exportación de reportes

---

*Documentación generada el 21 de enero de 2026*
