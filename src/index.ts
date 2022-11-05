import { get } from 'config';
import express, { json, urlencoded } from 'express';
import { connect } from 'mongoose';
import cors from 'cors';

import commentsRoute from './routes/comments/index';
import capsulesRoute from './routes/capsules/index';
import usersRoute from './routes/users/index';
import authRoute from './routes/auth';
import logger from './helpers/logger';

const app = express()
require('dotenv').config()

// if (!get('PrivateKey')) {
//   console.error('FATAL ERROR: PrivateKey is not defined.');
//   process.exit(1);
// }

const PORT = process.env.PORT || 3000

// middlewares
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(cors())

// routes
app.use('/api/comments', commentsRoute)
app.use('/api/capsules', capsulesRoute)
app.use('/api/users', usersRoute)
app.use('/api/auth', authRoute);

// connect to mongodb atlas
// @ts-ignore
connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(() => logger.log("info", "connected to MongoDB atlas"))
  .catch(error => logger.log("error", error.message))

// start the server
app.listen(PORT, () => logger.log("info", `Server started at PORT ${PORT}`))
