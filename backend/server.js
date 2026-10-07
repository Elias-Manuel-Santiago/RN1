import { createApp } from './app.js';
import * as consultas from './modules/consultas.js';
import * as sesiones from './modules/sesiones.js';
import * as correo from './modules/correo.js';
import * as verificacion from './modules/verificacionEmail.js';
import * as recuperacion from './modules/recuperacionPassword.js';

const app = createApp({ ...consultas, ...sesiones, ...correo, ...verificacion, ...recuperacion });
const port = Number(process.env.PORT ?? 3005);

app.use((req, res, next) => {
  // Permite el origen del cliente (cambia '*' por tu dominio si quieres restringirlo)
  res.header("Access-Control-Allow-Origin", "*"); 
  
  // Define qué métodos HTTP están permitidos
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  // Define qué cabeceras personalizadas puede enviar el cliente
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  // Manejar la petición pre-flight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.listen(port, '0.0.0.0', () => console.log(`API escuchando en el puerto ${port}`));
