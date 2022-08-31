const config = require('config');
const express = require('express')
const mongoose = require('mongoose')
const logger = require('./helpers/logger')
const cors = require('cors')
const app = express()
require('dotenv').config()

if (!config.get('PrivateKey')) {
  console.error('FATAL ERROR: PrivateKey is not defined.');
  process.exit(1);
}

const capsulesRoute = require('./routes/capsules')
const usersRoute = require('./routes/users');
const authRoute = require('./routes/auth');

const PORT = process.env.PORT || 3000

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// routes
app.use('/api/capsules', capsulesRoute)
app.use('/api/users', usersRoute)
app.use('/api/auth', authRoute);

// connect to mongodb atlas
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(() => {
    logger.log("info", "connected to MongoDB atlas")
  })
  .catch(error => {
    logger.log("error", error.message)
  })

// start the server
app.listen(PORT, () => {
  logger.log("info", `Server started at PORT ${PORT}`)
})
