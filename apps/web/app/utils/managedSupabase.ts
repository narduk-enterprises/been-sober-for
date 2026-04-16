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

export type ManagedSupabaseDatabaseLike = {
  public: {
    Tables: Record<string, SupabaseTable>
    Views: Record<string, SupabaseView>
    Functions: Record<string, SupabaseFunction>
  }
}

export type DefaultManagedSupabaseDatabase = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export type ManagedSupabaseClient<Database extends ManagedSupabaseDatabaseLike> =
  SupabaseClient<Database>

export type ManagedSupabaseClientHost = ReturnType<typeof useNuxtApp> & {
  _managedSupabaseClient?: ManagedSupabaseClient<DefaultManagedSupabaseDatabase>
}

export function resolveManagedSupabaseState(): ManagedSupabaseState {
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

export function createManagedSupabaseBrowserClient<Database extends ManagedSupabaseDatabaseLike>(
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

export function requireManagedSupabaseState(state: ManagedSupabaseState) {
  if (!state.enabled) {
    throw new Error(
      'Managed Supabase client access requires APP_BACKEND_PRESET=managed-supabase and public Supabase credentials.',
    )
  }
}
