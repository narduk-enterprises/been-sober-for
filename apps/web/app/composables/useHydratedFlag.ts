export function useHydratedFlag() {
  const hydrated = ref(false)

  onMounted(() => {
    hydrated.value = true
  })

  return hydrated
}
