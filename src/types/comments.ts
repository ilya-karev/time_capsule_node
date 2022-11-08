import { ObjectId } from "mongoose"

export type IComment = {
  text: String,
  capsuleID: ObjectId,
  createdAt: Date,
  owner: {
    id: ObjectId,
    account: String,
  },
  reply?: {
    id: ObjectId,
    text: String,
    owner: {
      id: ObjectId,
      account: String,
    },
  },

  save?: () => Promise<IComment>  
  _doc?: IComment
}

