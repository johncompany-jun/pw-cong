import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { spotRoutes } from './routes/spots'
import { scheduleRoutes } from './routes/schedules'
import { applicationRoutes } from './routes/applications'
import { specialAssignmentRoutes } from './routes/specialAssignments'
import { rotationRoutes } from './routes/rotations'

const app = new Hono()

app.use(
  '/api/*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
)

app.route('/api', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/spots', spotRoutes)
app.route('/api/schedules', scheduleRoutes)
app.route('/api/applications', applicationRoutes)
app.route('/api/special-assignments', specialAssignmentRoutes)
app.route('/api/rotations', rotationRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
