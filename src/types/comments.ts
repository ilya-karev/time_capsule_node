import { Date, ObjectId } from "mongoose"

export type IComment = {
  text: String,
  capsuleID: ObjectId,
  createdAt: Date,
  replyToID: ObjectId,
  owner: {
    id: ObjectId,
    account: String,
  },

  save: () => Promise<IComment>  
  _doc?: IComment
}

