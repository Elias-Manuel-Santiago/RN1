# R5 → RN1

Source: R5/backend and R5/frontendReactRouter/src. Backup folders were not used as implementation sources.
All product screens are implemented with native React Native / Expo UI controls.

| R5 route | RN1 route | Status |
| --- | --- | --- |
| / | / | Login and session restoration implemented |
| /registro | /registro | Signup, matching passwords, validation implemented |
| /recuperar-contrasena | /recuperar-contrasena | Email recovery request implemented |
| /restablecer-contrasena?token=… | Same route, rn1:// deep link | Password reset implemented |
| /verificar-email | /verificar-email | Six-digit code, expiration, resend implemented |
| /cuenta | /cuenta | Username, photo, current-password check, logout, deletion implemented |
| /admin | /admin | Protected search, edits, photo changes, deletion implemented |
| /cuenta-auth0 | /cuenta-auth0 | Web and native Google/GitHub/Apple integration implemented; Native tenant and development callbacks configured |

The Express backend remains server-side. Mobile sessions use the existing opaque session tokens stored in SecureStore; web preview uses HttpOnly cookies. Roles and email verification are checked on the server as well as in Expo Router.

Validation: backend API regression tests, Expo lint, TypeScript, and web/Android/iOS bundle export.
Auth0 development validation (2026-10-07): Google web login completed with a real account, remained authenticated after reloading, and returned to login after logout; GitHub and Apple reach their provider login screens. Auth0 RN1 is configured as Native with localhost web origins and rn1 callback/logout URLs for Android/iOS. Native plugin introspection and web/Android/iOS bundle export passed. A native Auth0 device test requires a development build; Expo Go does not include the SDK. The Android build is deferred by request.
The local MySQL service was unreachable during validation. No live database was modified.
