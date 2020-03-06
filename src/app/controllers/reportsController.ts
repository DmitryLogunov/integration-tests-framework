import {Request, Response} from 'express';
import {getAllReports} from '../models/reportsModel';

/**
 * reportsConroller
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const reportsController = async (req: Request, res: Response) => {
  res.render('reports', {reports: await getAllReports()});
};
