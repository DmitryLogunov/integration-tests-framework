import {Request, Response} from 'express';
import childProcess from 'child_process';
import dateFormat from 'dateformat';
import * as logger from '../../lib/components/logger';
import stackTrace from 'stack-trace';

/**
 * runConroller
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const runController = async (req: Request, res: Response) => {
  const reportID = dateFormat(new Date(), 'yyyy-mm-dd_HH-MM-ss');

  childProcess.exec(`yarn test all ${reportID}`, (error, stdout, stderr) => {
    logger.info('Tests have finished', {reportID}, stackTrace.get());
    res.status(200).send(reportID);
  });
};
