import {Request, Response} from 'express';
import path from 'path';

/**
 * assetsController
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const assetsController = async (req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname + '/../views/' + req.url));
};
