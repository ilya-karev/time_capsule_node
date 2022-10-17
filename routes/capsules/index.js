const express = require('express')
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { map, reduce } = require('lodash');

const auth = require("../../middleware/auth");
const { User } = require('../../models/users');
const { Capsule, validateCapsule } = require('../../models/capsules');
const { clientId, mongoId } = require('../../helpers/clientId');
const setError = require('../../helpers/setError');
const { setCapsule } = require('./helpers/setCapsule');

const router = express.Router()

// POST: CREATE A NEW CAPSULE
router.post('/', auth, async (req, res) => {
  const error = await validateCapsule(req.body)
  if (error.message) return res.status(400).send(setError(error.message, 400))

  const capsule = new Capsule({
    content: req.body.content,
    ownerID: jwt.decode(req.headers["x-auth-token"])._id,
    tags: map(req.body.tags, (tag) => tag.toLowerCase()),
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
router.get('/', auth, (req, res) => {
  query = _.pick(req.query, ['ownerID', 'status'])
  if (query.status) query.canOpenAt = query.status === 'ready' ? { $lte: new Date() } : { $gte: new Date() }
  delete query.status

  Capsule.find(mongoId(query))
    .then(async capsules => {
      const ownersIDs = map(capsules, (capsule) => capsule.ownerID)
      const owners = await User.find().where('_id').in(ownersIDs).exec()
      const ownersObject = reduce(owners, (acc, owner) => ({ ...acc, [owner._id]: owner }), {})
      const result = map(capsules, (capsuleRecord) => {
        const capsule = setCapsule(capsuleRecord, ownersObject, req.user._id)
        capsule.nickname = ownersObject[capsuleRecord.ownerID.toString()].nickname
        return capsule
      })
      res.send(result)
    })
    .catch((error) => {
      console.log('GET CAPSULES')
      console.log(error)
      res.status(500).send(setError(`something went wrong`, 500))
    })
})

// GET TRACKED CAPSULES
router.get('/tracked', auth, async (req, res) => {
  const user = await User.findById(req.user._id)
  Capsule.find({ '_id': { $in: user.tracks } })
    .then(async capsules => {
      const ownersIDs = map(capsules, (capsule) => capsule.ownerID)
      const owners = await User.find().where('_id').in(ownersIDs).exec()
      const ownersObject = reduce(owners, (acc, owner) => ({ ...acc, [owner._id]: owner }), {})
      const result = map(capsules, (capsuleRecord) => {
        const capsule = setCapsule(capsuleRecord, ownersObject, req.user._id)
        capsule.nickname = ownersObject[capsuleRecord.ownerID.toString()].nickname
        return capsule
      })
      res.send(result)
    })
    .catch((error) => {
      console.log(error)
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
          const result = setCapsule(capsule, owner)
          result.owner = owner
          result.canBeOpened = canBeOpened
          res.send(clientId(result))
        } else res.status(400).send('It\'s not time yet')
      } else res.status(404).send('Capsule not found')
    })
    .catch((error) => {
      console.log('GET CAPSULE BY ID')
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

// TRACK CAPSULE
router.post('/:capsuleId/track', async (req, res) => {
  const tracker = jwt.decode(req.headers["x-auth-token"])
  
  const isAlreadyTrackeded = await Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
  if (isAlreadyTrackeded) {
    res.status(400).send(setError('You are already track this capsule', 400));
  } else {
    User.findById(tracker._id).then(user => {
      user.tracks.push(req.params.capsuleId)
      user.save()
    })
    Capsule.findById(req.params.capsuleId).then(capsule => {
      capsule.trackers.push(tracker._id)
      capsule.save()
    })
    res.status(200).send({ message: 'You are now track this capsule', status: 200 });
  }
})
// UNTRACK CAPSULE
router.delete('/:capsuleId/untrack', async (req, res) => {
  const tracker = jwt.decode(req.headers["x-auth-token"])
  
  const isUserTrack = await Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })

  if (!isUserTrack) {
    res.status(400).send(setError('You are not track this capsule', 400));
  } else {
    await Capsule.findByIdAndUpdate(req.params.capsuleId, {
      $pull: { trackers: tracker._id }
    });
    await User.findByIdAndUpdate(tracker._id, {
      $pull: { tracks: req.params.capsuleId }
    });
  
    res.status(200).send({ message: 'You are not now track this capsule', status: 200 });
  }
})
// IS USER SUBSCRIBED ON CAPSULE
router.get('/:capsuleId/isTracked', async (req, res) => {
  const tracker = jwt.decode(req.headers["x-auth-token"])
  
  Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
    .then((capsule) => {
      if (capsule)
        res.status(200).send(true);
      else
        res.status(200).send(false);
    })
})


// LIKE CAPSULE
router.post('/:capsuleId/like', async (req, res) => {
  const liker = jwt.decode(req.headers["x-auth-token"])
  
  const isAlreadyLiked = await Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
  if (isAlreadyLiked) {
    res.status(400).send(setError('You already liked this capsule', 400));
  } else {
    Capsule.findById(req.params.capsuleId).then(capsule => {
      capsule.likes.push(liker._id)
      capsule.save()
    })
    res.status(200).send({ message: 'You liked this capsule', status: 200 });
  }
})
// UNLIKE CAPSULE
router.delete('/:capsuleId/unlike', async (req, res) => {
  const liker = jwt.decode(req.headers["x-auth-token"])
  
  const isUserLike = await Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })

  if (!isUserLike) {
    res.status(400).send(setError('You not liked this capsule', 400));
  } else {
    await Capsule.findByIdAndUpdate(req.params.capsuleId, {
      $pull: { likes: liker._id }
    });
  
    res.status(200).send({ message: 'You unliked this capsule', status: 200 });
  }
})
// IS USER LIKED CAPSULE
router.get('/:capsuleId/isLiked', async (req, res) => {
  const liker = jwt.decode(req.headers["x-auth-token"])
  
  Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
    .then((capsule) => {
      if (capsule) res.status(200).send(true);
      else res.status(200).send(false);
    })
})

module.exports = router
