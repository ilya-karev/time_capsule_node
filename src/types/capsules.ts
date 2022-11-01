import { Date, Error, MongooseError, ObjectId } from "mongoose"

export type ICapsule = {
  canOpenAt: string
  ownerID: string
  content: string
  trackers: ObjectId[]
  likes: ObjectId[]

  save: () => Promise<ICapsule>  
  _doc?: ICapsule
}

export type IQuery = {
  ownerID: ObjectId,
  status?: string,
  canOpenAt?: Date
}
