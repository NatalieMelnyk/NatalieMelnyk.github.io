const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const connectDB = require('./config/db')
const { errorHandler } = require('./middleware/errorMiddleware')
const { protect } = require('./middleware/authMiddleware')

connectDB()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// API routes
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/products', require('./routes/productRoutes'))

// Page route protection — gate /admin behind the JWT cookie
// If protect throws, it triggers errorHandler which sends JSON.
// For pages we want a redirect instead, so wrap it:
app.get('/admin', (req, res, next) => {
  protect(req, res, (err) => {
    if (err) return res.redirect('/login')
    res.sendFile(path.join(__dirname, '../public/admin.html'))
  })
})

app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/login.html'))
)

// Static files (everything else: index.html, css, images, login.html)
app.use(express.static(path.join(__dirname, '../public')))

app.use(errorHandler)

// This works for local dev — Vercel uses /api/index.js instead
if (require.main === module) {
  const port = process.env.PORT || 5959
  app.listen(port, () => console.log(`Server started on port ${port}`))
}

module.exports = app