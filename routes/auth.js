const config = require('config');
const jwt = require('jsonwebtoken');
const yup = require('yup')
const bcrypt = require('bcrypt');
const _ = require('lodash');
const { User } = require('../models/users');
const express = require('express');
const { clientId } = require('../helpers/clientId');
const setError = require('../helpers/setError');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const error = await validateRequest(req.body);
    if (error.message)
      return res.status(400).send(setError(error.message, 400));
    
    let user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(400).send(setError('Incorrect email or password.', 400));
  
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword)
      return res.status(400).send(setError('Incorrect email or password.', 400));
      
    const token = jwt.sign({ _id: user._id }, config.get('PrivateKey'), { expiresIn: "1d" });

    res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
    res.header('x-auth-token', token).send(clientId(_.pick(user, ['_id', 'email', 'account'])));
  } catch (err) {
    console.log(err)
  }
});

const validateRequest = async (req) => {
  const schema = yup.object().shape({
    email: yup.string().required().email().min(5).max(255),
    password: yup.string().required().min(5).max(255)
  });

  return schema
    .validate(req)
    .then(req => req)
    .catch(error => ({ message: error.message }))
}

module.exports = router; 