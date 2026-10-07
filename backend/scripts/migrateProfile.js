import connection from '../modules/db.js';

// Explicit, additive migration compatible with both MySQL and MariaDB.
try {
  for (const [name, definition] of [
    ['profile_picture', 'profile_picture MEDIUMTEXT NULL'],
    ['is_admin', 'is_admin TINYINT(1) NOT NULL DEFAULT 0'],
  ]) {
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = ?",
      [name],
    );
    if (!columns.length) {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN ${definition}`);
      console.log(`Added ${name}`);
    }
  }
} finally {
  await connection.end();
}
