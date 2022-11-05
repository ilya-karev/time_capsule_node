import { Schema, model, isValidObjectId } from 'mongoose'
import { object, string, date } from 'yup'
import { IComment } from '../types/comments'
import { User } from './users'

// COMMENT SCHEMA
const CommentSchema = new Schema({
  capsuleID: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  owner: {
    id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    account: {
      type: String,
      required: true,
    },
    required: false,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
  },
  replyToID: {
    type: Schema.Types.ObjectId,
    required: false,
  },
}) 

export const validateComment = async (comment: IComment) => {
  const schema = object().shape({
    text: string().required().min(3, 'Comment must be at least 10 characters length').max(20000),
    capsuleID: string().required(),
  })

  return schema
    .validate(comment)
    .then(comment => comment)
    .catch(error => {
      return {
        message: error.message
      }
    })
}

export const Comment = model('Comment', CommentSchema)
