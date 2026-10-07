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
| /cuenta-auth0 | /cuenta-auth0 | Native Google/GitHub/Apple integration implemented; Native tenant settings required |

The Express backend remains server-side. Mobile sessions use the existing opaque session tokens stored in SecureStore; web preview uses HttpOnly cookies. Roles and email verification are checked on the server as well as in Expo Router.

Validation: backend API regression tests, Expo lint, TypeScript, and web/Android/iOS bundle export.
Device parity and native Auth0 login still require a device/development build and Native application configuration.
The local MySQL service was unreachable during validation. No live database was modified.
