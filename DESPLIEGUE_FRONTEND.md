# Despliegue del Frontend de SHOTRA (Expo / React Native)

El frontend es una app móvil Expo (SDK 52). No se despliega en Amplify como los
Angular del ecosistema. Se distribuye por **EAS Build** (Android/iOS) y,
opcionalmente, como **web estática** en Amplify.

- API de producción: `https://api.cyclonet.com.co/api/shotra`
- Authoriza (login): `https://api.cyclonet.com.co/api/auth`
- Bundle/package: `com.cyclonet.shotra`

---

## 0. Prerrequisitos (una sola vez)

```bash
# Instalar EAS CLI (o usar npx eas-cli)
npm install -g eas-cli

# Iniciar sesión en tu cuenta Expo
eas login
```

Enlazar el proyecto con tu cuenta Expo (genera el projectId real y lo escribe
en app.json → extra.eas.projectId):

```bash
cd Shotra/Frontend-Shotra
eas init
```

> Esto reemplaza el placeholder `REEMPLAZAR_CON_EAS_INIT` en `app.json`.

---

## 1. Perfiles de build (ya configurados en eas.json)

| Perfil | Uso | API |
|--------|-----|-----|
| `development` | Dev client, con Metro | localhost |
| `preview` | APK instalable para pruebas internas (QA) | producción |
| `production` | Build para stores (aab/ipa) | producción |

Las variables `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_AUTHORIZA_URL` están embebidas
por perfil en `eas.json`, así que el build de producción apunta solo a la EC2.

---

## 2. Build de prueba (APK Android para QA)

```bash
cd Shotra/Frontend-Shotra
eas build --platform android --profile preview
```

Al terminar, EAS entrega un enlace de descarga del `.apk`. Instálalo en un
dispositivo Android para probar contra producción sin publicar en la store.

---

## 3. Build de producción (stores)

```bash
# Android (genera .aab para Google Play)
eas build --platform android --profile production

# iOS (requiere cuenta Apple Developer)
eas build --platform ios --profile production
```

### Publicar en stores (opcional, cuando esté listo)

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

> Requiere credenciales de Google Play Console / App Store Connect. EAS guía el
> proceso la primera vez.

---

## 4. Versión web (Amplify)

La versión web es la misma app compilada con `react-native-web`. En pantallas
anchas (≥ 900 px) usa el diseño de tres zonas (barra lateral, lista y panel de
detalle); en el celular se ve igual que la app. Se puede **instalar** (PWA:
manifiesto e íconos en `public/`) y muestra **avisos del navegador** para
mensajes y ofertas nuevas cuando la pestaña no está a la vista (el usuario los
activa en *Avisos → Activar*; no hay push web: llegan mientras la pestaña esté
abierta).

Build local:

```bash
cd Shotra/Frontend-Shotra
# usa EXPO_PUBLIC_API_URL / EXPO_PUBLIC_AUTHORIZA_URL de .env.production
npx expo export --platform web
```

La plantilla HTML es `public/index.html` (idioma, manifiesto, íconos, color de
tema y metadatos de iPhone); todo lo que está en `public/` se copia tal cual a
`dist/`.

### 4.1 App de Amplify

La app **Cyclonet-Shotra** está conectada al repo `ti-cyclonet/Frontend-Shotra`,
rama `master`, con el build spec `amplify-shotra.yml` del repo `cyclonet`
(raíz de este meta-repo). Variables de entorno en Amplify (opcionales: si
faltan se usan las de `.env.production`):

- `EXPO_PUBLIC_API_URL=https://api.cyclonet.com.co/api/shotra`
- `EXPO_PUBLIC_AUTHORIZA_URL=https://api.cyclonet.com.co/api/auth`

### 4.2 Regla SPA (obligatoria)

La web es una sola página: sin esta regla, recargar o abrir un enlace directo
(`/request/123`, `/chat/…`) da **404**. En Amplify → *Hosting* → *Rewrites and
redirects* → *Manage* → agregar (de primera):

| Source address | Target address | Type |
|---|---|---|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|png\|txt\|svg\|webp\|woff\|woff2\|ttf\|otf\|map\|json\|webmanifest)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

O en JSON (*Open text editor*):

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|webp|woff|woff2|ttf|otf|map|json|webmanifest)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

La expresión deja pasar los archivos con extensión (bundles de `_expo/`,
`manifest.webmanifest`, íconos): si se reescribieran al HTML, la PWA y la app
dejarían de cargar. No usar `/<*>` aquí por esa razón.

### 4.3 Dominio `shotra.cyclonet.com.co`

Hoy el subdominio **no existe en DNS**. Para publicarlo:

1. Amplify → Cyclonet-Shotra → *Hosting* → *Custom domains* → *Add domain* →
   `cyclonet.com.co` (la zona de Route 53 `Z02176422M2CCLDJYBZ0R` ya existe).
2. *Configure domain*: dejar **solo** el subdominio `shotra` → rama `master`
   (desmarcar el dominio raíz y `www`, que ya son del landing).
3. Amplify crea el CNAME en Route 53 y el certificado SSL (tarda unos minutos
   en pasar a *Available*).
4. Verificar: `https://shotra.cyclonet.com.co/request/123` debe abrir el login
   (y, al entrar, la solicitud), no un 404.

CORS: nginx refleja el origen que llegue (`$http_origin`) en `/api/shotra/` y
`/api/auth/`, así que el dominio nuevo no requiere cambios. Lo que sí está
fijo es la lista de encabezados permitidos (`Content-Type`, `Authorization`,
`x-tenant-id`): si la web empieza a mandar otro encabezado, hay que agregarlo en
`deploy/nginx/cyclonet.conf` y en el servidor.

---

## 4.5 Actualizaciones OTA (EAS Update) — sin recompilar ni encolar

Para cambios de **JavaScript/TS/estilos/pantallas** (la mayoría del día a día),
NO se recompila ni se espera la cola de builds. Se publican por OTA en segundos:

```bash
# publicar a la rama de un canal (production / preview)
eas update --branch production --message "descripcion del cambio"
```

Las apps instaladas (builds hechos con `expo-updates` y el canal correspondiente)
descargan el update al abrirse.

**Cuándo SÍ hay que recompilar (build nuevo, con cola):**
- Agregar/quitar dependencias con código nativo.
- Cambiar permisos, ícono, splash, versión de SDK o `runtimeVersion`.
- Cambios en configuración nativa de `app.json`.

**Cuándo basta con `eas update` (sin build):**
- Cambios de UI, lógica, textos, colores, temas, nuevas pantallas, fixes JS.

> Los canales están mapeados en `eas.json`: `production`, `preview`, `development`.
> `runtimeVersion` usa política `appVersion`: un update solo aplica a builds cuya
> versión de la app coincide. Si subes `version` en `app.json`, necesitas un build nuevo.

## 5. Notas

- **Costo**: EAS Build tiene un tier gratuito con builds limitados por mes; el
  plan de producción de Expo (~$29/mes) da más builds concurrentes. No es costo
  de AWS.
- **Notificaciones push**: `expo-notifications` en un build EAS (no Expo Go)
  soporta push nativo. Para push real se configura un proyecto FCM (Android) /
  APNs (iOS); hoy la app usa polling in-app, que funciona sin esa configuración.
- **Login**: el frontend envía `applicationName: 'Shotra'` a Authoriza; el
  usuario debe tener un contrato activo de un plan de Shotra para obtener acceso.
