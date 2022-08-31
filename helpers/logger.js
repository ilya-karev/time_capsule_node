const winston = require('winston')

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

module.exports = logger; 
