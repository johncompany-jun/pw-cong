import { eq, asc, inArray, or, exists, and } from 'drizzle-orm'
import type { AppDB } from '../db'
import { spots, spotPoints, spotInvitations } from '../db/schema'

type PointInput = {
  name: string
  lat?: number | null
  lng?: number | null
  address?: string | null
}

type Visibility = 'public' | 'private'

type SpotInput = {
  name: string
  startTime: string
  endTime: string
  points: PointInput[]
  visibility?: Visibility
  invitedUserIds?: number[]
}

type ListParams = {
  userId: number
  isAdmin: boolean
}

export class SpotService {
  constructor(private db: AppDB) {}

  async list({ userId, isAdmin }: ListParams) {
    const where = isAdmin
      ? undefined
      : or(
          eq(spots.visibility, 'public'),
          exists(
            this.db
              .select({ id: spotInvitations.id })
              .from(spotInvitations)
              .where(and(eq(spotInvitations.spotId, spots.id), eq(spotInvitations.userId, userId))),
          ),
        )

    const visibleSpots = await this.db.select().from(spots).where(where).orderBy(asc(spots.createdAt))
    if (visibleSpots.length === 0) return []

    const ids = visibleSpots.map(s => s.id)
    const [allPoints, allInvitations] = await Promise.all([
      this.db.select().from(spotPoints).where(inArray(spotPoints.spotId, ids)).orderBy(asc(spotPoints.sortOrder)),
      this.db.select().from(spotInvitations).where(inArray(spotInvitations.spotId, ids)),
    ])

    return visibleSpots.map(spot => ({
      ...spot,
      points: allPoints.filter(p => p.spotId === spot.id),
      invitedUserIds: allInvitations.filter(i => i.spotId === spot.id).map(i => i.userId),
    }))
  }

  async create(data: SpotInput) {
    const [spot] = await this.db
      .insert(spots)
      .values({
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        visibility: data.visibility ?? 'public',
      })
      .returning()

    if (data.points.length > 0) {
      await this.db.insert(spotPoints).values(
        data.points.map((p, i) => ({
          spotId: spot.id,
          name: p.name,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          address: p.address ?? null,
          sortOrder: i,
        })),
      )
    }

    await this.syncInvitations(spot.id, spot.visibility, data.invitedUserIds ?? [])

    return this.findById(spot.id)
  }

  async update(id: number, data: SpotInput) {
    const [spot] = await this.db
      .update(spots)
      .set({
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        visibility: data.visibility ?? 'public',
      })
      .where(eq(spots.id, id))
      .returning()

    if (!spot) throw new Error('スポットが見つかりません')

    await this.db.delete(spotPoints).where(eq(spotPoints.spotId, id))
    if (data.points.length > 0) {
      await this.db.insert(spotPoints).values(
        data.points.map((p, i) => ({
          spotId: id,
          name: p.name,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          address: p.address ?? null,
          sortOrder: i,
        })),
      )
    }

    await this.syncInvitations(id, spot.visibility, data.invitedUserIds ?? [])

    return this.findById(id)
  }

  async delete(id: number) {
    await this.db.delete(spotPoints).where(eq(spotPoints.spotId, id))
    await this.db.delete(spotInvitations).where(eq(spotInvitations.spotId, id))
    await this.db.delete(spots).where(eq(spots.id, id))
  }

  async isVisibleToUser(spotId: number, userId: number): Promise<boolean> {
    const [spot] = await this.db
      .select({ visibility: spots.visibility })
      .from(spots)
      .where(eq(spots.id, spotId))
    if (!spot) return false
    if (spot.visibility === 'public') return true
    const [inv] = await this.db
      .select({ id: spotInvitations.id })
      .from(spotInvitations)
      .where(and(eq(spotInvitations.spotId, spotId), eq(spotInvitations.userId, userId)))
    return !!inv
  }

  private async syncInvitations(spotId: number, visibility: Visibility, invitedUserIds: number[]) {
    await this.db.delete(spotInvitations).where(eq(spotInvitations.spotId, spotId))
    if (visibility !== 'private' || invitedUserIds.length === 0) return
    const uniqueIds = Array.from(new Set(invitedUserIds))
    await this.db.insert(spotInvitations).values(
      uniqueIds.map(userId => ({ spotId, userId })),
    )
  }

  private async findById(id: number) {
    const [spot] = await this.db.select().from(spots).where(eq(spots.id, id))
    if (!spot) throw new Error('スポットが見つかりません')
    const [points, invitations] = await Promise.all([
      this.db.select().from(spotPoints).where(eq(spotPoints.spotId, id)).orderBy(asc(spotPoints.sortOrder)),
      this.db.select({ userId: spotInvitations.userId }).from(spotInvitations).where(eq(spotInvitations.spotId, id)),
    ])
    return { ...spot, points, invitedUserIds: invitations.map(i => i.userId) }
  }
}
