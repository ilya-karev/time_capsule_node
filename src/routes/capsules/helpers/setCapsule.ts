import { clientId } from '../../../helpers/clientId';
import { User } from '../../../models/users';
import { ICapsule } from '../../../types/capsules';
import { IUser } from '../../../types/users';
import { setOwner } from './setOwner';

// FIX ANY
export const setCapsule = (capsuleRecord: ICapsule, userId?: any, capsuleOwner?: IUser) => {
  return new Promise(async (resolve, reject) => {
    if (!!capsuleRecord) {
      let owner = capsuleOwner
      if (!owner) {
        const dataOwner = await User.findById<IUser>(capsuleRecord.ownerID)
        if (!!dataOwner)
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
      if (!!capsule.canOpenAt && new Date(capsule.canOpenAt) > new Date())
        delete capsule.content
    
      resolve(clientId(capsule))
    } else {
      reject('capsuleRecord was not provided')
    }
  })
}
