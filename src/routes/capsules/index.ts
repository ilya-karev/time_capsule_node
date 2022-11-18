import { Router } from 'express';
import { pick } from 'lodash';
import { map, findIndex } from 'lodash';

import auth from "../../middleware/auth";
import { User } from '../../models/users';
import { Capsule, validateCapsule } from '../../models/capsules';
import { mongoId } from '../../helpers/clientId';
import setError from '../../helpers/setError';
import { setCapsule } from './helpers/setCapsule';
import { setOwner } from './helpers/setOwner';
import { ICapsule } from '../../types/capsules';
import { IUser } from '../../types/users';
import { MongooseError } from 'mongoose';
import getOwnersAndComments from './helpers/getOwnersAndComments';

const router = Router()

// POST: CREATE A NEW CAPSULE
router.post('/', auth, async (req: any, res) => {
  const creator = req.user;

  const error = await validateCapsule(req.body)
  if (error.message) return res.status(400).send(setError(error.message, 400))

  // FIX ANY
  const capsule: any = new Capsule({
    content: req.body.content,
    ownerID: creator._id,
    tags: map(req.body.tags, (tag) => tag.toLowerCase()),
    canOpenAt: req.body.canOpenAt,
    createdAt: req.body.createdAt,
  })

  capsule.save().then(async (capsule: ICapsule) => {
    const capsuleData = await setCapsule({ capsuleRecord: capsule })
    res.send(capsuleData)
  }).catch((error: MongooseError) => {
    console.log(error)
    res.status(500).send(`Capsule was not created`)
  })
})

