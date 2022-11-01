import { Schema, model } from 'mongoose'
import { object, string } from 'yup'
import { IUser, IUserInfo } from '../types/users'

// USER SCHEMA
const UserSchema = new Schema({
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
  subscriptions: [Schema.Types.ObjectId],
  subscribers: [Schema.Types.ObjectId],
  tracks: [Schema.Types.ObjectId],
  account: {
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


export const validateUser = async (user: IUser) => {
  const schema = object().shape({
    email: string().required().email().min(5).max(255),
    password: string().required().matches(/^[a-z0-9]+$/).min(5).max(255)
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

export const validateUserInfo = async (userInfo: IUserInfo) => {
  const schema = object().shape({
    account: string().required().min(2).max(17),
    site: string().max(255),
    about: string().max(1024),
  })

  return schema
    .validate(userInfo)
    .then(userInfo => userInfo)
    .catch(error => ({ message: error.message }))
}


export const User = model('User', UserSchema)
