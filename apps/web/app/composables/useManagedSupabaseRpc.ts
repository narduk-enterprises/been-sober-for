import type {
  DefaultManagedSupabaseDatabase,
  ManagedSupabaseDatabaseLike,
} from '../utils/managedSupabase'
import { useManagedSupabaseClient } from './useManagedSupabaseClient'

export function useManagedSupabaseRpc<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>() {
  const client = useManagedSupabaseClient<Database>()
  return client.rpc.bind(client)
}
