import { reduce } from "lodash"
import { Comment } from "../../../models/comments"
import { User } from "../../../models/users"
import { ICapsule } from "../../../types/capsules"
import { IComment } from "../../../types/comments"
import { IUser } from "../../../types/users"
import { setOwner } from "./setOwner"

type IOwnersAndComments = {
  ownersObject: any
  commentsObject: any
}
const getOwnersAndComments = (capsules: ICapsule[]): Promise<IOwnersAndComments> => {
  return new Promise(async (res) => {
    const { ownersIDs, capsulesIDs } = reduce(capsules, (acc, capsule) => {
      acc.ownersIDs.push(capsule.ownerID)
      acc.capsulesIDs.push(capsule._id)
      return acc
    }, { ownersIDs: [], capsulesIDs: [] })
    const owners = await User.find<IUser>().where('_id').in(ownersIDs).exec()
    const comments = await Comment.find<IComment>().where('capsuleID').in(capsulesIDs).exec()
    console.log(comments)
    // FIX ANY
    const ownersObject: any = reduce(owners, (acc, owner) => ({ ...acc, [owner._id.toString()]: setOwner(owner) }), {})
    const commentsObject: any = reduce(comments, (acc, comment) => {
      return {
        ...acc,
        [comment.capsuleID.toString()]: acc[comment.capsuleID.toString()] ? acc[comment.capsuleID.toString()] + 1 : 1
      }
    }, {})
    res({ ownersObject, commentsObject })
  })
}

export default getOwnersAndComments
