import { eq, asc } from 'drizzle-orm'
import { db } from '../db'
import { spots, spotPoints } from '../db/schema'

type PointInput = {
  name: string
  lat?: number | null
  lng?: number | null
  address?: string | null
}

type SpotInput = {
  name: string
  startTime: string
  endTime: string
  points: PointInput[]
}

export class SpotService {
  async list() {
    const allSpots = await db.select().from(spots).orderBy(asc(spots.createdAt))
    const allPoints = await db.select().from(spotPoints).orderBy(asc(spotPoints.sortOrder))

    return allSpots.map(spot => ({
      ...spot,
      points: allPoints.filter(p => p.spotId === spot.id),
    }))
  }

  async create(data: SpotInput) {
    const [spot] = await db
      .insert(spots)
      .values({ name: data.name, startTime: data.startTime, endTime: data.endTime })
      .returning()

    if (data.points.length > 0) {
      await db.insert(spotPoints).values(
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

    return this.findById(spot.id)
  }

  async update(id: number, data: SpotInput) {
    const [spot] = await db
      .update(spots)
      .set({ name: data.name, startTime: data.startTime, endTime: data.endTime })
      .where(eq(spots.id, id))
      .returning()

    if (!spot) throw new Error('スポットが見つかりません')

    // Replace all points
    await db.delete(spotPoints).where(eq(spotPoints.spotId, id))
    if (data.points.length > 0) {
      await db.insert(spotPoints).values(
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

    return this.findById(id)
  }

  async delete(id: number) {
    await db.delete(spotPoints).where(eq(spotPoints.spotId, id))
    await db.delete(spots).where(eq(spots.id, id))
  }

  private async findById(id: number) {
    const spot = await db.select().from(spots).where(eq(spots.id, id)).then(r => r[0])
    const points = await db.select().from(spotPoints).where(eq(spotPoints.spotId, id)).orderBy(asc(spotPoints.sortOrder))
    return { ...spot, points }
  }
}
