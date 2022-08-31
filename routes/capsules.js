const express = require('express')
const { Capsule, validateCapsule } = require('../models/capsules')
const router = express.Router()

// POST: CREATE A NEW CAPSULE
router.post('/', async (req, res) => {
  const error = await validateCapsule(req.body)
  if (error.message) return res.status(400).send(error.message)

  const capsule = new Capsule({
    content: req.body.content,
    ownerID: req.body.ownerID,
    tags: req.body.tags,
    canOpenAt: req.body.canOpenAt,
    createdAt: req.body.createdAt,
  })

  capsule.save().then(capsule => {
    res.send(capsule)
  }).catch(error => {
    console.log(error)
    res.status(500).send(`Capsule was not created`)
  })
})

// GET CAPSULES
router.get('/', (req, res) => {
  Capsule.find()
    .then(capsules => res.send(capsules))
    .catch((error) => {
      res.status(500).send(`something went wrong`)
    })
})

// GET CAPSULE BY ID
router.get(`/:capsuleId`, (req, res) => {
  Capsule.findById(req.params.capsuleId)
    .then(capsule => {
      if (capsule) res.send(capsule)
      res.status(404).send('Capsule not found')
    })
    .catch((error) => {
      res.status(500).send(error.message)
    })
})

module.exports = router
