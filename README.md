# CONCREPLUS · Analizador de checklists (GitHub Pages + Cloudflare Worker)

## Qué contiene
- `docs/index.html`: interfaz web para GitHub Pages; convierte PDF en imágenes en el navegador, envía lotes al servicio IA y permite editar/exportar hallazgos CSV/JSON.
- `.github/workflows/pages.yml`: publicación automática de `docs` en GitHub Pages.
- `worker/index.js`: API protegida con código de acceso que envía las imágenes a OpenAI sin exponer la clave.
- `worker/wrangler.toml`: configuración inicial del Worker.

## 1. Publicar el sitio en GitHub
1. Crear repositorio nuevo (preferiblemente **privado** si la organización lo permite; verificar compatibilidad de Pages con el plan). No subir claves ni checklists reales.
2. Subir **el contenido de esta carpeta** a la raíz del repositorio, respetando `.github/workflows/pages.yml`.
3. En **Settings → Pages → Build and deployment → Source**, elegir **GitHub Actions**.
4. Hacer commit en la rama `main`. Esperar a que termine la acción **Publicar en GitHub Pages**.
5. URL esperada: `https://TU-USUARIO.github.io/NOMBRE-REPOSITORIO/` (si el repositorio no se llama TU-USUARIO.github.io).

## 2. Crear servicio de IA (necesario para leer escritura manuscrita)
GitHub Pages es alojamiento estático: **no puede guardar una clave API privada ni ejecutar el análisis de IA**. Se incluye un backend para Cloudflare Workers (no Netlify).
1. Crear cuenta Cloudflare y un Worker, desplegando `worker/index.js` con Wrangler o el editor de Cloudflare.
2. En el Worker, agregar **secrets** `OPENAI_API_KEY` y `ACCESS_CODE` (código de acceso largo, privado). No escribirlos en `wrangler.toml` ni subirlos a GitHub.
3. Configurar `ALLOWED_ORIGIN` con el **origen** exacto del sitio: `https://TU-USUARIO.github.io` (sin ruta ni `/` final). Configurar `OPENAI_MODEL` según modelo con visión disponible en tu cuenta.
4. Desplegar Worker; copiar su URL HTTPS, por ejemplo `https://concreplus-checklists-api.usuario.workers.dev`.
5. Abrir GitHub Pages; pegar URL del Worker y código de acceso; seleccionar PDF y analizar.

Con Wrangler instalado, desde `worker/`:
```
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ACCESS_CODE
npx wrangler deploy
```
Antes del despliegue, sustituir `TU-USUARIO` en `worker/wrangler.toml`.

## Seguridad y limitaciones
- El código de acceso compartido es una barrera básica, **no sustituye autenticación por usuario, control de cuota o rate limiting**. Para uso empresarial, añadir Cloudflare Access, limitación de solicitudes y controles de costo.
- GitHub Pages puede ser públicamente accesible incluso si el repositorio es privado; no subir PDF con datos personales al repositorio.
- El Worker envía las imágenes a OpenAI: validar políticas de datos de la empresa y proveedor antes de usarlo.
- Hay costo de API, sujeto a modelo y volumen. Requiere cuenta API con saldo y permisos; ChatGPT Plus no incluye consumo API.
- Se requiere conexión a Internet. La lectura manuscrita puede fallar: verificar cada hallazgo antes de ordenar reparaciones.
- La tabla no se almacena en la nube: exportar CSV/JSON antes de cerrar.
- No se ha ejecutado una prueba de extremo a extremo con una clave real ni se ha desplegado en cuentas externas.
