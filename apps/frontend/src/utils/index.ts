export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ja-JP')
}

export function formatDateFull(date: string | Date): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

export function parseSlots(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}
