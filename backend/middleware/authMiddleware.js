import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import User from '../models/userModel.js'

const protect = asyncHandler(async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
        console.error('❌ Invalid ObjectId:', decoded.id)
        res.status(401)
        throw new Error('Invalid user ID in token')
      }

      req.user = await User.findById(decoded.id).select('-password')

      if (!req.user) {
        console.error('❌ User not found for ID:', decoded.id)
        res.status(404)
        throw new Error('User not found')
      }

      next()
    } catch (error) {
      console.error('🔴 Auth error:', error.message)
      res.status(401)
      throw new Error('Not authorized, token failed')
    }
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token')
  }
})

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next()
  } else {
    res.status(401)
    throw new Error('Not authorized as an admin')
  }
}

export { protect, admin }