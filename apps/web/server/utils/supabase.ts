import type { H3Event } from 'h3'
import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js'
import { getCurrentSupabaseContext } from '#server/utils/app-auth'

export type AppBackendPreset = 'default' | 'managed-supabase'

export interface ManagedSupabaseConfig {
  preset: AppBackendPreset
  enabled: boolean
  url: string
  publishableKey: string
  serviceRoleKey: string
  authBackend: 'local' | 'supabase'
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

function readRuntimeConfig(event?: H3Event) {
  return event ? useRuntimeConfig(event) : useRuntimeConfig()
}

function normalizePreset(value: string | undefined): AppBackendPreset {
  return value === 'managed-supabase' ? 'managed-supabase' : 'default'
}

function createManagedClient<Database extends ManagedSupabaseDatabaseLike>(
  url: string,
  key: string,
  options: SupabaseClientOptions<'public'> = {},
): ManagedSupabaseClient<Database> {
  const auth = options.auth ?? {}
  const global = options.global ?? {}
  const headers =
    global.headers && typeof global.headers === 'object'
      ? (global.headers as Record<string, string>)
      : {}

  const client = createClient(url, key, {
    ...options,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      ...auth,
    },
    global: {
      ...global,
      headers: {
        apikey: key,
        ...headers,
      },
    },
  } as SupabaseClientOptions<'public'>)

  return client as unknown as ManagedSupabaseClient<Database>
}

export function getManagedSupabaseConfig(event?: H3Event): ManagedSupabaseConfig {
  const config = readRuntimeConfig(event)

  return {
    preset: normalizePreset(config.public.appBackendPreset),
    enabled:
      normalizePreset(config.public.appBackendPreset) === 'managed-supabase' &&
      Boolean(config.supabaseUrl && config.supabasePublishableKey),
    url: config.supabaseUrl.trim(),
    publishableKey: config.supabasePublishableKey,
    serviceRoleKey: config.supabaseServiceRoleKey,
    authBackend: config.public.authBackend === 'supabase' ? 'supabase' : 'local',
  }
}

export function isManagedSupabasePresetEnabled(event?: H3Event) {
  return getManagedSupabaseConfig(event).enabled
}

function requireManagedSupabaseConfig(
  event: H3Event,
  options: {
    requireServiceRole?: boolean
  } = {},
) {
  const config = getManagedSupabaseConfig(event)

  if (config.preset !== 'managed-supabase') {
    throw createError({
      statusCode: 501,
      statusMessage: 'Managed Supabase helpers require APP_BACKEND_PRESET=managed-supabase.',
    })
  }

  if (!config.url || !config.publishableKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Managed Supabase is enabled but SUPABASE_URL and a publishable/anon key are not configured.',
    })
  }

  if (options.requireServiceRole && !config.serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Managed Supabase service-role access requires SUPABASE_SERVICE_ROLE_KEY to be configured.',
    })
  }

  return config
}

export function useManagedSupabasePublicClient<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>(event: H3Event) {
  if (event.context._managedSupabasePublicClient) {
    return event.context._managedSupabasePublicClient as ManagedSupabaseClient<Database>
  }

  const config = requireManagedSupabaseConfig(event)
  const client = createManagedClient<Database>(config.url, config.publishableKey)
  event.context._managedSupabasePublicClient = client
  return client
}

export async function useManagedSupabaseUserClient<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>(event: H3Event) {
  if (event.context._managedSupabaseUserClient) {
    return event.context._managedSupabaseUserClient as ManagedSupabaseClient<Database>
  }

  const config = requireManagedSupabaseConfig(event)
  const context = await getCurrentSupabaseContext(event)
  const client = createManagedClient<Database>(config.url, config.publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${context.session.access_token}`,
      },
    },
  })

  event.context._managedSupabaseUserClient = client
  return client
}

export function useManagedSupabaseServiceRoleClient<
  Database extends ManagedSupabaseDatabaseLike = DefaultManagedSupabaseDatabase,
>(event: H3Event) {
  if (event.context._managedSupabaseServiceRoleClient) {
    return event.context._managedSupabaseServiceRoleClient as ManagedSupabaseClient<Database>
  }

  const config = requireManagedSupabaseConfig(event, { requireServiceRole: true })
  const client = createManagedClient<Database>(config.url, config.serviceRoleKey, {
    global: {
      headers: {
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    },
  })

  event.context._managedSupabaseServiceRoleClient = client
  return client
}
