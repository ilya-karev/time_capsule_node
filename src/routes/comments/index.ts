import { Router } from 'express';
import { MongooseError } from 'mongoose';
import { map } from 'lodash';

import auth from "../../middleware/auth";
import { Comment, validateComment } from '../../models/comments';
import { clientId } from '../../helpers/clientId';
import setError from '../../helpers/setError';
import { IComment } from '../../types/comments';
import { User } from '../../models/users';

const router = Router()

// POST: CREATE A NEW COMMENT
router.post('/', auth, async (req: any, res) => {
  const error = await validateComment(req.body)
  if (error.message) return res.status(400).send(setError(error.message, 400))

  const owner = await User.findById(req.user._id)

  // FIX ANY
  const comment: any = new Comment({
    capsuleID: req.body.capsuleID,
    owner: {
      id: owner._id,
      account: owner.account,
    },
    text: req.body.text,
    createdAt: new Date(),
    replyToID: req.body.replyToID,
  })

  comment.save()
    .then(async (comment: IComment) => res.send(comment))
    .catch((error: MongooseError) => {
      console.log('CREATE A NEW COMMENT')
      console.log(error)
      res.status(500).send(`Comment was not created`)
    })
})

// GET COMMENTS
router.get('/', auth, (req: any, res) => {
  const capsuleID = req.query.capsuleID

  Comment.find<IComment>({ capsuleID })
    .then(async comments => {
      const result = map(comments, comment => clientId(comment._doc))
      res.send(result)
    })
    .catch((error) => {
      console.log('GET COMMENTS')
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

export default router
