import {
  createManagedSupabaseBrowserClient,
  requireManagedSupabaseState,
  resolveManagedSupabaseState,
  type DefaultManagedSupabaseDatabase,
  type ManagedSupabaseClient,
  type ManagedSupabaseClientHost,
  type ManagedSupabaseDatabaseLike,
} from '../utils/managedSupabase'

export function useManagedSupabaseClient<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>() {
  const state = resolveManagedSupabaseState()
  requireManagedSupabaseState(state)

  const nuxtApp = useNuxtApp() as ManagedSupabaseClientHost
  if (!nuxtApp._managedSupabaseClient) {
    nuxtApp._managedSupabaseClient = createManagedSupabaseBrowserClient<Database>(
      state,
    ) as unknown as ManagedSupabaseClient<DefaultManagedSupabaseDatabase>
  }

  return nuxtApp._managedSupabaseClient as unknown as ManagedSupabaseClient<Database>
}
