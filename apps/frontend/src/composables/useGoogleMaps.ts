let promise: Promise<void> | null = null

export function loadGoogleMaps(): Promise<void> {
  if ((window as any).google?.maps?.places) return Promise.resolve()
  if (promise) return promise

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY が設定されていません'))
  }

  promise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ja`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      promise = null
      reject(new Error('Google Maps の読み込みに失敗しました'))
    }
    document.head.appendChild(script)
  })
  return promise
}
