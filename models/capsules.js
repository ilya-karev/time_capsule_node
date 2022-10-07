const mongoose = require('mongoose')
const yup = require('yup')

// CAPSULE SCHEMA
const CapsuleSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 5000,
  },
  tags: [String],
  ownerID: mongoose.ObjectId,
  canOpenAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  }
}) 

const validateCapsule = async capsule => {
  const schema = yup.object().shape({
    content: yup.string().required().min(10, 'Content must be at least 10 characters length').max(20000),
    canOpenAt: yup.date().required(),
    createdAt: yup.date().required(),
  })

  return schema
    .validate(capsule)
    .then(capsule => capsule)
    .catch(error => {
      return {
        message: error.message
      }
    })
}

exports.Capsule = new mongoose.model('Capsule', CapsuleSchema)
exports.validateCapsule = validateCapsule

