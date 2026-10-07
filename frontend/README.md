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

### Backend alojado y CORS en web

Si `EXPO_PUBLIC_API_URL` apunta a un backend alojado, configura `FRONTEND_URL` en las variables de entorno **del servicio backend** (en Render: Environment). Debe incluir el origen exacto desde el que abres la app: protocolo, host y puerto, sin ruta ni barra final. Para Expo web local, usa `http://localhost:8081`. Para permitir también la web publicada, usa una lista separada por comas, por ejemplo `https://app.example.com,http://localhost:8081`. Si Expo abre otro puerto o usas una IP LAN, incluye ese origen exacto.

Guarda la variable y reinicia o vuelve a desplegar el backend. Cambiar `backend/.env` en tu PC solo afecta al backend local. La API devuelve `403` con `Origen no permitido` cuando el origen no está permitido. CORS se configura en `backend/app.js`, antes de las rutas; las peticiones con cookies requieren un origen explícito y `Access-Control-Allow-Credentials: true`.

## Enlaces de recuperación

Configura `PASSWORD_RESET_URL` en `backend/.env` según dónde pruebes:

- Desarrollo nativo/producción: `rn1://restablecer-contrasena`.
- Expo Go: `exp://IP_LAN_DE_TU_PC:8081/--/restablecer-contrasena`.
- Web: `http://localhost:8081/restablecer-contrasena`.

El backend añade `?token=…` al enlace. Los enlaces duran 15 minutos y un restablecimiento revoca todas las sesiones locales. Los códigos de verificación duran un minuto; tras reiniciar la app, solicita un código nuevo si no conservas su fecha de vencimiento.

El cambio desde Mi cuenta conserva la sesión actual y revoca las demás. Ambos flujos guardan la contraseña y revocan las sesiones en una transacción; el enlace de recuperación solo queda consumido si todo se confirma. El servidor comprueba que se actualizó exactamente una cuenta y la app exige su confirmación HTTP 204 antes de mostrar éxito. La contraseña nueva admite hasta 72 bytes UTF-8 para evitar que bcrypt ignore un sufijo; acentos y emojis ocupan más de un byte.

Para verificar en un teléfono, cambia la contraseña, cierra sesión y escribe manualmente ambas contraseñas: la anterior debe fallar y la nueva debe permitir el acceso. Repite con un enlace de recuperación y comprueba que no se pueda reutilizar. Estas correcciones requieren desplegar el backend actualizado en el servidor configurado en la app y recargar o actualizar el frontend.

## Google, GitHub y Apple con Auth0

El login local funciona sin Auth0. Para habilitar las alternativas sociales en web y móvil, configura una aplicación **Native** en tu tenant con **Token Endpoint Authentication Method: None** (el SDK usa Authorization Code con PKCE), y estas variables públicas en `frontend/.env`:

```dotenv
EXPO_PUBLIC_AUTH0_DOMAIN=tu-tenant.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=ID_DE_TU_APLICACION_NATIVE
# Opcional: Client ID de una aplicación Single Page Application para web.
# Si queda vacío, web usa EXPO_PUBLIC_AUTH0_CLIENT_ID.
EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID=
```

El dominio debe ser solo el hostname, sin `https://` ni `/api/v2/`. No incluyas un Client Secret en el frontend. Si usas aplicaciones separadas, deja la Native en `EXPO_PUBLIC_AUTH0_CLIENT_ID` y la SPA en `EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID`. Habilita las conexiones `google-oauth2`, `github` y `apple` en las aplicaciones utilizadas. Para renovación nativa, habilita el grant Refresh Token; se recomienda activar su rotación y un tiempo de vida máximo.

Añade a **Allowed Callback URLs** y **Allowed Logout URLs**:

```text
rn1://tu-tenant.auth0.com/ios/com.elias.rn1/callback
rn1://tu-tenant.auth0.com/android/com.elias.rn1/callback
http://localhost:8081
```

Para web, añade también `http://localhost:8081` a **Allowed Web Origins** y **Allowed Origins (CORS)**. Añade el origen HTTPS exacto de la web publicada a las cuatro listas cuando la publiques. El login y el logout web regresan al origen desde el que se abrió la app. Si usas una SPA separada, configura los orígenes web en esa aplicación y los callbacks `rn1://…` en la Native.

`app.config.js` añade una única entrada del plugin Auth0 cuando existen el dominio y el Client ID nativo. No lo anides dentro de otro plugin en `app.json`. Los perfiles sociales se administran en el proveedor; conservan el comportamiento de R5 y no obtienen permisos de administrador del backend local.

Web utiliza el soporte web de `react-native-auth0` v5, con redirección y procesamiento automático del callback. El SDK administra su caché web en `localStorage` para conservar la sesión vigente al recargar, incluso si el navegador bloquea cookies de terceros; no se almacenan contraseñas. Al expirar, vuelve a iniciar sesión. Las credenciales nativas siguen en el almacenamiento seguro del SDK. El SDK se carga después de la hidratación para mantener compatible la exportación estática. Los errores del callback aparecen en la pantalla de login.

En Android/iOS el SDK requiere una **development build**, no Expo Go, como indica la [guía oficial de Auth0 para Expo](https://auth0.com/docs/quickstart/native/react-native-expo). Los botones sociales funcionan en web y en las builds nativas configuradas. En Expo Go aparecen deshabilitados con una explicación; el login local sigue funcionando. Después de añadir o cambiar el plugin, reconstruye e instala la app nativa. Una build de desarrollo permite seguir usando Metro y recarga rápida sin publicar en las tiendas.

```powershell
npm run build:android
# macOS con Xcode:
npm run build:ios
# Después de instalar la build:
npm run start:dev-client
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
npm run test:password
npx expo export --platform all
# backend
npm test
```

Los tests usan servicios aislados: no envían correos ni cambian tu base real. Validan cookies/bearer tokens, campos públicos, verificación/roles, límites de fotos y revocación de sesiones. Exportar las tres plataformas confirma el empaquetado; una prueba en teléfono sigue siendo necesaria para teclado, fotos, enlaces y Auth0.

Las regresiones de contraseña también prueban los endpoints móviles y el login con bcrypt real y almacenamiento simulado: contraseña antigua rechazada/nueva aceptada, rollback ante fallos de escritura o confirmación, reintento del enlace, sesiones revocadas, errores de red y respuestas sin confirmación. No sustituyen la prueba en teléfono contra la base del servidor desplegado.

Durante esta implementación el servicio MySQL local respondió `ECONNREFUSED`. Las pruebas con usuarios reales necesitan la base disponible, su esquema y las credenciales de Mailtrap. Consulta `migration-progress.md` para el estado de los flujos.
