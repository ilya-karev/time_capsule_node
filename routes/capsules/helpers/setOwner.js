const { pick } = require("lodash")
const { clientId } = require("../../../helpers/clientId")

const setOwner = (owner) => clientId(pick(owner, ['account', 'site', 'about', '_id']))

module.exports = { setOwner }