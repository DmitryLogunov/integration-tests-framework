import {Request, Response} from 'express';
import path from 'path';
import fs from 'fs';
import {promisify} from 'util';
import mkdirp from 'mkdirp';
import {getLastReport, getReportByID} from '../models/reportsModel';

const mkSubDir = promisify(mkdirp);
const reportsStorage = path.resolve(__dirname + "/../../data/reports");

/**
 * indexConroller
 *
 * @param {Request} express request
 * @param {Response} express response
 */
export const indexController = async (req: Request, res: Response) => {
  if (!fs.existsSync(reportsStorage)) {
    await mkSubDir(reportsStorage);
    res.render('index', {title: 'Tests have not been started yet'});
    return;
  }

  let report = await getLastReport();
  if (typeof req.query.report !== 'undefined') {
    report = await getReportByID(req.query.report);
  }

  if (typeof report === 'undefined') {
    res.render('index', {title: 'Could not find last report'});
    return;
  }

  res.render('index', {title: `Report ${report.datetimeReport}`, reportID: report.reportID});
};

