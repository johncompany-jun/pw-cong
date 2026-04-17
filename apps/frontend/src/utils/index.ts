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

export function isDeadlinePassed(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const deadline = new Date(year, month - 1, day - 1, 20, 0, 0)
  return Date.now() >= deadline.getTime()
}
