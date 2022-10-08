const mongoose = require('mongoose')
const yup = require('yup')

// USER SCHEMA
const UserSchema = new mongoose.Schema({
  email: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 255,
      unique: true
  },
  password: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1024
  },
  subscriptions: [mongoose.ObjectId],
  subscribers: [mongoose.ObjectId],
  nickname: {
    type: String,
    minlength: 2,
    maxlength: 255,
  },
  site: {
    type: String,
    required: false,
    maxlength: 255,
  },
  about: {
    type: String,
    required: false,
    maxlength: 255,
  },
})


const validateUser = async user => {
  const schema = yup.object().shape({
    email: yup.string().required().email().min(5).max(255),
    password: yup.string().required().min(5).max(255)
  })

  return schema
    .validate(user)
    .then(user => user)
    .catch(error => {
      return {
        message: error.message
      }
    })
}

const validateUserInfo = async userInfo => {
  const schema = yup.object().shape({
    nickname: yup.string().required().min(2).max(17),
    site: yup.string().max(255),
    about: yup.string().max(255),
  })

  return schema
    .validate(userInfo)
    .then(userInfo => userInfo)
    .catch(error => ({ message: error.message }))
}


exports.User = new mongoose.model('User', UserSchema)
exports.validateUser = validateUser;
exports.validateUserInfo = validateUserInfo;