// GET CAPSULES
router.get('/', auth, (req: any, res) => {
  const query: any = pick(req.query, ['ownerID', 'status'])
  if (query.status) query.canOpenAt = query.status === 'ready' ? { $lte: new Date() } : { $gte: new Date() }
  delete query.status

  Capsule.find<ICapsule>(mongoId(query))
    .then(async capsules => {
      const { ownersObject, commentsObject } = await getOwnersAndComments(capsules)
      // console.log({ ownersObject, commentsObject })
      const result = await Promise.all(map(capsules, async (capsuleRecord: ICapsule) => {
        if (!!capsuleRecord)
          return await setCapsule({
            capsuleRecord,
            userId: req.user._id,
            capsuleOwner: ownersObject[capsuleRecord.ownerID.toString()], 
            commentsQty: commentsObject[capsuleRecord._id.toString()],
          })
      }))
      res.send(result)
    })
    .catch((error) => {
      console.log('GET CAPSULES')
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

// GET TRACKED CAPSULES
router.get('/tracked', auth, async (req: any, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(400).send({ message: 'Capsule was not found', status: 400 });
  } else {
    Capsule.find<ICapsule>({ '_id': { $in: user.tracks } })
      .then(async capsules => {
        const { ownersObject, commentsObject } = await getOwnersAndComments(capsules)
        // console.log({ ownersObject, commentsObject })
        const result = await Promise.all(map(capsules, async capsuleRecord => {
          return await setCapsule({
            capsuleRecord,
            userId: req.user._id,
            capsuleOwner: ownersObject[capsuleRecord?.ownerID.toString()],
            commentsQty: commentsObject[capsuleRecord._id.toString()],
          })
        }))
        res.send(result)
      })
      .catch((error) => {
        console.log(error)
        res.status(500).send(setError(error.message, 500))
      })
  }
})

// GET CAPSULE BY ID
router.get(`/:capsuleId`, auth, (req: any, res) => {
  Capsule.findById(req.params.capsuleId)
    .then(async (capsule: any) => {
      if (!!capsule) {
        const canBeOpened = new Date(capsule.canOpenAt) <= new Date()
        if (canBeOpened) {
          const owner = await User.findById<IUser>(capsule.ownerID)
          if (!!owner) {
            const result = await setCapsule({
              capsuleRecord: capsule, 
              userId: req.user._id, 
              capsuleOwner: owner
            })
            res.send(result)
          }
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
router.post('/:capsuleId/track', auth, async (req: any, res) => {
  const tracker = req.user;
  
  const isAlreadyTrackeded = await Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
  if (isAlreadyTrackeded) {
    res.status(400).send(setError('You are already track this capsule', 400));
  } else {
    let responseWasSent = false
    User.findById(tracker._id).then(user => {
      if (!!user) {
        user.tracks.push(req.params.capsuleId)
        user.save()
      } else if (!responseWasSent) {
        responseWasSent = true
        res.status(400).send({ message: 'User was not found', status: 400 });
      }
    })
    Capsule.findById<ICapsule>(req.params.capsuleId).then(async capsule => {
      if (!!capsule) {
        capsule.trackers.push(tracker._id)
        capsule.save()
        const result = await setCapsule({
          capsuleRecord: capsule,
          userId: req.user._id
        })
        if (!responseWasSent)
          res.status(200).send({ message: 'You are now track this capsule', status: 200, data: result });
      } else if (!responseWasSent) {
        responseWasSent = true
        res.status(400).send({ message: 'Capsule was not found', status: 400 });
      }
    })
  }
})
// UNTRACK CAPSULE
router.delete('/:capsuleId/untrack', auth, async (req: any, res) => {
  const tracker = req.user;
  
  const trackedCapsule = await Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
  if (!trackedCapsule) {
    res.status(400).send(setError('You are not track this capsule', 400));
  } else {
    await User.findByIdAndUpdate(tracker._id, {
      $pull: { tracks: req.params.capsuleId }
    });
    
    Capsule.findById<ICapsule>(req.params.capsuleId).then(async capsule => {
      if (!!capsule) {
        const trackerIndex = findIndex(capsule.trackers, (track) => track === tracker._id)
        capsule.trackers.splice(trackerIndex, 1)
        capsule.save()
        
        const result = await setCapsule({
          capsuleRecord: capsule,
          userId: req.user._id
        })
        res.status(200).send({ message: 'You are not now track this capsule', status: 200, data: result });
      } else {
        res.status(400).send({ message: 'Capsule was not found', status: 400 });
      }
    })
  }
})
// IS USER SUBSCRIBED ON CAPSULE
router.get('/:capsuleId/isTracked', auth, async (req: any, res) => {
  const tracker = req.user;
  
  Capsule.findOne({ _id: req.params.capsuleId, trackers: { $all : [tracker._id] } })
    .then((capsule) => {
      if (capsule)
        res.status(200).send(true);
      else
        res.status(200).send(false);
    })
})


// LIKE CAPSULE
router.post('/:capsuleId/like', auth, async (req: any, res) => {
  const liker = req.user;
  
  try {
    const likedCapsule = await Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
    if (likedCapsule) {
      res.status(400).send(setError('You already liked this capsule', 400));
    } else {
      Capsule.findById<ICapsule>(req.params.capsuleId).then(async capsule => {
        if (!!capsule) {
          capsule.likes.push(liker._id)
          capsule.save()
          
          const dataOwner = await User.findById<IUser>(capsule.ownerID)
          if (!!dataOwner) {
            const owner = setOwner(dataOwner)
            const result = await setCapsule({
              capsuleRecord: capsule,
              userId: req.user._id,
              capsuleOwner: owner
            })
            console.log(result)
            res.status(200).send({ message: 'You liked this capsule', status: 200, data: result });
          } else {
            res.status(400).send({ message: 'User was not found', status: 400 });
          }
        } else {
          res.status(400).send({ message: 'Capsule was not found', status: 400 });
        }
      }).catch((err) => console.log(err))
    }
  } catch (error) {
    console.log(error)
    res.status(500).send({ message: 'something went wrong', status: 500, error });
  }
})
// UNLIKE CAPSULE
router.delete('/:capsuleId/unlike', auth, async (req: any, res) => {
  const liker = req.user;
  
  const likedCapsule = await Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
  if (!likedCapsule) {
    res.status(400).send(setError('You not liked this capsule', 400));
  } else {
    Capsule.findById<ICapsule>(req.params.capsuleId).then(async capsule => {
      if (!!capsule) {
        const likeIndex = findIndex(capsule.likes, (like) => like === liker._id)
        capsule.likes.splice(likeIndex, 1)
        capsule.save()
        
        const result = await setCapsule({
          capsuleRecord: capsule,
          userId: req.user._id
        })
        res.status(200).send({ message: 'You unliked this capsule', status: 200, data: result });
      } else 
        res.status(400).send({ message: 'Capsule wasn\'t found', status: 400 });
    })
  }
})
// IS USER LIKED CAPSULE
router.get('/:capsuleId/isLiked', auth, async (req: any, res) => {
  const liker = req.user;
  
  Capsule.findOne({ _id: req.params.capsuleId, likes: { $all : [liker._id] } })
    .then((capsule) => {
      if (capsule) res.status(200).send(true);
      else res.status(200).send(false);
    })
})

export default router
