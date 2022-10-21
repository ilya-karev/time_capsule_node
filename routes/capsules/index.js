const express = require('express')
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { map, reduce, findIndex } = require('lodash');

const auth = require("../../middleware/auth");
const { User } = require('../../models/users');
const { Capsule, validateCapsule } = require('../../models/capsules');
const { clientId, mongoId } = require('../../helpers/clientId');
const setError = require('../../helpers/setError');
const { setCapsule } = require('./helpers/setCapsule');
const { setOwner } = require('./helpers/setOwner');

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

  capsule.save().then(async capsule => {
    const capsuleData = await setCapsule(capsule)
    res.send(capsuleData)
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
      const ownersObject = reduce(owners, (acc, owner) => ({ ...acc, [owner._id]: setOwner(owner) }), {})
      const result = await Promise.all(map(capsules, async (capsuleRecord) => {
        return await setCapsule(capsuleRecord, req.user._id, ownersObject[capsuleRecord.ownerID.toString()])
      }))
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
      const result = await Promise.all(map(capsules, async (capsuleRecord) => {
        return await setCapsule(capsuleRecord, req.user._id, ownersObject[capsuleRecord.ownerID.toString()])
      }))
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
          const result = await setCapsule(capsule, req.user._id, owner)
          res.send(result)
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
router.post('/:capsuleId/track', auth, async (req, res) => {
  const tracker = jwt.decode(req.headers["x-auth-token"])
  
  const isAlreadyTrackeded = await Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
  if (isAlreadyTrackeded) {
    res.status(400).send(setError('You are already track this capsule', 400));
  } else {
    User.findById(tracker._id).then(user => {
      user.tracks.push(req.params.capsuleId)
      user.save()
    })
    Capsule.findById(req.params.capsuleId).then(async capsule => {
      capsule.trackers.push(tracker._id)
      capsule.save()

      const result = await setCapsule(capsule, req.user._id)
      res.status(200).send({ message: 'You are now track this capsule', status: 200, data: result });
    })
  }
})
// UNTRACK CAPSULE
router.delete('/:capsuleId/untrack', auth, async (req, res) => {
  const tracker = jwt.decode(req.headers["x-auth-token"])
  
  const trackedCapsule = await Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
  if (!trackedCapsule) {
    res.status(400).send(setError('You are not track this capsule', 400));
  } else {
    await User.findByIdAndUpdate(tracker._id, {
      $pull: { tracks: req.params.capsuleId }
    });
    
    Capsule.findById(req.params.capsuleId).then(async capsule => {
      const trackerIndex = findIndex(capsule.trackers, (track) => track === tracker._id)
      capsule.trackers.splice(trackerIndex, 1)
      capsule.save()
      
      const result = await setCapsule(capsule, req.user._id)
      res.status(200).send({ message: 'You are not now track this capsule', status: 200, data: result });
    })
  }
})
// IS USER SUBSCRIBED ON CAPSULE
router.get('/:capsuleId/isTracked', auth, async (req, res) => {
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
router.post('/:capsuleId/like', auth, async (req, res) => {
  const liker = jwt.decode(req.headers["x-auth-token"])
  
  try {
    const likedCapsule = await Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
    if (likedCapsule) {
      res.status(400).send(setError('You already liked this capsule', 400));
    } else {
      Capsule.findById(req.params.capsuleId).then(async capsule => {
        capsule.likes.push(liker._id)
        capsule.save()
        
        const dataOwner = await User.findById(capsule.ownerID)
        owner = setOwner(dataOwner)
        console.log({ dataOwner, owner })

        const result = await setCapsule(capsule, req.user._id, owner)
        console.log(result)
        res.status(200).send({ message: 'You liked this capsule', status: 200, data: result });
      }).catch((err) => console.log(err))
    }
  } catch (error) {
    console.log(error)
    res.status(500).send({ message: 'something went wrong', status: 500, error });
  }
})
// UNLIKE CAPSULE
router.delete('/:capsuleId/unlike', auth, async (req, res) => {
  const liker = jwt.decode(req.headers["x-auth-token"])
  
  const likedCapsule = await Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
  if (!likedCapsule) {
    res.status(400).send(setError('You not liked this capsule', 400));
  } else {
    Capsule.findById(req.params.capsuleId).then(async capsule => {
      const likeIndex = findIndex(capsule.likes, (like) => like ===liker._id)
      capsule.likes.splice(likeIndex, 1)
      capsule.save()
      
      const result = await setCapsule(capsule, req.user._id)
      res.status(200).send({ message: 'You unliked this capsule', status: 200, data: result });
    })
  }
})
// IS USER LIKED CAPSULE
router.get('/:capsuleId/isLiked', auth, async (req, res) => {
  const liker = jwt.decode(req.headers["x-auth-token"])
  
  Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
    .then((capsule) => {
      if (capsule) res.status(200).send(true);
      else res.status(200).send(false);
    })
})

module.exports = router
