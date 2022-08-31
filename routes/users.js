const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcrypt');
const express = require('express');
const _ = require('lodash');
const { User, validateUser } = require('../models/users');
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
    const newUser = new User(_.pick(req.body, ['email', 'password']));
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    await newUser.save();

    const token = jwt.sign({ _id: newUser._id }, config.get('PrivateKey'));
    res.header('x-auth-token', token).send(_.pick(newUser, ['_id', 'email']));
  }
});

module.exports = router;
