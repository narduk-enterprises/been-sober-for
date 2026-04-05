type QueryWithGet<T> = { get: () => Promise<T | null | undefined> }
type QueryWithAll<T> = { all: () => Promise<T[]> }
type QueryWithRun<T> = { run: () => Promise<T> }
type QueryWithExecute<T> = { execute: () => Promise<T> }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function executeDatabaseQuery<T>(query: unknown): Promise<T> {
  if (isObject(query)) {
    if ('run' in query && typeof query.run === 'function') {
      return await (query as QueryWithRun<T>).run()
    }

    if ('execute' in query && typeof query.execute === 'function') {
      return await (query as QueryWithExecute<T>).execute()
    }
  }

  return (await query) as T
}

export async function getDatabaseRow<T>(query: unknown): Promise<T | undefined> {
  if (isObject(query)) {
    if ('get' in query && typeof query.get === 'function') {
      return ((await (query as QueryWithGet<T>).get()) ?? undefined) as T | undefined
    }

    if ('all' in query && typeof query.all === 'function') {
      const rows = await (query as QueryWithAll<T>).all()
      return rows[0] ?? undefined
    }
  }

  const result = await executeDatabaseQuery<T | T[]>(query)
  return Array.isArray(result) ? (result[0] ?? undefined) : (result ?? undefined)
}
