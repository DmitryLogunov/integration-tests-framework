import {Request, Response} from 'express';

const path = require('path');
const fs = require('fs');

/**
 * showReportConroller
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const showReportController = async (req: Request, res: Response) => {
  if (typeof req.query.report === 'undefined') {
    res.status(501).send("There is not defined report identificator.");
    return;
  }

  const reportFolder = req.query.report;
  const dirName = path.resolve(__dirname + `/../../data/reports/${reportFolder}`);

  if (fs.existsSync(dirName) && fs.lstatSync(dirName).isDirectory()) {
    res.status(200).sendFile(`${dirName}/report.html`);
  } else {
    res.status(502).send("The report identificator is wrong.");
  }
};
