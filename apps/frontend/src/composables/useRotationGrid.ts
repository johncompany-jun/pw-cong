import { computed, type Ref } from 'vue'

export type SpotPoint = { id: number; name: string; sortOrder: number }
export type Column = { key: string; label: string; isMimaori: boolean }
export type ScheduleForGrid = {
  slotGranularity: number
  spot: { startTime: string; endTime: string }
}

export function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function fromMin(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function useRotationGrid(
  schedule: Ref<ScheduleForGrid | null>,
  points: Ref<SpotPoint[]>,
) {
  const rotationSlots = computed((): string[] => {
    if (!schedule.value) return []
    const { startTime, endTime } = schedule.value.spot
    const step = schedule.value.slotGranularity
    const start = toMin(startTime)
    const end = toMin(endTime)
    const result: string[] = []
    for (let t = start; t + step <= end; t += step) {
      result.push(`${fromMin(t)}〜${fromMin(t + step)}`)
    }
    return result
  })

  const columns = computed((): Column[] => {
    const cols: Column[] = []
    for (const p of points.value) {
      cols.push({ key: `point-${p.id}-1`, label: `${p.name}①`, isMimaori: false })
      cols.push({ key: `point-${p.id}-2`, label: `${p.name}②`, isMimaori: false })
      cols.push({ key: `mimaori-${p.id}`, label: '見守り', isMimaori: true })
    }
    return cols
  })

  function parentSlot(rotSlot: string): string {
    if (!schedule.value) return ''
    const startStr = rotSlot.split('〜')[0]
    const rotStart = toMin(startStr)
    const spotStart = toMin(schedule.value.spot.startTime)
    const spotEnd = toMin(schedule.value.spot.endTime)
    for (let t = spotStart; t + 30 <= spotEnd; t += 30) {
      if (rotStart >= t && rotStart < t + 30) {
        return `${fromMin(t)}〜${fromMin(t + 30)}`
      }
    }
    return ''
  }

  return { rotationSlots, columns, parentSlot }
}
