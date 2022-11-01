import { ObjectId } from "mongoose"

export type IUser = {
  _id: ObjectId
  password: string
  subscribers: ObjectId[]
  subscriptions: ObjectId[]

  save: () => void
}

export type IUserInfo = {

}
