const { clientId } = require('../../../helpers/clientId');
const { User } = require('../../../models/users');
const { setOwner } = require('./setOwner');

const setCapsule = (capsuleRecord, userId, capsuleOwner) => {
  return new Promise(async (resolve) => {
    let owner = capsuleOwner
    if (!owner) {
      const dataOwner = await User.findById(capsuleRecord.ownerID)
      owner = setOwner(dataOwner)
    }
  
    const capsule = {
      ...capsuleRecord._doc,
      trackersQty: capsuleRecord.trackers?.length || 0,
      isTrackedOn: capsuleRecord.trackers?.includes(userId),
      likesQty: capsuleRecord.likes?.length || 0,
      isLiked: capsuleRecord.likes?.includes(userId),
      owner,
    }
  
    delete capsule.trackers
    delete capsule.likes
    if (new Date(capsule.canOpenAt) > new Date())
      delete capsule.content
  
    resolve(clientId(capsule))
  })
}

module.exports = { setCapsule }