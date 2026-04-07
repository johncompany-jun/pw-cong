export const ScheduleStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const

export type ScheduleStatusType = (typeof ScheduleStatus)[keyof typeof ScheduleStatus]

export const ScheduleStatusLabel: Record<string, string> = {
  [ScheduleStatus.DRAFT]: '下書き',
  [ScheduleStatus.OPEN]: '受付中',
  [ScheduleStatus.CONFIRMED]: '確定',
  [ScheduleStatus.CANCELLED]: '中止',
}

export const ScheduleStatusStyle: Record<string, string> = {
  [ScheduleStatus.DRAFT]: 'bg-gray-100 text-gray-600 border-gray-200',
  [ScheduleStatus.OPEN]: 'bg-green-50 text-green-700 border-green-200',
  [ScheduleStatus.CONFIRMED]: 'bg-blue-50 text-blue-700 border-blue-200',
  [ScheduleStatus.CANCELLED]: 'bg-red-50 text-red-600 border-red-200',
}
