import { NextFunction, Request, Response } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) next();
  else return res.status(401).send("User is not authenticated");
};
