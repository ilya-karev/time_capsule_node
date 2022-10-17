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
  trackers: [mongoose.ObjectId],
  likes: [mongoose.ObjectId],
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
    tags: yup.array(yup.string().matches(/(?=^.{3,25}$)(?!^[_-].+)(?!.+[_-]$)(?!.*[_-]{2,})[^<>[\]{}|\\\/^~%# :;,$%?\0-\cZ]+$/)).max(3, "Only 3 tags are allowed")
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

