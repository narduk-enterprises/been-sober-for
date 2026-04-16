import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type TemplateLayerSelection } from './layer-bundle-manifest'
import { type BaseThemeSelection } from './theme-manifest'
import { type AppTemplateSelection } from './app-template-manifest'
import {
  resolveSelectedStarterPackageNames,
  type StarterCompositionSelection,
} from './starter-composition'

function buildExpectedExtendsLiteral(selection: StarterCompositionSelection): string {
  const packageNames = resolveSelectedStarterPackageNames(selection)
  if (packageNames.length === 0) {
    throw new Error(
      'resolveSelectedStarterPackageNames() returned no packages; expected at least the base theme and core layer bundle.',
    )
  }

  return [
    '  extends: [',
    ...packageNames.map((packageName) => `    '${packageName}',`),
    '  ],',
  ].join('\n')
}

function findPropertyLine(body: string, prefixes: string[]): string | null {
  const line = body.split('\n').find((candidate) => {
    const trimmed = candidate.trimStart()
    return prefixes.some((prefix) => trimmed.startsWith(prefix))
  })

  return line ? line.trim() : null
}

function buildPropertyLine(
  body: string,
  prefixes: string[],
  fallback: string,
  indent: string,
): string {
  return `${indent}${findPropertyLine(body, prefixes) ?? fallback}`
}

