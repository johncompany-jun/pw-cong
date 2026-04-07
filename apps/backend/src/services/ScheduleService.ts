import { eq, desc, sql, and } from 'drizzle-orm'
import { db } from '../db'
import { schedules, spots, spotPoints, applications } from '../db/schema'
import { ScheduleStatus, type ScheduleStatusType } from '../constants/scheduleStatus'

type ListParams = {
  page: number
  limit: number
  status?: ScheduleStatusType
}

type WriteInput = {
  date: string
  spotId: number
  status?: ScheduleStatusType
  mcUserId?: number | null
}

export class ScheduleService {
  async list({ page, limit, status }: ListParams) {
    const offset = (page - 1) * limit
    const where = status ? eq(schedules.status, status) : undefined

    const data = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime },
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

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schedules)
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

  async getById(id: number) {
    const [row] = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        status: schedules.status,
        slotGranularity: schedules.slotGranularity,
        spot: { id: spots.id, name: spots.name, startTime: spots.startTime, endTime: spots.endTime },
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
    const [schedule] = await db
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
    const [schedule] = await db
      .update(schedules)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(schedules.id, id))
      .returning()
    if (!schedule) throw new Error('スケジュールが見つかりません')
    return schedule
  }

  async delete(id: number) {
    await db.delete(schedules).where(eq(schedules.id, id))
  }
}
