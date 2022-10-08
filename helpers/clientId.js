const clientId = (object) => {
  const clientIdObject = { ...object, id: object._id }
  delete clientIdObject._id
  return clientIdObject
}

const mongoId = (object) => {
  if (object.id) {
    const mongoIdObject = { ...object, _id: object.id }
    delete mongoIdObject.id
    return mongoIdObject
  } else return object
}

module.exports = { clientId, mongoId }
