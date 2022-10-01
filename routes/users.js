const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcrypt');
const express = require('express');
const _ = require('lodash');
const { User, validateUser } = require('../models/users');
const auth = require("../middleware/auth");

const router = express.Router();

// POST: CREATE A NEW USER
router.post('/', async (req, res) => {
  const error = await validateUser(req.body);
  if (error.message)
    return res.status(400).send(error.message)

  const isUserExists = await User.findOne({ email: req.body.email });
  if (isUserExists) {
    return res.status(400).send('That user already exisits!');
  } else {
    const newUser = new User({
      ..._.pick(req.body, ['email', 'password']),
      subscribers: [],
      subscriptions: [],
    });
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    await newUser.save();

    const token = jwt.sign({ _id: newUser._id }, config.get('PrivateKey'), { expiresIn: "1d" });

    res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
    res.header('x-auth-token', token).send(_.pick(newUser, ['_id', 'email']));
  }
});

// SUBSCRIBE
router.post('/:userId/subscribe', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  
  const isAlreadySubscripted = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
  if (isAlreadySubscripted) {
    res.status(400).send('You have already subscripted to this user');
  } else {
    User.findById(subscriber._id).then(user => {
      user.subscriptions.push(req.params.userId)
      user.save()
    })
    User.findById(req.params.userId).then(user => {
      user.subscribers.push(subscriber._id)
      user.save()
    })
    res.status(200).send('You have successfully subscribed');
  }
})

// UNSUBSCRIBE
router.delete('/:userId/unsubscribe', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  
  const isUserExists = await User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })

  if (!isUserExists) {
    res.status(400).send('You have not subscripted to this user');
  } else {
    console.log(isUserExists)
    console.log(req.params.userId)
    console.log(subscriber._id)
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
  
    res.status(200).send('You have successfully unsubscribed');
  }
})

// IS USER SUBSCRIBED ON
router.get('/:userId/isSubscribed', async (req, res) => {
  const subscriber = jwt.decode(req.headers["x-auth-token"])
  
  User.findOne({ _id: req.params.userId, subscribers: { $all : [subscriber._id] } })
    .then((user) => {
      console.log(user)
      if (user)
        res.status(200).send(true);
      else
        res.status(200).send(false);
    })

})

// GET USERS
router.get('/', auth, (req, res) => {
  User.find()
    .then(users => res.send(users))
    .catch((error) => {
      res.status(500).send(`something went wrong`)
    })
})

// GET USER BY ID
router.get(`/:userId`, auth, (req, res) => {
  User.findById(req.params.userId)
    .then(user => {
      if (user) res.send(user)
      else res.status(404).send('User not found')
    })
    .catch((error) => {
      res.status(500).send(error.message)
    })
})

module.exports = router;