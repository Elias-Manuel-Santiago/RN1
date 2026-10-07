import mysql from 'mysql2/promise';

// Database credentials stay server-side. Schema changes are explicit migrations.
const connection = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'usuarios',
  connectionLimit: 5,
  timezone: 'Z',
  charset: 'utf8mb4',
});
export default connection;
