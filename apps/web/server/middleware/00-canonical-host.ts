import { getRequestHeader, getRequestURL, sendRedirect } from 'h3'

function isLocalHost(hostname: string) {
  return hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')
}

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    return
  }

  const config = useRuntimeConfig(event)
  if (!config.public.authEnforceCanonicalHost) {
    return
  }

  const appUrl = config.public.appUrl?.trim()
  if (!appUrl) {
    return
  }

  let canonicalUrl: URL
  try {
    canonicalUrl = new URL(appUrl)
  } catch {
    return
  }

  if (canonicalUrl.protocol !== 'https:' || isLocalHost(canonicalUrl.hostname)) {
    return
  }

  const requestHostHeader =
    getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host') ?? ''
  const requestHost = requestHostHeader.split(',')[0]?.trim().toLowerCase()
  const canonicalHost = canonicalUrl.host.toLowerCase()
  if (!requestHost || requestHost === canonicalHost) {
    return
  }

  const requestUrl = getRequestURL(event)
  const redirectUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`,
    canonicalUrl,
  )

  return sendRedirect(event, redirectUrl.toString(), 308)
})
