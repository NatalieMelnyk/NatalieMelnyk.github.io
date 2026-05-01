const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')
const User = require('../model/userModel')

const protect = asyncHandler(async (req, res, next) => {
  // Read the JWT from the HttpOnly cookie (set during login)
  const token = req.cookies?.token

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) {
      res.status(401)
      throw new Error('Not authorized, user not found')
    }
    next()
  } catch (error) {
    res.status(401)
    throw new Error('Not authorized, invalid token')
  }
})

module.exports = { protect }