const express = require('express')
const Capsule = require('../models/capsules')

const router = express.Router()

// POST: CREATE A NEW CAPSULE
router.post('/', (req, res) => {
  console.log('======== BODY ========')
  console.log(req.body)
  console.log('======== BODY ========')
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
