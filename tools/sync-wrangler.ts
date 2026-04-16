import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { patchJsonFile } from './sync-files'

/**
 * `apps/web/wrangler.json` is not copied verbatim (would wipe D1 ids, routes,
 * domains). When the template expects extra runtime bindings, merge them
 * without clobbering app-specific IDs and routes.
 */
export function mergeWebWranglerKvBinding(
  appDir: string,
  templateDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const templatePath = join(templateDir, 'apps/web/wrangler.json')
  const appPath = join(appDir, 'apps/web/wrangler.json')
  if (!existsSync(templatePath) || !existsSync(appPath)) return false

  const templateWrangler = JSON.parse(readFileSync(templatePath, 'utf-8')) as {
    kv_namespaces?: Array<{ binding?: string; id?: string; preview_id?: string }>
    r2_buckets?: Array<{ binding?: string; bucket_name?: string; preview_bucket_name?: string }>
    tail_consumers?: Array<{ service?: string; environment?: string }>
  }
  const templateKv = templateWrangler.kv_namespaces?.find((n) => n?.binding === 'KV')
  const templateBucket = templateWrangler.r2_buckets?.find((bucket) => bucket?.binding === 'BUCKET')
  const templateRuntimeLogsConsumer = templateWrangler.tail_consumers?.find(
    (consumer) => consumer?.service === 'platform-runtime-logs',
  )
  if (!templateKv && !templateBucket && !templateRuntimeLogsConsumer) return false

  const changed = patchJsonFile<Record<string, unknown>>(
    appPath,
    (w) => {
      let didChange = false

      if (templateKv) {
        const list = (w.kv_namespaces as Array<{ binding?: string }> | undefined) ?? []
        if (!list.some((n) => n?.binding === 'KV')) {
          w.kv_namespaces = [...list, { binding: 'KV' } as Record<string, unknown>]
          didChange = true
        }
      }

      if (templateBucket) {
        const buckets = (w.r2_buckets as Array<{ binding?: string }> | undefined) ?? []
        if (!buckets.some((bucket) => bucket?.binding === 'BUCKET')) {
          w.r2_buckets = [
            ...buckets,
            JSON.parse(JSON.stringify(templateBucket)) as Record<string, unknown>,
          ]
          didChange = true
        }
      }

      if (templateRuntimeLogsConsumer) {
        const consumers =
          (w.tail_consumers as Array<{ service?: string; environment?: string }> | undefined) ?? []
        if (!consumers.some((consumer) => consumer?.service === 'platform-runtime-logs')) {
          w.tail_consumers = [
            ...consumers,
            JSON.parse(JSON.stringify(templateRuntimeLogsConsumer)) as Record<string, unknown>,
          ]
          didChange = true
        }
      }

      return didChange
    },
    dryRun,
  )

  if (changed) {
    log('  UPDATE: apps/web/wrangler.json (merged runtime bindings from template)')
  }

  return changed
}
