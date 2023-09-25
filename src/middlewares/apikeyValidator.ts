import { Request, Response, NextFunction } from 'express'; // Import Request, Response, and NextFunction from Express or your specific library if not using Express

const validate = function (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  try {
    const authHeader = (req.headers.authorization || '').split(' ').pop();
    const apikey = req.header('x-api-key');

    if (!authHeader && !apikey) {
      return res.status(401).json({ message: 'UNAUTHORIZED' });
    }

    if (apikey && apikey !== process.env.API_KEY) {
      return res.status(401).json({ message: 'UNAUTHORIZED' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default validate;
