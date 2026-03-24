/**
 * Transaction Manager Factory
 */

import { TransactionManager } from './transaction-manager'
import type { TransactionManagerInstance } from './transaction-manager.types'

export function createTransactionManager(db: any): TransactionManagerInstance {
  return new TransactionManager(db)
}