export function patchWebNuxtConfig(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  templateLayerSelection: TemplateLayerSelection,
  baseThemeSelection: BaseThemeSelection,
  appTemplateSelection: AppTemplateSelection | null,
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const nuxtConfigPath = join(appDir, 'apps/web/nuxt.config.ts')
  if (!existsSync(nuxtConfigPath)) return false

  let content = readFileSync(nuxtConfigPath, 'utf-8')
  const original = content

  if (content.includes('fileURLToPath(') && !content.includes("from 'node:url'")) {
    const lines = content.split('\n')
    const firstImportIndex = lines.findIndex((line) => line.startsWith('import '))
    const importLine = "import { fileURLToPath } from 'node:url'"

    if (firstImportIndex >= 0) {
      lines.splice(firstImportIndex, 0, importLine)
    } else {
      let insertAt = 0
      while (insertAt < lines.length && lines[insertAt].startsWith('//')) {
        insertAt += 1
      }
      lines.splice(insertAt, 0, importLine, '')
    }

    content = lines.join('\n')
  }

  if (!content.includes("from './auth-environment'")) {
    const provisionImportLine =
      "import { getProvisionDisplayName, readProvisionMetadata } from '../../tools/provision-metadata'"
    const authEnvironmentImportLine = "import { resolveAuthEnvironment } from './auth-environment'"

    if (content.includes(provisionImportLine)) {
      content = content.replace(
        provisionImportLine,
        `${provisionImportLine}\n${authEnvironmentImportLine}`,
      )
    } else if (content.includes('const __dirname =')) {
      content = content.replace(
        'const __dirname =',
        `${authEnvironmentImportLine}\n\nconst __dirname =`,
      )
    }
  }

  const authEnvironmentBlock = [
    'const {',
    '  appBackendPreset,',
    '  authAuthorityUrl,',
    '  authBackend,',
    '  authProviders,',
    '  supabasePublishableKey,',
    '  supabaseServiceRoleKey,',
    '  supabaseUrl,',
    '} = resolveAuthEnvironment(process.env)',
    '',
  ].join('\n')
  const authPreludeStart = content.indexOf('const appBackendPreset =')
  const authPreludeEnd = content.indexOf('const appOrmTablesEntry =')

  if (authPreludeStart !== -1 && authPreludeEnd !== -1 && authPreludeStart < authPreludeEnd) {
    content = `${content.slice(0, authPreludeStart)}${authEnvironmentBlock}${content.slice(authPreludeEnd)}`
  } else if (!content.includes('resolveAuthEnvironment(process.env)')) {
    const authAnchor = 'const appOrmTablesEntry ='
    if (content.includes(authAnchor)) {
      content = content.replace(authAnchor, `${authEnvironmentBlock}${authAnchor}`)
    }
  }

  if (content.includes('resolveAuthEnvironment(process.env)')) {
    content = content.replace(
      /\nfunction parseAuthProviders\(value: string \| undefined\) \{[\s\S]*?\nconst authProviders =\n  authBackend === 'supabase' \? parseAuthProviders\(process\.env\.AUTH_PROVIDERS\) : \['email'\]\n/m,
      '\n',
    )
  }

  const needsLegacyAuthProviders =
    content.includes('authProviders') &&
    !content.includes('const authProviders =') &&
    !content.includes('resolveAuthEnvironment(process.env)')

  if (needsLegacyAuthProviders) {
    const legacyAuthProvidersBlock = [
      'function parseAuthProviders(value: string | undefined) {',
      "  return (value || 'apple,email')",
      "    .split(',')",
      '    .map((provider) => provider.trim().toLowerCase())',
      '    .filter((provider, index, providers) => provider && providers.indexOf(provider) === index)',
      '}',
      '',
      'const authProviders =',
      "  authBackend === 'supabase' ? parseAuthProviders(process.env.AUTH_PROVIDERS) : ['email']",
      '',
    ].join('\n')

    const authProvidersAnchor = 'const appOrmTablesEntry ='
    if (content.includes(authProvidersAnchor)) {
      content = content.replace(
        authProvidersAnchor,
        `${legacyAuthProvidersBlock}${authProvidersAnchor}`,
      )
    } else if (content.includes('export default defineNuxtConfig({')) {
      content = content.replace(
        'export default defineNuxtConfig({',
        `${legacyAuthProvidersBlock}export default defineNuxtConfig({`,
      )
    }
  }

  if (!content.includes('const appOrmTablesEntry =')) {
    const appOrmTablesBlock = [
      'const appOrmTablesEntry =',
      "  process.env.NUXT_DATABASE_BACKEND === 'postgres'",
      "    ? './server/database/pg-app-schema.ts'",
      "    : './server/database/app-schema.ts'",
      '',
    ].join('\n')

    const anchor = '// https://nuxt.com/docs/api/configuration/nuxt-config'
    const exportDefaultAnchor = 'export default defineNuxtConfig({'
    if (content.includes(anchor)) {
      content = content.replace(anchor, `${appOrmTablesBlock}${anchor}`)
    } else if (content.includes(exportDefaultAnchor)) {
      content = content.replace(exportDefaultAnchor, `${appOrmTablesBlock}${exportDefaultAnchor}`)
    }
  }

  content = content.replace(
    ': process.env.AUTH_AUTHORITY_URL && process.env.SUPABASE_AUTH_ANON_KEY',
    ': supabaseUrl && supabasePublishableKey',
  )
  content = content.replace(
    "const authAuthorityUrl = process.env.AUTH_AUTHORITY_URL || ''",
    'const authAuthorityUrl = supabaseUrl',
  )

  const expectedExtendsLiteral = buildExpectedExtendsLiteral({
    templateLayerSelection,
    baseThemeSelection,
    appTemplateSelection,
  })
  if (/^\s*extends:\s*\[[^\]]*\],/m.test(content)) {
    content = content.replace(/^\s*extends:\s*\[[^\]]*\],/m, expectedExtendsLiteral)
  } else {
    content = content.replace(
      'export default defineNuxtConfig({',
      `export default defineNuxtConfig({\n${expectedExtendsLiteral}`,
    )
  }

  if (!content.includes("'#server/app-orm-tables'")) {
    const aliasLine =
      "    '#server/app-orm-tables': fileURLToPath(new URL(appOrmTablesEntry, import.meta.url)),"
    if (/^  alias: \{\n/m.test(content)) {
      content = content.replace(/^  alias: \{\n/m, `  alias: {\n${aliasLine}\n`)
    } else {
      const aliasBlock = ['  alias: {', aliasLine, '  },', ''].join('\n')
      if (/^\s*extends:\s*\[[^\]]*\],\n/m.test(content)) {
        content = content.replace(
          /^\s*extends:\s*\[[^\]]*\],\n/m,
          (match) => `${match}\n${aliasBlock}`,
        )
      } else {
        content = content.replace(
          'export default defineNuxtConfig({',
          `export default defineNuxtConfig({\n${aliasBlock}`,
        )
      }
    }
  }

  const runtimeStart = content.indexOf('  runtimeConfig: {\n')
  const publicStart = content.indexOf('    public: {\n', runtimeStart)
  if (runtimeStart !== -1 && publicStart !== -1) {
    const runtimeBodyStart = runtimeStart + '  runtimeConfig: {\n'.length
    const runtimeBody = content.slice(runtimeBodyStart, publicStart)
    const runtimePrefixes = [
      'appBackendPreset,',
      'authBackend,',
      'authBackend:',
      'authAuthorityUrl,',
      'authAuthorityUrl:',
      'authAnonKey,',
      'authAnonKey:',
      'authServiceRoleKey,',
      'authServiceRoleKey:',
      'authStorageKey:',
      'turnstileSecretKey:',
      'supabaseUrl,',
      'supabaseUrl:',
      'supabasePublishableKey,',
      'supabasePublishableKey:',
      'supabaseServiceRoleKey,',
      'supabaseServiceRoleKey:',
    ]
    const normalizedRuntimeBody = runtimeBody
      .split('\n')
      .filter((line) => {
        const trimmed = line.trimStart()
        return !runtimePrefixes.some((prefix) => trimmed.startsWith(prefix))
      })
      .join('\n')
      .replace(/^\n+/, '')

    const runtimeAuthBlock = [
      buildPropertyLine(runtimeBody, ['appBackendPreset,'], 'appBackendPreset,', '    '),
      buildPropertyLine(runtimeBody, ['authBackend,', 'authBackend:'], 'authBackend,', '    '),
      buildPropertyLine(
        runtimeBody,
        ['authAuthorityUrl,', 'authAuthorityUrl:'],
        'authAuthorityUrl,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['authAnonKey,', 'authAnonKey:'],
        'authAnonKey: supabasePublishableKey,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['authServiceRoleKey,', 'authServiceRoleKey:'],
        'authServiceRoleKey: supabaseServiceRoleKey,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['authStorageKey:'],
        "authStorageKey: process.env.AUTH_STORAGE_KEY || 'web-auth',",
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['turnstileSecretKey:'],
        "turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',",
        '    ',
      ),
      buildPropertyLine(runtimeBody, ['supabaseUrl,', 'supabaseUrl:'], 'supabaseUrl,', '    '),
      buildPropertyLine(
        runtimeBody,
        ['supabasePublishableKey,', 'supabasePublishableKey:'],
        'supabasePublishableKey,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['supabaseServiceRoleKey,', 'supabaseServiceRoleKey:'],
        'supabaseServiceRoleKey,',
        '    ',
      ),
    ].join('\n')

    content =
      content.slice(0, runtimeBodyStart) +
      `${runtimeAuthBlock}\n${normalizedRuntimeBody}` +
      content.slice(publicStart)
  }

  const publicBlockStart = content.indexOf('    public: {\n')
  const publicBlockBodyStart = publicBlockStart + '    public: {\n'.length
  const publicBlockEnd =
    publicBlockStart === -1 ? -1 : content.indexOf('\n    },', publicBlockBodyStart)
  if (publicBlockStart !== -1 && publicBlockEnd !== -1) {
    const publicBody = content.slice(publicBlockBodyStart, publicBlockEnd)
    const publicPrefixes = [
      'appBackendPreset,',
      'authBackend,',
      'authBackend:',
      'authAuthorityUrl,',
      'authAuthorityUrl:',
      'authLoginPath:',
      'authRegisterPath:',
      'authCallbackPath:',
      'authConfirmPath:',
      'authResetPath:',
      'authLogoutPath:',
      'authRedirectPath:',
      'authProviders,',
      'authProviders:',
      'authEnforceCanonicalHost:',
      'authPublicSignup:',
      'authRequireMfa:',
      'authTurnstileSiteKey:',
      'supabaseUrl,',
      'supabaseUrl:',
      'supabasePublishableKey,',
      'supabasePublishableKey:',
    ]
    const normalizedPublicBody = publicBody
      .split('\n')
      .filter((line) => {
        const trimmed = line.trimStart()
        return !publicPrefixes.some((prefix) => trimmed.startsWith(prefix))
      })
      .join('\n')
      .replace(/^\n+/, '')

    const publicAuthBlock = [
      buildPropertyLine(publicBody, ['appBackendPreset,'], 'appBackendPreset,', '      '),
      buildPropertyLine(publicBody, ['authBackend,', 'authBackend:'], 'authBackend,', '      '),
      buildPropertyLine(
        publicBody,
        ['authAuthorityUrl,', 'authAuthorityUrl:'],
        'authAuthorityUrl,',
        '      ',
      ),
      buildPropertyLine(publicBody, ['authLoginPath:'], "authLoginPath: '/login',", '      '),
      buildPropertyLine(
        publicBody,
        ['authRegisterPath:'],
        "authRegisterPath: '/register',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authCallbackPath:'],
        "authCallbackPath: '/auth/callback',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authConfirmPath:'],
        "authConfirmPath: '/auth/confirm',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authResetPath:'],
        "authResetPath: '/reset-password',",
        '      ',
      ),
      buildPropertyLine(publicBody, ['authLogoutPath:'], "authLogoutPath: '/logout',", '      '),
      buildPropertyLine(
        publicBody,
        ['authRedirectPath:'],
        "authRedirectPath: '/dashboard/',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authProviders,', 'authProviders:'],
        'authProviders,',
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authEnforceCanonicalHost:'],
        "authEnforceCanonicalHost: process.env.AUTH_ENFORCE_CANONICAL_HOST === 'true',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authPublicSignup:'],
        "authPublicSignup: process.env.AUTH_PUBLIC_SIGNUP !== 'false',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authRequireMfa:'],
        "authRequireMfa: process.env.AUTH_REQUIRE_MFA === 'true',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authTurnstileSiteKey:'],
        "authTurnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',",
        '      ',
      ),
      buildPropertyLine(publicBody, ['supabaseUrl,', 'supabaseUrl:'], 'supabaseUrl,', '      '),
      buildPropertyLine(
        publicBody,
        ['supabasePublishableKey,', 'supabasePublishableKey:'],
        'supabasePublishableKey,',
        '      ',
      ),
    ].join('\n')

    content =
      content.slice(0, publicBlockBodyStart) +
      `${publicAuthBlock}\n${normalizedPublicBody}` +
      content.slice(publicBlockEnd)
  }

  if (content === original) return false

  log('  UPDATE: apps/web/nuxt.config.ts')
  if (!dryRun) {
    writeFileSync(nuxtConfigPath, content, 'utf-8')
  }
  return true
}
