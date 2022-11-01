import { Request } from "express"
import { ObjectId } from "mongoose"

export interface AuthInfoRequest extends Request {
  user: {
   _id: ObjectId
  }
}
