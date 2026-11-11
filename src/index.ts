import { Hono } from 'hono'
import { adminRoutes } from './routes/admin'
import { apiRoutes } from './routes/api'
import { publicRoutes } from './routes/public'
import { NotFoundPage } from './views/pages'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => c.redirect('/admin'))
app.route('/p', publicRoutes)
app.route('/admin', adminRoutes)
app.route('/api', apiRoutes)

app.notFound((c) => c.html(NotFoundPage(), 404))

export default app
