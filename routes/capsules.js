const express = require('express')
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { Capsule, validateCapsule } = require('../models/capsules');
const { map, reduce } = require('lodash');

const auth = require("../middleware/auth");
const { User } = require('../models/users');
const { clientId, mongoId } = require('../helpers/clientId');
const setError = require('../helpers/setError');

const router = express.Router()

// POST: CREATE A NEW CAPSULE
router.post('/', auth, async (req, res) => {
  const error = await validateCapsule(req.body)
  if (error.message) return res.status(400).send(setError(error.message, 400))

  console.log(jwt.decode(req.headers["x-auth-token"]))

  const capsule = new Capsule({
    content: req.body.content,
    ownerID: jwt.decode(req.headers["x-auth-token"])._id,
    tags: req.body.tags,
    canOpenAt: req.body.canOpenAt,
    createdAt: req.body.createdAt,
  })

  capsule.save().then(capsule => {
    res.send(clientId(capsule))
  }).catch(error => {
    console.log(error)
    res.status(500).send(`Capsule was not created`)
  })
})

// GET CAPSULES
router.get('/', (req, res) => {
  Capsule.find(mongoId(_.pick(req.query, ['ownerID'])), '-content')
    .then(async capsules => {
      const ownersIDs = map(capsules, (capsule) => capsule.ownerID)
      const owners = await User.find().where('_id').in(ownersIDs).exec()
      const ownersObject = reduce(owners, (acc, owner) => ({ ...acc, [owner._id]: owner }), {})
      const result = map(capsules, (capsule) => {
        const canBeOpened = new Date(capsule.canOpenAt) <= new Date()
        const capsuleWithNickname = Object.assign({ canBeOpened }, capsule._doc)
        capsuleWithNickname.nickname = ownersObject[capsule.ownerID.toString()].nickname
        return clientId(capsuleWithNickname)
      })
      res.send(result)
    })
    .catch((error) => {
      res.status(500).send(setError(`something went wrong`, 500))
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
          res.send(clientId({ ...capsule._doc, owner, canBeOpened }))
        } else res.status(400).send('It\'s not time yet')
      } else res.status(404).send('Capsule not found')
    })
    .catch((error) => {
      console.log(error.message)
      res.status(500).send(setError(error.message, 500))
    })
})

// router.get(`/:capsuleId`, auth, (req, res) => {
//   Capsule.findById(req.params.capsuleId)
//     .then(capsule => {
//       if (capsule) res.send(clientId(capsule))
//       res.status(404).send('Capsule not found')
//     })
//     .catch((error) => {
//       res.status(500).send(setError(error.message, 500))
//     })
// })

module.exports = router
