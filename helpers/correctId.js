const correctId = (object) => {
  const correctIdObject = { ...object, id: object._id }
  delete correctIdObject._id
  return correctIdObject
}

module.exports = correctId; 
