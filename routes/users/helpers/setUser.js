const { pick } = require("lodash")
const { clientId } = require("../../../helpers/clientId")
const { Capsule } = require("../../../models/capsules")

const setUser = (user, subscriberId, dontNeedCapsules) => {
  return new Promise(async (resolve) => {
    const result = clientId(pick(user, ['account', 'site', 'about', '_id']))
    result.isTrackedOn = user.subscribers.includes(subscriberId)
    result.subscribersQty = user.subscribers.length
    if (!dontNeedCapsules)
      result.capsulesQty = await Capsule.count({ ownerID: user.id })

    resolve(result)
  })
}

module.exports = { setUser }
