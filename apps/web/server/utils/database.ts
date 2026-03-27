import { createAppDatabase } from '#layer/server/utils/database'
import * as schema from '#server/database/schema'

export const useAppDatabase = createAppDatabase(schema)
