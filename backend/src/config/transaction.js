export function createTransactionManager(pool) {
  if (!pool) throw new TypeError('Transaction manager requires a database pool');

  return {
    async run(work) {
      if (typeof work !== 'function') throw new TypeError('Transaction work must be a function');
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
      } catch (error) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          error.rollbackError = rollbackError;
        }
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}
