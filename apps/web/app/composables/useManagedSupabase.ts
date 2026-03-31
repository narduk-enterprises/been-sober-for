import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type AppBackendPreset = 'default' | 'managed-supabase'

export interface ManagedSupabaseState {
  preset: AppBackendPreset
  enabled: boolean
  url: string
  publishableKey: string
}

type SupabaseRelationship = {
  foreignKeyName: string
  columns: string[]
  referencedRelation: string
  referencedColumns: string[]
  isOneToOne?: boolean
}

type SupabaseTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: SupabaseRelationship[]
}

type SupabaseView = {
  Row: Record<string, unknown>
  Relationships: SupabaseRelationship[]
  Insert?: Record<string, unknown>
  Update?: Record<string, unknown>
}

type SupabaseFunction = {
  Args: Record<string, unknown> | never
  Returns: unknown
}

type ManagedSupabaseDatabaseLike = {
  public: {
    Tables: Record<string, SupabaseTable>
    Views: Record<string, SupabaseView>
    Functions: Record<string, SupabaseFunction>
  }
}

type DefaultManagedSupabaseDatabase = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

type ManagedSupabaseClient<Database extends ManagedSupabaseDatabaseLike> = SupabaseClient<Database>

function resolveManagedSupabaseState(): ManagedSupabaseState {
  const config = useRuntimeConfig()
  const preset =
    config.public.appBackendPreset === 'managed-supabase' ? 'managed-supabase' : 'default'

  return {
    preset,
    enabled:
      preset === 'managed-supabase' &&
      Boolean(config.public.supabaseUrl && config.public.supabasePublishableKey),
    url: config.public.supabaseUrl.trim(),
    publishableKey: config.public.supabasePublishableKey,
  }
}

function createManagedSupabaseBrowserClient<Database extends ManagedSupabaseDatabaseLike>(
  state: ManagedSupabaseState,
): ManagedSupabaseClient<Database> {
  const client = createClient(state.url, state.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey: state.publishableKey,
      },
    },
  } as const)

  return client as unknown as ManagedSupabaseClient<Database>
}

function requireManagedSupabaseState(state: ManagedSupabaseState) {
  if (!state.enabled) {
    throw new Error(
      'Managed Supabase client access requires APP_BACKEND_PRESET=managed-supabase and public Supabase credentials.',
    )
  }
}

type ManagedSupabaseClientHost = ReturnType<typeof useNuxtApp> & {
  _managedSupabaseClient?: ManagedSupabaseClient<DefaultManagedSupabaseDatabase>
}

export function useManagedSupabaseConfig() {
  return resolveManagedSupabaseState()
}

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

export function useManagedSupabaseRpc<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>() {
  const client = useManagedSupabaseClient<Database>()
  return client.rpc.bind(client)
}

export function useManagedSupabaseStorage<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>() {
  return useManagedSupabaseClient<Database>().storage
}

export function useManagedSupabase<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>() {
  const state = resolveManagedSupabaseState()

  return {
    ...state,
    client: state.enabled ? useManagedSupabaseClient<Database>() : null,
    rpc: state.enabled ? useManagedSupabaseRpc<Database>() : null,
    storage: state.enabled ? useManagedSupabaseStorage<Database>() : null,
  }
}
