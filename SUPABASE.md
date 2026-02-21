# Configurar Supabase para Nutri-app

Así los datos (comidas, agua, metas, perfil, etc.) se guardan en la nube y no se pierden al publicar la app.

## 1. Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta si no tenés.
2. **New project** → elegí nombre, contraseña de base de datos y región.
3. Esperá a que el proyecto esté listo.

## 2. Crear las tablas en la base de datos

1. En el panel del proyecto: **SQL Editor** → **New query**.
2. Ejecutá en orden: `001_app_state.sql`, `002_app_state_users_auth.sql`, `003_invitations.sql`.

## 3. Darte de alta como admin

Para ver la pestaña **Invitaciones** y poder aceptar solicitudes o enviar invitaciones:

1. En Supabase: **Authentication** → **Users** → copiá el **UUID** de tu usuario (el que usás para entrar).
2. **SQL Editor** → New query → ejecutá (reemplazá `TU_USER_ID` por tu UUID):

```sql
insert into public.app_admin (user_id) values ('TU_USER_ID');
```

Solo los usuarios en `app_admin` pueden gestionar invitaciones.

## 4. Autenticación e invitaciones

- **Entrar:** solo con **Iniciar sesión** (email + contraseña). No hay registro público.
- **Pedir invitación:** quien no tiene cuenta hace clic en "¿No tenés cuenta? Pedir invitación", pone su email y queda en lista de solicitudes.
- **Vos (admin):** en la pestaña **Invitaciones** ves las solicitudes pendientes. Podés **Aceptar** (se genera un link y se copia) o **Rechazar**. También podés **Enviar invitación** directa (email) y se copia el link para que lo envíes por tu cuenta.
- **Registro con invitación:** la persona abre el link que le pasaste; completa email (ya cargado) y contraseña y hace "Completar registro".
- **Confirmación de email:** en Supabase podés desactivarla para que entren al toque: **Authentication** → **Providers** → **Email** → desactivar "Confirm email".

## 5. Variables de entorno

1. En Supabase: **Settings** (ícono engranaje) → **API**.
2. Copiá:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public** (bajo Project API keys) → será `VITE_SUPABASE_ANON_KEY`
3. En la raíz del proyecto creá un archivo `.env` (no lo subas a Git si tiene datos sensibles):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Reiniciá el servidor de desarrollo (`npm run dev`).

Listo: solo usuarios con cuenta (por invitación) pueden acceder; cada uno ve solo sus datos. Vos como admin gestionás quién puede registrarse desde la pestaña Invitaciones.
