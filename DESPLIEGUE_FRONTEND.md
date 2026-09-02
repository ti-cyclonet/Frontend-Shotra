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

## 4. Versión web (opcional — Amplify)

Si además quieres una versión web:

```bash
cd Shotra/Frontend-Shotra
# usa las variables de .env.production
npx expo export --platform web
```

Sube el contenido de `dist/` a una app de Amplify con dominio
`shotra.cyclonet.com.co` (ya está en el allowlist de CORS de Nginx del backend).

Build spec de Amplify (si conectas el repo):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npx expo export --platform web
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

Configura en Amplify las variables de entorno:
- `EXPO_PUBLIC_API_URL=https://api.cyclonet.com.co/api/shotra`
- `EXPO_PUBLIC_AUTHORIZA_URL=https://api.cyclonet.com.co/api/auth`

---

## 5. Notas

- **Costo**: EAS Build tiene un tier gratuito con builds limitados por mes; el
  plan de producción de Expo (~$29/mes) da más builds concurrentes. No es costo
  de AWS.
- **Notificaciones push**: `expo-notifications` en un build EAS (no Expo Go)
  soporta push nativo. Para push real se configura un proyecto FCM (Android) /
  APNs (iOS); hoy la app usa polling in-app, que funciona sin esa configuración.
- **Login**: el frontend envía `applicationName: 'Shotra'` a Authoriza; el
  usuario debe tener un contrato activo de un plan de Shotra para obtener acceso.
