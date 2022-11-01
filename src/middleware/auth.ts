import { verify } from "jsonwebtoken";
import { get } from 'config';
import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongoose";

const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const token =
    req.body.token || req.query.token || req.headers["x-auth-token"];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const user = verify(token, 'Secret'/* get('PrivateKey')*/) as { _id: ObjectId };
    req.user = user;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

export default verifyToken;