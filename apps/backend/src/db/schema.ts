import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { SCHEDULE_STATUS_VALUES, ScheduleStatus } from '../constants/scheduleStatus'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  gender: text('gender'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const spots = sqliteTable('spots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const spotPoints = sqliteTable('spot_points', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spotId: integer('spot_id').notNull(),
  name: text('name').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  address: text('address'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export type Spot = typeof spots.$inferSelect
export type SpotPoint = typeof spotPoints.$inferSelect

export const schedules = sqliteTable('schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  spotId: integer('spot_id').notNull(),
  status: text('status', { enum: SCHEDULE_STATUS_VALUES }).notNull().default(ScheduleStatus.DRAFT),
  slotGranularity: integer('slot_granularity').notNull().default(30),
  mcUserId: integer('mc_user_id'),
  rotationNotes: text('rotation_notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export type Schedule = typeof schedules.$inferSelect

const YESNO_VALUES: ['yes', 'no'] = ['yes', 'no']
const PARTICIPATION_STATUS_VALUES: ['pending', 'approved', 'rejected'] = ['pending', 'approved', 'rejected']
const SPECIAL_ASSIGNMENT_TYPE_VALUES: ['cart_prepare', 'cart_cleanup', 'transport_go', 'transport_return'] = ['cart_prepare', 'cart_cleanup', 'transport_go', 'transport_return']

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scheduleId: integer('schedule_id').notNull(),
  userId: integer('user_id').notNull(),
  selectedSlots: text('selected_slots').notNull(), // JSON array of slot strings
  cartPrepare: text('cart_prepare', { enum: YESNO_VALUES }).notNull().default('no'),
  cartCleanup: text('cart_cleanup', { enum: YESNO_VALUES }).notNull().default('no'),
  carTransport: text('car_transport', { enum: YESNO_VALUES }).notNull().default('no'),
  notes: text('notes'),
  participationStatus: text('participation_status', { enum: PARTICIPATION_STATUS_VALUES }).notNull().default('pending'),
  approvedSlots: text('approved_slots'), // JSON array of confirmed slot strings, null = not yet set
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export type Application = typeof applications.$inferSelect

export const specialAssignments = sqliteTable('special_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scheduleId: integer('schedule_id').notNull(),
  userId: integer('user_id').notNull(),
  assignmentType: text('assignment_type', { enum: SPECIAL_ASSIGNMENT_TYPE_VALUES }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type SpecialAssignment = typeof specialAssignments.$inferSelect

export const rotationAssignments = sqliteTable('rotation_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scheduleId: integer('schedule_id').notNull(),
  timeSlot: text('time_slot').notNull(),   // e.g. "12:30〜12:45"
  columnKey: text('column_key').notNull(), // "point-{spotPointId}-1", "point-{spotPointId}-2", "mimaori"
  userId: integer('user_id').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type RotationAssignment = typeof rotationAssignments.$inferSelect
