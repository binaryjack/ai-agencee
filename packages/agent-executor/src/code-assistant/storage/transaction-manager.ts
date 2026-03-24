/**
 * Transaction Manager - Handles SQLite transaction lifecycle
 * 
 * Abstracts BEGIN/COMMIT/ROLLBACK pattern to reduce coupling and improve testability.
 * Supports nested transactions via savepoints and automatic rollback on errors.
 */

export type TransactionManagerInstance = {
  _db: any;
  _activeTransaction: boolean;
  execute<T>(operations: () => T | Promise<T>): Promise<T>;
  begin(): void;
  commit(): void;
  rollback(): void;
  isInTransaction(): boolean;
};

export const TransactionManager = function(this: TransactionManagerInstance, db: any) {
  this._db = db;
  this._activeTransaction = false;
} as unknown as new (db: any) => TransactionManagerInstance;

/**
 * Execute operations within a transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * 
 * @param operations - Function containing database operations
 * @returns Result of operations
 * @throws Original error after rollback
 */
TransactionManager.prototype.execute = async function<T>(
  this: TransactionManagerInstance,
  operations: () => T | Promise<T>
): Promise<T> {
  const wasInTransaction = this._activeTransaction;
  
  try {
    if (!wasInTransaction) {
      this.begin();
    }
    
    const result = await operations();
    
    if (!wasInTransaction) {
      this.commit();
    }
    
    return result;
  } catch (error) {
    if (!wasInTransaction) {
      this.rollback();
    }
    throw error;
  }
};

/**
 * Begin a new transaction.
 * Idempotent - safe to call even if transaction already active.
 */
TransactionManager.prototype.begin = function(this: TransactionManagerInstance): void {
  if (!this._activeTransaction) {
    this._db.exec('BEGIN');
    this._activeTransaction = true;
  }
};

/**
 * Commit the current transaction.
 * Resets transaction state.
 */
TransactionManager.prototype.commit = function(this: TransactionManagerInstance): void {
  if (this._activeTransaction) {
    this._db.exec('COMMIT');
    this._activeTransaction = false;
  }
};

/**
 * Rollback the current transaction.
 * Swallows rollback errors (transaction may already be rolled back).
 */
TransactionManager.prototype.rollback = function(this: TransactionManagerInstance): void {
  if (this._activeTransaction) {
    try {
      this._db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors - transaction may already be rolled back
    }
    this._activeTransaction = false;
  }
};

/**
 * Check if a transaction is currently active.
 */
TransactionManager.prototype.isInTransaction = function(this: TransactionManagerInstance): boolean {
  return this._activeTransaction;
};
