import connection from './db.js';

/** Todas las escrituras de una operación usan la misma conexión del pool. */
export async function inTransaction(work) {
  const transaction = await connection.getConnection();
  try {
    await transaction.beginTransaction();
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    transaction.release();
  }
}
