import * as d1Schema from '#server/database/schema'
import * as pgSchema from '#server/database/pg-schema'
import { createAppDatabase } from '#layer/server/utils/database'

/** Cloudflare D1 maximum bound parameters per query. */
export const D1_MAX_BOUND_PARAMETERS_PER_QUERY = 100

export const useAppDatabase = createAppDatabase({
  d1: d1Schema,
  pg: pgSchema,
})
