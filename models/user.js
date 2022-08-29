const mongoose = require('mongoose')

// CAPSULE SCHEMA
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
  },
  lastName: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
  },
}) 

module.exports = new mongoose.model('User', UserSchema)

