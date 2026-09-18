# Frontend auth — Turismo La Paz

Este paquete implementa el trabajo frontend relacionado con las issues #15, #9, #10 y #16:

- SPA React + TypeScript + Vite + Tailwind.
- React Router.
- Axios con interceptor Bearer y refresh automático.
- Registro de usuario.
- Login con access/refresh JWT.
- Logout enviando refresh al backend.
- Rutas protegidas.
- Persistencia básica de sesión.
- UI responsive de login y registro.
- Landing y pantalla de cuenta para demostrar el flujo.

## 1. Rama recomendada

Desde la raíz del repositorio:

```powershell
git checkout dev
git pull origin dev
git checkout -b feature/frontend-auth
```

## 2. Dependencias

Dentro de `frontend`:

```powershell
npm install axios react-router-dom
npm install -D typescript @types/react @types/react-dom
```

Si tu proyecto todavía no usa Tailwind v4 con el plugin de Vite:

```powershell
npm install -D tailwindcss @tailwindcss/vite
```

En Tailwind v4 `src/index.css` usa:

```css
@import "tailwindcss";
```

y `vite.config.ts` debe incluir `tailwindcss()` junto con `react()`.

## 3. Copiar archivos

Copia el contenido de este paquete sobre `frontend/`.

Si todavía existen:

- `src/main.jsx`
- `src/App.jsx`

elimínalos después de copiar `main.tsx` y `App.tsx`.

## 4. Vite + Tailwind v4

Tu `vite.config.ts` debería ser equivalente a:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
```

Si ya tienes proxy `/api`, consérvalo.

## 5. Contrato de backend esperado

Base URL: `/api`

### Registro

`POST /api/auth/register/`

```json
{
  "nombre": "Jordan",
  "email": "jordan@example.com",
  "password": "secreto123",
  "password_confirm": "secreto123"
}
```

Puede devolver solo usuario/mensaje o también tokens.

### Login

`POST /api/auth/login/`

```json
{
  "email": "jordan@example.com",
  "password": "secreto123"
}
```

Respuesta aceptada por el frontend:

```json
{
  "access": "...",
  "refresh": "...",
  "user": {
    "id": 1,
    "nombre": "Jordan",
    "email": "jordan@example.com"
  }
}
```

También acepta:

```json
{
  "tokens": {
    "access": "...",
    "refresh": "..."
  },
  "user": {}
}
```

### Refresh

`POST /api/auth/token/refresh/`

```json
{
  "refresh": "..."
}
```

Debe devolver:

```json
{
  "access": "..."
}
```

### Logout

`POST /api/auth/logout/`

```json
{
  "refresh": "..."
}
```

El backend puede responder `200` o `204`.

## 6. Ejecutar

```powershell
npm run dev
```

Prueba:

- `/`
- `/registro`
- `/login`
- `/mi-cuenta`

`/mi-cuenta` debe redirigir a `/login` si no hay sesión.

## 7. Build

```powershell
npm run build
```

Si tu script `build` actual solo ejecuta `vite build`, conviene cambiarlo a:

```json
"build": "tsc -b && vite build"
```

para que CI detecte errores de TypeScript.

## 8. Nota de seguridad

Para este MVP los tokens se guardan en `localStorage` porque el logout necesita enviar el refresh al backend y simplifica la integración académica.

Para producción real, la opción preferible es guardar el refresh en una cookie `HttpOnly`, `Secure` y `SameSite` gestionada por Django, y mantener el access token con el menor alcance posible.

## 9. Commits sugeridos

```powershell
git add frontend
git commit -m "feat(frontend): configure React SPA with TypeScript routing and API client"
git commit -m "feat(auth): add registration login logout and protected routes"
git commit -m "feat(ui): add responsive login and registration screens"
```

Puedes dividir los cambios antes de cada commit si necesitas mantener trazabilidad por issue.
