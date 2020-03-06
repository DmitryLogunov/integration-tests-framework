import {Request, Response} from 'express';

/**
 * 404Controller
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const _404Controller = async (req: Request, res: Response) => {
  res.render('_404'); 
};
