const mongoose = require('mongoose')
const User = require('./user')

// CAPSULE SCHEMA
const CapsuleSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 20000,
  },
  userID: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 200,
  },
  canOpenAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  }
  // tags:
}) 

module.exports = new mongoose.model('Capsule', CapsuleSchema)

