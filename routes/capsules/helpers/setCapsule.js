const { clientId } = require('../../../helpers/clientId');

const setCapsule = (capsuleRecord, ownersObject, userId) => {
  const capsule = {
    ...capsuleRecord._doc,
    trackersQty: capsuleRecord.trackers?.length || 0,
    isTrackedOn: capsuleRecord.trackers?.includes(userId),
    likesQty: capsuleRecord.likes?.length || 0,
    isLiked: capsuleRecord.likes?.includes(userId),
  }

  delete capsule.trackers
  delete capsule.likes
  if (new Date(capsule.canOpenAt) > new Date())
    delete capsule.content

  return clientId(capsule)
}

module.exports = { setCapsule }