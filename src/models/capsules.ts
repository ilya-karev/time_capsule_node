import { Schema, model } from 'mongoose'
import { object, string, date, array } from 'yup'
import { ICapsule } from '../types/capsules'

// CAPSULE SCHEMA
const CapsuleSchema = new Schema({
  content: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 5000,
  },
  tags: [String],
  trackers: [Schema.Types.ObjectId],
  likes: [Schema.Types.ObjectId],
  ownerID: Schema.Types.ObjectId,
  canOpenAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  }
}) 

export const validateCapsule = async (capsule: ICapsule) => {
  const schema = object().shape({
    content: string().required().min(10, 'Content must be at least 10 characters length').max(20000),
    canOpenAt: date().required(),
    createdAt: date().required(),
    // (?=^.{3,25}$) - от трех до 25 символов
    // (?!^[_-].+) - нельзя тире и подчёркивание в начале
    // (?!.+[_-]$) - нельзя типе и подчёркивание в конце
    // (?!.*[&_-]{2,}) - можно тире и подчёркинвание в середине
    // [^<>[\]{}|\\\/^~*@%# :;,$%?\0-\cZ]+$ - нельзя спец.символы
    tags: array(string().matches(/(?=^.{3,25}$)(?!^[_-].+)(?!.+[_-]$)(?!.*[&_-]{2,})[^<>[\]{}|\\\/^~*@%# :;,$%?\0-\cZ]+$/)).max(3, "Only 3 tags are allowed")
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

export const Capsule = model('Capsule', CapsuleSchema)
