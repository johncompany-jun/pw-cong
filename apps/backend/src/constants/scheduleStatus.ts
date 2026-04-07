export const ScheduleStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const

export type ScheduleStatusType = (typeof ScheduleStatus)[keyof typeof ScheduleStatus]

export const SCHEDULE_STATUS_VALUES = Object.values(ScheduleStatus) as [
  ScheduleStatusType,
  ...ScheduleStatusType[],
]
