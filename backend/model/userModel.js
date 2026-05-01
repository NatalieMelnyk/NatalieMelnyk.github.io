const mongoose = require('mongoose')
// Model for users
const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please add a username'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', userSchema)