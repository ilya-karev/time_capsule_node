import { ObjectId } from "mongoose"
import { ICapsule } from "../types/capsules";
import { IUser } from "../types/users";

export const clientId = (object: any) => {
  const clientIdObject = { ...object, id: object._id }
  delete clientIdObject._id
  return clientIdObject
}

export const mongoId = (object: any) => {
  if (object.id) {
    const mongoIdObject = { ...object, _id: object.id }
    delete mongoIdObject.id
    return mongoIdObject
  } else return object
}
