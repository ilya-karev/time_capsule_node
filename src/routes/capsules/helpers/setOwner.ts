import { pick } from "lodash"
import { clientId } from "../../../helpers/clientId"
import { IUser } from "../../../types/users"

export const setOwner = (owner: IUser) => clientId(pick(owner, ['account', 'site', 'about', '_id']))
