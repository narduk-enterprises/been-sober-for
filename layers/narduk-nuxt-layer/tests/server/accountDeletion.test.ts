import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteCurrentUserAccount } from '../../server/utils/accountDeletion'

const { mockVerifyUserPassword, mockClearUserSession, mockLogInfo, mockLogWarn } = vi.hoisted(
  () => ({
    mockVerifyUserPassword: vi.fn(),
    mockClearUserSession: vi.fn(),
    mockLogInfo: vi.fn(),
    mockLogWarn: vi.fn(),
  }),
)

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_column, value) => ({ type: 'eq', value })),
}))

vi.mock('#layer/orm-tables', () => ({
  users: {
    id: 'id',
  },
}))

vi.mock('#layer/server/utils/password', () => ({
  verifyUserPassword: mockVerifyUserPassword,
}))

vi.stubGlobal('clearUserSession', mockClearUserSession)
vi.stubGlobal('useLogger', () => ({
  child: () => ({
    info: mockLogInfo,
    warn: mockLogWarn,
  }),
}))
vi.stubGlobal('createError', (opts: { statusCode: number; statusMessage?: string }) => {
  const err = new Error(opts.statusMessage || 'error') as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

type MockDb = ReturnType<typeof createMockDb>
let mockDb: MockDb

vi.stubGlobal('useDatabase', () => mockDb.db)

function createMockDb(options: {
  user?: { id: string; passwordHash?: string | null } | undefined
  deleteError?: unknown
}) {
  const get = vi.fn().mockResolvedValue(options.user)
  const selectWhere = { get }
  const selectChain = {
    from: vi.fn(() => selectChain),
    where: vi.fn(() => selectWhere),
  }

  const run =
    options.deleteError == null
      ? vi.fn().mockResolvedValue()
      : vi.fn().mockRejectedValue(options.deleteError)
  const deleteWhere = { run }
  const deleteChain = {
    where: vi.fn(() => deleteWhere),
  }

  return {
    db: {
      select: vi.fn(() => selectChain),
      delete: vi.fn(() => deleteChain),
    },
    get,
    run,
  }
}

describe('deleteCurrentUserAccount', () => {
  const event = { context: {} } as never
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    isAdmin: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      user: {
        id: 'user-1',
        passwordHash: 'stored-hash',
      },
    })
  })

  it('deletes the user and clears the session when the password matches', async () => {
    mockVerifyUserPassword.mockResolvedValue(true)

    await expect(
      deleteCurrentUserAccount(event, user, { currentPassword: 'password123' }),
    ).resolves.toBeUndefined()

    expect(mockVerifyUserPassword).toHaveBeenCalledWith('password123', 'stored-hash')
    expect(mockDb.run).toHaveBeenCalledTimes(1)
    expect(mockClearUserSession).toHaveBeenCalledWith(event)
    expect(mockLogInfo).toHaveBeenCalledWith('User deleted account', { userId: 'user-1' })
  })

  it('requires the current password for local-password accounts', async () => {
    await expect(deleteCurrentUserAccount(event, user, {})).rejects.toThrow(
      'Current password is required to delete this account.',
    )

    expect(mockDb.run).not.toHaveBeenCalled()
  })

  it('rejects invalid current passwords', async () => {
    mockVerifyUserPassword.mockResolvedValue(false)

    await expect(
      deleteCurrentUserAccount(event, user, { currentPassword: 'wrong-password' }),
    ).rejects.toThrow('Invalid current password.')

    expect(mockDb.run).not.toHaveBeenCalled()
    expect(mockLogWarn).toHaveBeenCalledWith(
      'Account deletion rejected — invalid current password',
      { userId: 'user-1' },
    )
  })

  it('returns actionable guidance when app-owned foreign keys block deletion', async () => {
    mockVerifyUserPassword.mockResolvedValue(true)
    mockDb = createMockDb({
      user: {
        id: 'user-1',
        passwordHash: 'stored-hash',
      },
      deleteError: new Error('FOREIGN KEY constraint failed'),
    })

    await expect(
      deleteCurrentUserAccount(event, user, { currentPassword: 'password123' }),
    ).rejects.toThrow(
      'Account deletion is blocked because app-owned records still reference this user.',
    )

    expect(mockClearUserSession).not.toHaveBeenCalled()
  })

  it('calls the beforeDelete hook before deleting the local DB row', async () => {
    mockVerifyUserPassword.mockResolvedValue(true)

    const callOrder: string[] = []
    mockDb.run.mockImplementation(async () => {
      callOrder.push('db.delete')
    })

    const beforeDelete = vi.fn(async () => {
      callOrder.push('beforeDelete')
    })

    await deleteCurrentUserAccount(event, user, { currentPassword: 'password123' }, { beforeDelete })

    expect(beforeDelete).toHaveBeenCalledWith(event, user.id)
    expect(callOrder).toEqual(['beforeDelete', 'db.delete'])
  })

  it('aborts local deletion when the beforeDelete hook throws', async () => {
    mockVerifyUserPassword.mockResolvedValue(true)

    const beforeDelete = vi.fn(async () => {
      throw new Error('Upstream deletion failed')
    })

    await expect(
      deleteCurrentUserAccount(event, user, { currentPassword: 'password123' }, { beforeDelete }),
    ).rejects.toThrow('Upstream deletion failed')

    expect(mockDb.run).not.toHaveBeenCalled()
    expect(mockClearUserSession).not.toHaveBeenCalled()
  })
})
