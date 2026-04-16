import type {
  DefaultManagedSupabaseDatabase,
  ManagedSupabaseDatabaseLike,
} from '../utils/managedSupabase'
import { useManagedSupabaseClient } from './useManagedSupabaseClient'

export function useManagedSupabaseStorage<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>() {
  return useManagedSupabaseClient<Database>().storage
}
