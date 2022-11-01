import { sign } from 'jsonwebtoken';
import { get } from 'config';
import { genSalt, hash } from 'bcrypt';
import { Router } from 'express';
import { User, validateUser, validateUserInfo } from '../../models/users';
import auth from "../../middleware/auth";
import { map, pick, findIndex } from 'lodash';
import setError from '../../helpers/setError';
import { clientId } from '../../helpers/clientId';
import { setUser } from './helpers/setUser';
import { IUser } from '../../types/users';

const router = Router();

// POST: CREATE A NEW USER
router.post('/', async (req: any, res) => {
  const error = await validateUser(req.body);
  if (error.message)
    return res.status(400).send(setError(error.message, 400))

  const isUserExists = await User.findOne({ email: req.body.email });
  if (isUserExists) {
    return res.status(400).send(setError('That user already exisits!', 400));
  } else {
    const newUser = new User({
      email: req.body.email,
      subscribers: [],
      subscriptions: [],
      tracks: [],
    });
    const salt = await genSalt(10);
    newUser.password = await hash(req.body.password, salt);
    await newUser.save();
    const token = sign({ _id: newUser._id }, 'Secret'/* get('PrivateKey')*/);

    res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
    res.header('x-auth-token', token).send(clientId(pick(newUser, ['_id', 'email'])));
  }
});

// UPDATE USER
router.put('/update', auth, async (req: any, res) => {
  const error = await validateUserInfo(req.body);
  if (error.message)
    return res.status(400).send(setError(error.message, 400))

  const userInfo = pick(req.body, ['account', 'site', 'about'])
  if (userInfo.account) {
    userInfo.account = userInfo.account.toLowerCase()
    const isaccountTaken = await User.findOne({ account: userInfo.account });
    if (isaccountTaken)
      return res.status(400).send(setError('This account is already taken!', 400));
  }

  User.findByIdAndUpdate<IUser>(req.user?._id, userInfo, { returnOriginal: false })
      .then(async user => {
        if (!!user) {
          const userData = await setUser(user, req.user?._id)
          res.status(200).send({ message: 'User was successfully updated', status: 200, data: userData })
        }
      })
      .catch(error => res.status(500).send({ message: 'User wasn\'t updated, something went wrong', status: 500, error }))
})

// SUBSCRIBE
router.post('/:userId/track', auth, async (req: any, res) => {
  const subscriber = req.user;
  if (req.params.userId === subscriber._id.toString())
    res.status(400).send(setError('You can\'t subscribe on yourself', 400));
  else {
    const isAlreadySubscripted = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
    if (isAlreadySubscripted) {
      res.status(400).send(setError('You have already subscripted to this user', 400));
    } else {
      let respopnseWasSent = false
      User.findById(subscriber._id).then(user => {
        if (!!user) {
          user.subscriptions.push(req.params.userId)
          user.save()
        } else if (!respopnseWasSent) {
          respopnseWasSent = true;
          res.status(400).send(setError('Your account was not found', 400));
        }
      })
      User.findById<IUser>(req.params.userId).then(async user => {
        if (!!user) {
          user.subscribers.push(subscriber._id)
          user.save()
          const userData = await setUser(user, subscriber._id)
          console.log(userData)
          res.status(200).send({ message: 'You have successfully subscribed', status: 200, data: userData });
        } else if (!respopnseWasSent) {
          respopnseWasSent = true;
          res.status(400).send(setError('User to subscribe was not found', 400));
        }
      })
    }
  }
})

// UNSUBSCRIBE
router.delete('/:userId/untrack', auth, async (req: any, res) => {
  const subscriber = req.user;
  if (req.params.userId === subscriber._id.toString())
    res.status(400).send(setError('You can\'t unsubscribe from yourself', 400));
  else {
    const isUserExists = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })

    if (!isUserExists) {
      res.status(400).send(setError('You have not subscripted to this user', 400));
    } else {
      await User.findByIdAndUpdate(subscriber._id, {
          $pull: {
            subscriptions: req.params.userId,
          },
      });
      User.findById<IUser>(req.params.userId).then(async user => {
        if (!!user) {
          const subscriberIndex = findIndex(user.subscribers, (subscriberId) => subscriberId.toString() === req.params.userId)
          user.subscribers.splice(subscriberIndex, 1)
          user.save()
          const userData = await setUser(user, subscriber._id)
          res.status(200).send({ message: 'You have successfully subscribed', status: 200, data: userData });
        } else {
          res.status(400).send(setError('User was not found', 400));
        }
      })
    }
  }
})

// IS USER SUBSCRIBED ON
router.get('/:userId/isSubscribed', auth, async (req: any, res) => {
  const subscriber = req.user;
  
  User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
    .then((user) => {
      if (user)
        res.status(200).send(true);
      else
        res.status(200).send(false);
    })
})

// GET USERS
router.get('/', auth, (req: any, res) => {
  const activeUser = req.user;

  User.find<IUser>()
    .then(users => {
      res.send(map(users, user => setUser(user, activeUser._id)))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(setError(`something went wrong`, 500))
    })
})


// GET USERS SUBSCRIBED ON
router.get('/subscribedOn', auth, async (req: any, res) => {
  const activeUser = await User.findById<IUser>(req.user?._id)
  User.find<IUser>({ '_id': { $in: activeUser?.subscriptions } })
    .then(async users => {
      if (!!activeUser) {
        const usersData = await Promise.all(map(users, async user => await setUser(user, activeUser._id, true)))
        res.send(usersData)
      } else res.status(404).send(setError('Your account was not found', 404))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

// GET USER BY ID
router.get(`/:userId`, auth, (req: any, res) => {
  const activeUser = req.user;

  User.findById<IUser>(req.params.userId)
    .then(async user => {
      if (user) {
        const result = await setUser(user, activeUser._id)
        res.send(result)
      } else res.status(404).send(setError('User not found', 404))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

export default router;
