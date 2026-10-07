# RN1 — aplicación de cuentas en React Native

Implementa los flujos de R5 con Expo SDK 57 y Expo Router: inicio de sesión, registro, verificación por código, recuperación/restablecimiento de contraseña, cuenta, fotos y administración. Conserva los textos en español y los temas claro/oscuro. El backend de Node/Express sigue en `../backend`.

## Iniciar el backend

Desde `RN1/backend`:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Completa `.env` con tu base de datos y Mailtrap. La configuración de RN1 usa una base local por defecto; las credenciales de la base remota de R5 no se copiaron.

Para una base nueva, selecciona tu base e importa `database/schema.sql`. Para una base existente, conserva sus tablas y añade `profile_picture` e `is_admin` si faltan. `database/migrations/20260923_profile_and_admin.sql` es para MariaDB; en MySQL puedes usar `npm run migrate-profile`. Las relaciones de sesiones y tokens deben tener `ON DELETE CASCADE` para eliminar una cuenta con sus sesiones. No se ejecutan migraciones automáticamente al iniciar.

Los correos requieren `MAIL_API_KEY`, `SENDER` y un inbox de Mailtrap si usas su sandbox. `MAIL_SANDBOX=true` captura los correos en Mailtrap, sin entregarlos a una bandeja real. Usa `MAIL_SANDBOX=false` con un remitente verificado para entregarlos.

## Iniciar el frontend

Desde `RN1/frontend`:

```powershell
npm install
Copy-Item .env.example .env
npx expo start --go
```

En `.env`, configura la dirección del backend, incluyendo `/api`. Para probar web y teléfono a la vez, conserva `EXPO_PUBLIC_API_URL=http://localhost:3005/api` y configura `EXPO_PUBLIC_NATIVE_API_URL` con la IP LAN de tu PC. La variable nativa tiene prioridad solo en Android/iOS:

- Teléfono físico: `http://IP_LAN_DE_TU_PC:3005/api`; teléfono y PC en la misma red.
- Emulador Android: `http://10.0.2.2:3005/api`.
- Simulador iOS o web en la PC: `http://localhost:3005/api`.

`localhost` en un teléfono apunta al teléfono, no a tu PC. Sin variables explícitas, desarrollo intenta usar la dirección de Metro; producción exige una URL configurada. Para un backend publicado, usa HTTPS en `EXPO_PUBLIC_API_URL` y deja vacío `EXPO_PUBLIC_NATIVE_API_URL`, o configura ambos con sus direcciones publicadas. Después de cambiar `.env`, haz una recarga completa en Expo Go (agita el teléfono → Reload). El backend escucha en todas las interfaces; permite el puerto 3005 en el firewall para un teléfono físico. Si persiste un timeout, abre `http://IP_LAN_DE_TU_PC:3005/api/health` en Safari: debe devolver `{"status":"ok"}`.

`npm run web` abre la vista web. Esa vista usa cookies HttpOnly. Android/iOS guardan el token de sesión en SecureStore, nunca en AsyncStorage. AsyncStorage solo guarda la preferencia de tema.

## Enlaces de recuperación

Configura `PASSWORD_RESET_URL` en `backend/.env` según dónde pruebes:

- Desarrollo nativo/producción: `rn1://restablecer-contrasena`.
- Expo Go: `exp://IP_LAN_DE_TU_PC:8081/--/restablecer-contrasena`.
- Web: `http://localhost:8081/restablecer-contrasena`.

El backend añade `?token=…` al enlace. Los enlaces duran 15 minutos y un restablecimiento revoca todas las sesiones locales. Los códigos de verificación duran un minuto; tras reiniciar la app, solicita un código nuevo si no conservas su fecha de vencimiento.

## Google, GitHub y Apple con Auth0

El login local funciona sin Auth0. Para habilitar las alternativas sociales, crea una aplicación **Native** en tu tenant y configura estas variables públicas en `frontend/.env`:

```dotenv
EXPO_PUBLIC_AUTH0_DOMAIN=tu-tenant.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=ID_DE_TU_APLICACION_NATIVE
```

No uses el Client ID SPA de R5 ni un Client Secret en el frontend. Habilita las conexiones `google-oauth2`, `github` y `apple` para la aplicación Native. Para persistencia con renovación, habilita Refresh Token y su rotación.

Añade a **Allowed Callback URLs** y **Allowed Logout URLs**:

```text
rn1://tu-tenant.auth0.com/ios/com.elias.rn1/callback
rn1://tu-tenant.auth0.com/android/com.elias.rn1/callback
```

`app.config.js` añade el plugin Auth0 cuando ambas variables existen. No se crea ni modifica el tenant automáticamente. Los perfiles sociales se administran en el proveedor; conservan el comportamiento de R5 y no obtienen permisos de administrador del backend local.

El SDK Auth0 requiere una **development build**, no Expo Go. El soporte local funciona en Expo Go; los botones sociales solo aparecen en la build nativa configurada. La vista web de RN1 sirve para comprobar los flujos locales.

```powershell
npm run build:android
# macOS con Xcode:
npm run build:ios
# Después de instalar la build:
npx expo start --dev-client
```

`eas.json` incluye perfiles `development`, `preview` y `production` si prefieres generar la build en EAS. No se lanzó una build de pago ni se publicó la app.

## Administradores

Desde `backend`, crea una cuenta y promuévela:

```powershell
npm run create-admin -- nombre correo@ejemplo.com 'UnaContrasena123'
```

El administrador también verifica su correo. Una cuenta existente se promueve por SQL sin cambiar su contraseña. El panel permite buscar hasta 100 usuarios, editar nombre/foto y eliminar cuentas; el servidor impide eliminar la cuenta propia desde el panel.

## Verificación

```powershell
# frontend
npm run lint
npm run typecheck
npx expo export --platform all
# backend
npm test
```

Los tests usan servicios aislados: no envían correos ni cambian tu base real. Validan cookies/bearer tokens, campos públicos, verificación/roles, límites de fotos y revocación de sesiones. Exportar las tres plataformas confirma el empaquetado; una prueba en teléfono sigue siendo necesaria para teclado, fotos, enlaces y Auth0.

Durante esta implementación el servicio MySQL local respondió `ECONNREFUSED`. Las pruebas con usuarios reales necesitan la base disponible, su esquema y las credenciales de Mailtrap. Consulta `migration-progress.md` para el estado de los flujos.
