// modules/consultas.js
import connection from "./db.js";
import bcrypt from 'bcrypt';

export async function obtenerPersonas() {
  const [filas] = await connection.query("SELECT * FROM usuarios");
  return filas;
}

export async function obtenerPersonaPorId(id) {
  const [filas] = await connection.query("SELECT * FROM usuarios WHERE id = ?", [id]);
  return filas[0];
}

export async function obtenerPersonaPorEmail(email) {
  const [filas] = await connection.query("SELECT * FROM usuarios WHERE email= ?", [email]);
  return filas[0];
}

export async function obtenerPersonaPorUsername(username) {
  const [filas] = await connection.query("SELECT * FROM usuarios WHERE username = ?", [username]);
  return filas[0];
}


export async function login(identifier, password) {
  const [filas] = await connection.query(
    "SELECT id, username, email, email_verified_at, password_hash FROM usuarios WHERE username = ? OR email = ?",
    [identifier, identifier]
  );
  if(filas.length === 0){
    return { success: false, message: "Usuario o contraseña incorrectos"};
  }

  const usuario = filas[0];
  const passwordValida = await bcrypt.compare(password, usuario.password_hash);

  if(!passwordValida){
    return { success: false, message: "Usuario o contraseña incorrectos"};
  }
  const { password_hash, ...usuarioPublico } = usuario;
  return { success: true, message: "Login exitoso", usuario: usuarioPublico };
}




export async function crearPersona(datos) {
  const { username, email, password} = datos;
  const checkEmail = await obtenerPersonaPorEmail(email);
  const checkUsername = await obtenerPersonaPorUsername(username);
  if(checkEmail){
    if(checkUsername){
      return { success: false, message: "Usuario y email ya en uso"}
    }
    return { success: false, message: "Email ya en uso"}
  }
  if(checkUsername){
    return { success: false, message: "Username ya en uso"}
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [resultado] = await connection.query(
    `INSERT INTO usuarios (username, email, password_hash)
     VALUES (?, ?, ?)`,
    [username, email, passwordHash]
  );
  return resultado.insertId;
}

export async function actualizarUsername(id, datos) {
  const { username } = datos;
  const [resultado] = await connection.query(
    `UPDATE usuarios
     SET username = ?
     WHERE id = ?`,
    [username, id]
  );
  return resultado.affectedRows;
}

export async function actualizarPassword(id, datos) {
  const { password } = datos;
  const passwordHash = await bcrypt.hash(password, 10);
  const [resultado] = await connection.query(
    `UPDATE usuarios
     SET password_hash = ?
     WHERE id = ?`,
    [passwordHash, id]
  );
  return resultado.affectedRows;
}

export async function eliminarPersona(id) {
  const [resultado] = await connection.query("DELETE FROM usuarios WHERE id = ?", [id]);
  return resultado.affectedRows;
}
