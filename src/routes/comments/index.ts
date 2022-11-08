import { Router } from 'express';
import { MongooseError } from 'mongoose';
import { get, map, pick } from 'lodash';

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
  
  console.log({ body: req.body })

  // FIX ANY
  const newComment = {
    text: req.body.text,
    capsuleID: req.body.capsuleID,
    owner: {
      id: owner._id,
      account: owner.account,
    },
    createdAt: new Date(),
  } as any
  if (get(req, 'body.reply.owner.id'))
    newComment.reply = req.body.reply

  const comment: any = new Comment(newComment)
  comment.save()
    .then(async (comment: IComment) => {
      const result = pick(comment._doc, ['_id', 'text', 'capsuleID', 'createdAt','owner']) as IComment
      if (get(comment, '_doc.reply.owner.id'))
        result.reply = comment.reply
      res.send(clientId(result))
    })
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
      const result = map(comments, comment => {
        const result = pick(comment._doc, ['_id', 'text', 'capsuleID', 'createdAt','owner']) as IComment
        if (get(comment, '_doc.reply.owner.id'))
          result.reply = comment.reply
        return clientId(result)
      })
      res.send(result)
    })
    .catch((error) => {
      console.log('GET COMMENTS')
      console.log(error)
      res.status(500).send(setError(error.message, 500))
    })
})

export default router
