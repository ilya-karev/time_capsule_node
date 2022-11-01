import { createLogger, transports, format } from 'winston';

// create a logger
const logger = createLogger({
  level: 'info',
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true })
      )
    }),
    new transports.File({ filename: 'error.log', level: 'error' })
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'exceptions.log' })
  ]
})

export default logger; 
