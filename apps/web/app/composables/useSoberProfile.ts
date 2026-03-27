/**
 * Authenticated owner profile (counter, slug, visibility, etc.).
 */
export function useSoberProfile() {
  return useFetch('/api/profile')
}
