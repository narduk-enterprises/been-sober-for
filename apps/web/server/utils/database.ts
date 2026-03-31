import * as d1Schema from '#server/database/schema'
import * as pgSchema from '#server/database/pg-schema'
import { createAppDatabase } from '#layer/server/utils/database'

export const useAppDatabase = createAppDatabase({
  d1: d1Schema,
  pg: pgSchema,
})
