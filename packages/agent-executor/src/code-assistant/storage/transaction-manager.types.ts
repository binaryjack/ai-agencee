/**
 * Transaction Manager Types
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
