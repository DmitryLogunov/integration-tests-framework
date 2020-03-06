import {Request, Response} from 'express';

/**
 * startTestsController
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const startTestsController = async (req: Request, res: Response) => {
  res.render('start-tests');
};
