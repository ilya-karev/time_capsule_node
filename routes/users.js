const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcrypt');
const express = require('express');
const _ = require('lodash');
const { User, validateUser, validateUserInfo } = require('../models/users');
const auth = require("../middleware/auth");
const { map } = require('lodash');
const setError = require('../helpers/setError');
const { clientId } = require('../helpers/clientId');
const { Capsule } = require('../models/capsules');

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

  const userInfo = _.pick(req.body, ['nickname', 'site', 'about'])
  if (userInfo.nickname) {
    userInfo.nickname = userInfo.nickname.toLowerCase()
    const isNicknameTaken = await User.findOne({ nickname: userInfo.nickname });
    if (isNicknameTaken)
      return res.status(400).send(setError('This nickname is already taken!', 400));
  }

  User.findByIdAndUpdate(req.user._id, userInfo, { returnOriginal: false })
      .then(user => res.status(200).send({ message: 'User was successfully updated', status: 200, data: user }))
      .catch(error => res.status(500).send({ message: 'User wasn\'t updated, something went wrong', status: 500, error }))
})

// SUBSCRIBE
router.post('/:userId/track', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  if (req.params.userId === subscriber._id)
    res.status(400).send(setError('You can\'t subscribe on yourself', 400));
  
  const isAlreadySubscripted = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
  if (isAlreadySubscripted) {
    res.status(400).send(setError('You have already subscripted to this user', 400));
  } else {
    User.findById(subscriber._id).then(user => {
      user.subscriptions.push(req.params.userId)
      user.save()
    })
    User.findById(req.params.userId).then(user => {
      user.subscribers.push(subscriber._id)
      user.save()
    })
    res.status(200).send({ message: 'You have successfully subscribed', status: 200 });
  }
})

// UNSUBSCRIBE
router.delete('/:userId/untrack', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  if (req.params.userId === subscriber._id)
    res.status(400).send(setError('You can\'t unsubscribe from yourself', 400));
  
  const isUserExists = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })

  if (!isUserExists) {
    res.status(400).send(setError('You have not subscripted to this user', 400));
  } else {
    await User.findByIdAndUpdate(req.params.userId, {
        $pull: {
          subscribers: subscriber._id,
        },
    });
    await User.findByIdAndUpdate(subscriber._id, {
        $pull: {
          subscriptions: req.params.userId,
        },
    });
  
    res.status(200).send({ message: 'You have successfully unsubscribed', status: 200 });
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
    .then(users => res.send(map(users, user => clientId(user))))
    .catch((error) => {
      res.status(500).send(setError(`something went wrong`, 500))
    })
})

// GET USER BY ID
router.get(`/:userId`, auth, (req, res) => {
  User.findById(req.params.userId)
    .select('-subscriptions -tracks')
    .then(async user => {
      if (user) {
        const activeUser = jwt.decode(req.headers["x-auth-token"])
        const result = {
          ...user._doc,
          isTrackedOn: user.subscribers.includes(activeUser._id),
          capsulesQty: await Capsule.count({ ownerID: req.params.userId }),
          subscribersQty: user.subscribers?.length,
        }
        delete result.subscribers

        res.send(clientId(result))
      } else res.status(404).send(setError('User not found', 404))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

module.exports = router;
