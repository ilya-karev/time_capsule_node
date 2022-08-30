const mongoose = require('mongoose')
const User = require('./user')
const yup = require('yup')

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

const validateCapsule = async capsule => {
  const schema = yup.object().shape({
    content: yup.string().required().min(20, 'Content must be at least 20 characters length').max(20000),
    userID: yup.string().required().min(1).max(200),
    canOpenAt: yup.string().required(),
    createdAt: yup.string().required(),
  })

  return schema
    .validate(capsule)
    .then(capsule => capsule)
    .catch(error => {
      console.log('======== CATCH ========')
      console.log(error)
      console.log('======== CATCH ========')
      return {
        message: error.message
      }
    })
}

exports.Capsule = new mongoose.model('Capsule', CapsuleSchema)
exports.validateCapsule = validateCapsule

