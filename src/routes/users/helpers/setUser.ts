import { pick } from "lodash"
import { ObjectId } from "mongoose"
import { clientId } from "../../../helpers/clientId"
import { Capsule } from "../../../models/capsules"
import { IUser } from "../../../types/users"

export const setUser = (user: IUser, subscriberId: ObjectId, dontNeedCapsules?: boolean) => {
  return new Promise(async (resolve) => {
    const result = clientId(pick(user, ['account', 'site', 'about', '_id']))
    result.isTrackedOn = user.subscribers.includes(subscriberId)
    result.subscribersQty = user.subscribers.length
    if (!dontNeedCapsules)
      result.capsulesQty = await Capsule.count({ ownerID: user._id })

    resolve(result)
  })
}
