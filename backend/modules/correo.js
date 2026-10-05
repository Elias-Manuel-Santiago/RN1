import { MailtrapClient } from "mailtrap";


const sender = {
  email: process.env.SENDER,
  name: "Mailtrap Test",
};
const client = new MailtrapClient({
  token: process.env.MAIL_API_KEY,
  sandbox: true,
  testInboxId: 4903156,
});

/** Envía el código de verificación de email mediante Mailtrap. */
export async function enviarCodigoVerificacion(datos) {

  const recipients = [
    {
      email: datos.email,
    }
  ];

  await client.send({
    from: sender,
    to: recipients,
    subject: "Verificación",
    text: datos.username + "\nTu código es: " + datos.codigo,
    category: "Integration Test",
  });
}

/** Envía el enlace único para elegir una contraseña nueva. */
export async function enviarEnlaceRecuperacion(datos) {
  await client.send({
    from: sender,
    to: [{ email: datos.email }],
    subject: "Restablece tu contraseña",
    text: `${datos.username}\nAbre este enlace para crear una contraseña nueva:\n${datos.enlace}\n\nEl enlace expira en 15 minutos.`,
    category: "Integration Test",
  });
}
