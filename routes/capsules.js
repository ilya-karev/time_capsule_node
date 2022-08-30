const express = require('express')
const { Capsule, validateCapsule } = require('../models/capsules')

const router = express.Router()

// POST: CREATE A NEW CAPSULE
router.post('/', async (req, res) => {
  const error = await validateCapsule(req.body)
  console.log('======== ERROR ========')
  console.log(error)
  console.log('======== ERROR ========')
  if (error.message) return res.status(400).send(error.message)

  const capsule = new Capsule({
    content: req.body.content,
    userID: req.body.userID,
    canOpenAt: req.body.canOpenAt,
    createdAt: req.body.createdAt,
  })

  capsule.save().then(capsule => {
    res.send(capsule)
  }).catch(error => {
    console.log(error)
    res.status(500).send("Capsule was not created")
  })
})

module.exports = router
