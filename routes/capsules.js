const express = require('express')
const auth = require("../middleware/auth");
const jwt = require('jsonwebtoken');
const { Capsule, validateCapsule } = require('../models/capsules');
const { map, reduce } = require('lodash');

const { User } = require('../models/users');
const correctId = require('../helpers/correctId');

const router = express.Router()

// POST: CREATE A NEW CAPSULE
router.post('/', auth, async (req, res) => {
  const error = await validateCapsule(req.body)
  if (error.message) return res.status(400).send(error.message)

  console.log(jwt.decode(req.headers["x-auth-token"]))

  const capsule = new Capsule({
    content: req.body.content,
    ownerID: jwt.decode(req.headers["x-auth-token"])._id,
    tags: req.body.tags,
    canOpenAt: req.body.canOpenAt,
    createdAt: req.body.createdAt,
  })

  capsule.save().then(capsule => {
    res.send(correctId(capsule))
  }).catch(error => {
    console.log(error)
    res.status(500).send(`Capsule was not created`)
  })
})

// GET CAPSULES
router.get('/', (req, res) => {
  Capsule.find(req.query, '-content')
    .then(async capsules => {
      const ownersIDs = map(capsules, (capsule) => capsule.ownerID)
      const owners = await User.find().where('_id').in(ownersIDs).exec()
      const ownersObject = reduce(owners, (acc, owner) => ({ ...acc, [owner._id]: owner }), {})
      const result = map(capsules, (capsule) => {
        const canBeOpened = new Date(capsule.canOpenAt) <= new Date()
        const capsuleWithNickname = Object.assign({ canBeOpened }, capsule._doc)
        capsuleWithNickname.nickname = ownersObject[capsule.ownerID.toString()].email
        return correctId(capsuleWithNickname)
      })
      res.send(result)
    })
    .catch((error) => {
      res.status(500).send(`something went wrong`)
    })
})

// GET CAPSULE BY ID
router.get(`/:capsuleId`, auth, (req, res) => {
  Capsule.findById(req.params.capsuleId)
    .then(async capsule => {
      const canBeOpened = new Date(capsule.canOpenAt) <= new Date()
      if (capsule) {
        if (canBeOpened) {
          const owner = await User.findById(capsule.ownerID)
          res.send(correctId({ ...capsule._doc, owner, canBeOpened }))
        } else res.status(400).send('It\'s not time yet')
      } else res.status(404).send('Capsule not found')
    })
    .catch((error) => {
      console.log(error.message)
      res.status(500).send(error.message)
    })
})

router.get(`/:capsuleId`, auth, (req, res) => {
  Capsule.findById(req.params.capsuleId)
    .then(capsule => {
      if (capsule) res.send(correctId(capsule))
      res.status(404).send('Capsule not found')
    })
    .catch((error) => {
      res.status(500).send(error.message)
    })
})

module.exports = router
