/**
 * Transaction Manager Tests
 */

import { createTransactionManager } from './create-transaction-manager'

describe('TransactionManager', () => {
  let mockDb: any
  let transactionManager: ReturnType<typeof createTransactionManager>

  beforeEach(() => {
    const execHistory: string[] = []
    mockDb = {
      exec: jest.fn((cmd: string) => {
        execHistory.push(cmd)
      }),
      _execHistory: execHistory
    }
    transactionManager = createTransactionManager(mockDb)
  })

  describe('execute', () => {
    it('should begin, execute operations, and commit on success', async () => {
      const operation = jest.fn(() => 'result')

      const result = await transactionManager.execute(operation)

      expect(result).toBe('result')
      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledWith('COMMIT')
      expect(operation).toHaveBeenCalled()
    })

    it('should rollback on exception', async () => {
      const error = new Error('Test error')
      const operation = jest.fn(() => {
        throw error
      })

      await expect(transactionManager.execute(operation)).rejects.toThrow(error)

      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK')
      expect(mockDb.exec).not.toHaveBeenCalledWith('COMMIT')
    })

    it('should handle async operations', async () => {
      const operation = jest.fn(async () => {
        await Promise.resolve()
        return 'async result'
      })

      const result = await transactionManager.execute(operation)

      expect(result).toBe('async result')
      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledWith('COMMIT')
    })

    it('should swallow rollback errors', async () => {
      mockDb.exec = jest.fn((cmd: string) => {
        if (cmd === 'ROLLBACK') {
          throw new Error('Rollback failed')
        }
      })

      const error = new Error('Operation error')
      const operation = jest.fn(() => {
        throw error
      })

      // Should throw the original error, not the rollback error
      await expect(transactionManager.execute(operation)).rejects.toThrow('Operation error')
    })
  })

  describe('nested transactions', () => {
    it('should not commit/rollback nested execute calls', async () => {
      const innerOp = jest.fn(() => 'inner')
      const outerOp = jest.fn(async () => {
        const innerResult = await transactionManager.execute(innerOp)
        return `outer-${innerResult}`
      })

      const result = await transactionManager.execute(outerOp)

      expect(result).toBe('outer-inner')
      // Should only BEGIN and COMMIT once (for outer transaction)
      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledWith('COMMIT')
      expect(mockDb.exec).toHaveBeenCalledTimes(2)
    })

    it('should rollback on inner failure', async () => {
      const error = new Error('Inner error')
      const innerOp = jest.fn(() => {
        throw error
      })
      const outerOp = jest.fn(async () => {
        await transactionManager.execute(innerOp)
      })

      await expect(transactionManager.execute(outerOp)).rejects.toThrow(error)

      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK')
      expect(mockDb.exec).not.toHaveBeenCalledWith('COMMIT')
    })
  })

  describe('manual transaction control', () => {
    it('should track transaction state', () => {
      expect(transactionManager.isInTransaction()).toBe(false)

      transactionManager.begin()
      expect(transactionManager.isInTransaction()).toBe(true)

      transactionManager.commit()
      expect(transactionManager.isInTransaction()).toBe(false)
    })

    it('should be idempotent for begin', () => {
      transactionManager.begin()
      transactionManager.begin()
      transactionManager.begin()

      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledTimes(1) // Only once
    })

    it('should support manual rollback', () => {
      transactionManager.begin()
      transactionManager.rollback()

      expect(mockDb.exec).toHaveBeenCalledWith('BEGIN')
      expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK')
      expect(transactionManager.isInTransaction()).toBe(false)
    })
  })

  describe('error resilience', () => {
    it('should handle multiple rollback calls safely', () => {
      transactionManager.begin()
      
      mockDb.exec = jest.fn((cmd: string) => {
        if (cmd === 'ROLLBACK') {
          throw new Error('Already rolled back')
        }
      })

      transactionManager.rollback()
      transactionManager.rollback() // Should not throw

      expect(transactionManager.isInTransaction()).toBe(false)
    })
  })
})
