const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcrypt');
const express = require('express');
const _ = require('lodash');
const { User, validateUser, validateUserInfo } = require('../../models/users');
const auth = require("../../middleware/auth");
const { map, pick, findIndex } = require('lodash');
const setError = require('../../helpers/setError');
const { clientId } = require('../../helpers/clientId');
const { Capsule } = require('../../models/capsules');
const { setUser } = require('./helpers/setUser');

const router = express.Router();

// POST: CREATE A NEW USER
router.post('/', async (req, res) => {
  const error = await validateUser(req.body);
  if (error.message)
    return res.status(400).send(setError(error.message, 400))

  const isUserExists = await User.findOne({ email: req.body.email });
  if (isUserExists) {
    return res.status(400).send(setError('That user already exisits!', 400));
  } else {
    const newUser = new User({
      ..._.pick(req.body, ['email', 'password']),
      subscribers: [],
      subscriptions: [],
      tracks: [],
    });
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    await newUser.save();

    const token = jwt.sign({ _id: newUser._id }, config.get('PrivateKey'), { expiresIn: "1d" });

    res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
    res.header('x-auth-token', token).send(clientId(_.pick(newUser, ['_id', 'email'])));
  }
});

// UPDATE USER
router.put('/update', auth, async (req, res) => {
  const error = await validateUserInfo(req.body);
  if (error.message)
    return res.status(400).send(setError(error.message, 400))

  const userInfo = _.pick(req.body, ['account', 'site', 'about'])
  if (userInfo.account) {
    userInfo.account = userInfo.account.toLowerCase()
    const isaccountTaken = await User.findOne({ account: userInfo.account });
    if (isaccountTaken)
      return res.status(400).send(setError('This account is already taken!', 400));
  }

  User.findByIdAndUpdate(req.user._id, userInfo, { returnOriginal: false })
      .then(async user => {
        const userData = await setUser(user, req.user._id)
        res.status(200).send({ message: 'User was successfully updated', status: 200, data: userData })
      })
      .catch(error => res.status(500).send({ message: 'User wasn\'t updated, something went wrong', status: 500, error }))
})

// SUBSCRIBE
router.post('/:userId/track', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  if (req.params.userId === subscriber._id)
    res.status(400).send(setError('You can\'t subscribe on yourself', 400));
  else {
    const isAlreadySubscripted = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
    if (isAlreadySubscripted) {
      res.status(400).send(setError('You have already subscripted to this user', 400));
    } else {
      User.findById(subscriber._id).then(user => {
        user.subscriptions.push(req.params.userId)
        user.save()
      })
      User.findById(req.params.userId).then(async user => {
        user.subscribers.push(subscriber._id)
        user.save()
        const userData = await setUser(user, subscriber._id)
        console.log(userData)
        res.status(200).send({ message: 'You have successfully subscribed', status: 200, data: userData });
      })
    }
  }
})

// UNSUBSCRIBE
router.delete('/:userId/untrack', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  if (req.params.userId === subscriber._id)
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
      User.findById(req.params.userId).then(async user => {
        const subscriberIndex = findIndex(user.subscribers, (subscriber) => subscriber.id === req.params.userId)
        user.subscribers.splice(subscriberIndex, 1)
        user.save()
        const userData = await setUser(user, subscriber._id)
        res.status(200).send({ message: 'You have successfully subscribed', status: 200, data: userData });
      })
    }
  }
})

// IS USER SUBSCRIBED ON
router.get('/:userId/isSubscribed', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  
  User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
    .then((user) => {
      if (user)
        res.status(200).send(true);
      else
        res.status(200).send(false);
    })

})

// GET USERS
router.get('/', auth, (req, res) => {
  User.find()
    .then(users => {
      const activeUser = jwt.decode(req.headers["x-auth-token"])
      res.send(map(users, user => setUser(user, activeUser.id)))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(setError(`something went wrong`, 500))
    })
})

// GET USER BY ID
router.get(`/:userId`, auth, (req, res) => {
  User.findById(req.params.userId)
    .then(async user => {
      if (user) {
        const activeUser = jwt.decode(req.headers["x-auth-token"])
        const result = await setUser(user, activeUser._id)
        res.send(result)
      } else res.status(404).send(setError('User not found', 404))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

module.exports = router;
