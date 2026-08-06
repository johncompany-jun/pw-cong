import { eq, desc, sql, and, inArray, or, exists } from 'drizzle-orm'
import type { AppDB } from '../db'
import { schedules, spots, spotPoints, applications, spotInvitations } from '../db/schema'
import { ScheduleStatus, type ScheduleStatusType } from '../constants/scheduleStatus'

type ListParams = {
  page: number
  limit: number
  statuses?: ScheduleStatusType[]
  mcUserId?: number
  viewerUserId?: number
  viewerIsAdmin?: boolean
}

type WriteInput = {
  date: string
  spotId: number
  status?: ScheduleStatusType
  mcUserId?: number | null
}

export class ScheduleService {
  constructor(private db: AppDB) {}

  async list({ page, limit, statuses, mcUserId, viewerUserId, viewerIsAdmin }: ListParams) {
    const offset = (page - 1) * limit
    const conditions = []
    if (statuses && statuses.length > 0) conditions.push(inArray(schedules.status, statuses))
    if (mcUserId != null) conditions.push(eq(schedules.mcUserId, mcUserId))
    if (!viewerIsAdmin && viewerUserId != null) {
      conditions.push(
        or(
          eq(spots.visibility, 'public'),
          exists(
            this.db
              .select({ id: spotInvitations.id })
              .from(spotInvitations)
              .where(and(eq(spotInvitations.spotId, spots.id), eq(spotInvitations.userId, viewerUserId))),
          ),
        )!,
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const data = await this.db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime, visibility: spots.visibility },
        mcUserId: schedules.mcUserId,
        mcUserName: sql<string | null>`(select name from users where users.id = ${schedules.mcUserId})`,
        applicantCount: sql<number>`(select count(*) from applications where applications.schedule_id = ${schedules.id})`,
      })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(where)
      .orderBy(desc(schedules.date))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(where)

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async canViewSchedule(scheduleId: number, userId: number, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) {
      const [row] = await this.db.select({ id: schedules.id }).from(schedules).where(eq(schedules.id, scheduleId))
      return !!row
    }
    const [row] = await this.db
      .select({ mcUserId: schedules.mcUserId, spotId: schedules.spotId, visibility: spots.visibility })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(schedules.id, scheduleId))
    if (!row) return false
    if (row.mcUserId === userId) return true
    if (row.visibility === 'public') return true

    const [inv] = await this.db
      .select({ id: spotInvitations.id })
      .from(spotInvitations)
      .where(and(eq(spotInvitations.spotId, row.spotId), eq(spotInvitations.userId, userId)))
    if (inv) return true

    const [app] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.scheduleId, scheduleId), eq(applications.userId, userId)))
    return !!app
  }

  async getById(id: number) {
    const [row] = await this.db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        slotGranularity: schedules.slotGranularity,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime, visibility: spots.visibility },
        mcUserId: schedules.mcUserId,
        mcUserName: sql<string | null>`(select name from users where users.id = ${schedules.mcUserId})`,
        spotPointCount: sql<number>`(select count(*) from spot_points where spot_points.spot_id = ${spots.id})`,
      })
      .from(schedules)
      .innerJoin(spots, eq(schedules.spotId, spots.id))
      .where(eq(schedules.id, id))
    return row ?? null
  }

  async create(data: WriteInput) {
    const [schedule] = await this.db
      .insert(schedules)
      .values({
        date: data.date,
        spotId: data.spotId,
        status: data.status ?? ScheduleStatus.DRAFT,
        mcUserId: data.mcUserId ?? null,
      })
      .returning()
    return schedule
  }

  async update(id: number, data: Partial<WriteInput>) {
    const [schedule] = await this.db
      .update(schedules)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(schedules.id, id))
      .returning()
    if (!schedule) throw new Error('スケジュールが見つかりません')
    return schedule
  }

  async delete(id: number) {
    const [schedule] = await this.db
      .select({ status: schedules.status })
      .from(schedules)
      .where(eq(schedules.id, id))
    if (!schedule) throw new Error('スケジュールが見つかりません')

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(eq(applications.scheduleId, id))

    if (count > 0 && schedule.status !== ScheduleStatus.DRAFT) {
      throw new Error('申込者がいるため削除できません')
    }

    if (count > 0) {
      await this.db.delete(applications).where(eq(applications.scheduleId, id))
    }
    await this.db.delete(schedules).where(eq(schedules.id, id))
  }
}
