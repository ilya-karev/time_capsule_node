import { get } from 'config';
import { sign } from 'jsonwebtoken';
import { object, string } from 'yup';
import { compare } from 'bcrypt';
import { pick } from 'lodash';
import { Request, Router } from 'express';

import { User } from '../models/users';
import { clientId } from '../helpers/clientId';
import setError from '../helpers/setError';
import { IUser } from '../types/users';

const router = Router();

router.post('/', async (req: any, res) => {
  try {
    const error = await validateRequest(req.body);
    if (error.message)
      return res.status(400).send(setError(error.message, 400));
    
    let user: IUser | null = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(400).send(setError('User with this email was not registered.', 400));
    else {
      const validPassword = compare(user.password, req.body.password);
      if (!validPassword)
        return res.status(400).send(setError('Incorrect email or password.', 400));
        
      const token = sign({ _id: user._id }, 'Secret', /*get('PrivateKey'),*/ { expiresIn: "1d" });
  
      res.setHeader("Access-Control-Expose-Headers", "x-auth-token");
      res.header('x-auth-token', token).send(clientId(pick(user, ['_id', 'email', 'account'])));
    }
  } catch (err) {
    console.log(err)
  }
});

const validateRequest = async (req: any) => {
  const schema = object().shape({
    email: string().required().email().min(5).max(255),
    password: string().required().min(5).max(255)
  });

  return schema
    .validate(req)
    .then(req => req)
    .catch(error => ({ message: error.message }))
}

export default router; 