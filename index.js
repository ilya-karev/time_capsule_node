const express = require('express')
const mongoose = require('mongoose')
const winston = require('winston')
const cors = require('cors')
const app = express()
require('dotenv').config()

const capsulesRoute = require('./routes/capsules')

const PORT = process.env.PORT || 3000

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// create a logger
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true })
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'exceptions.log' })
  ]
})

// routes
app.use('/api/capsules', capsulesRoute)

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