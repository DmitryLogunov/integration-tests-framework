import _ from 'lodash';
import path from 'path';

import * as logger from '../../lib/components/logger';
import stackTrace from 'stack-trace';

import fs from 'fs';
import {promisify} from 'util';
import {formatReportID, printSpaceIfZero} from './helpers/reports';

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const reportsStorage = path.resolve(__dirname + "/../../data/reports");
/**
 * getAllreports() - get all reports
 *
 * @return {Promise<Array<ReportInterface>>} , array of objects with report params:
 *   {reportID<String>, datetimeReport<String>, passed<String>, failed<String>, summary<String>}
 */
export const getAllReports = async (): Promise<Array<object>> => {
  let reportsIDs = await readDir(reportsStorage);
  reportsIDs = _.chain(reportsIDs).sortBy().reverse().value();

  const reports: Array<object> =
    await Promise.all(
      _.map(reportsIDs, async (reportID: string) => {
        const resultsReport: ResultsReportInterface = await getResultsReport(reportID);
        return <ReportInterface>{reportID, datetimeReport: formatReportID(reportID), ...resultsReport}
      })
    );

  return reports;
};

/**
 * getLastReport() - get last report
 *
 * @return {Promise<ReportInterface>} - {reportID<String>, datetimeReport<String>, passed<String>, failed<String>, summary<String>}
 */
export const getLastReport = async (): Promise<ReportInterface> => {
  const reports = await getAllReports();
  return <ReportInterface>(reports[0]);
};

/**
 * getReportParamsByID() - get report by ID
 *
 * @param {String} reportID - report ID in format 'YYYY-MM-DD_ hh-mm-ss'
 * @return {Promise<ReportInterface>} - {reportID<String>, datetimeReport<String>, passed<String>, failed<String>, summary<String>}
 */
export const getReportByID = async (reportID: string): Promise<ReportInterface> => {
  const resultsReport = await getResultsReport(reportID);
  return <ReportInterface>{reportID, datetimeReport: formatReportID(reportID), ...resultsReport};
};

/**
 * getResultsReport(reportID) - returns object with numbers of passed/failed/summary report features
 *
 * @param {String} reportID - report ID in format 'YYYY-MM-DD_ hh-mm-ss'
 * @return {Promise<ResultsReportInterface>} - { passed<String>, failed<String>, summary<String> }
 */
export const getResultsReport = async (reportID: string): Promise<ResultsReportInterface> => {
  try {
    if (!fs.existsSync(`${reportsStorage}/${reportID}/report.json`)) {
      logger.warn('Json report file does not exist', {reportID}, stackTrace.get());
      return <ResultsReportInterface>{passed: '', failed: '', summary: ''};
    }

    const report = JSON.parse(await readFile(`${reportsStorage}/${reportID}/report.json`, 'utf-8'));
    const reportStepsResults = _.flatten(_.map(report, (feature: FeatureInterface) => {
      return _.map(feature.elements, (element: ElementStepsInterface) => {
        return {
          id: element.id,
          statuses: _.map(element.steps, (step: FeatureStepInterface) => {
            return step.result.status;
          })
        };
      });
    }));

    const passedFeatures = _.filter(reportStepsResults, (featureElement: FeatureElementInterface) => {
      return _.filter(featureElement.statuses, (status: string) => {
        return status === 'failed'
      }).length === 0;
    });

    const failedFeatures = _.filter(reportStepsResults, (featureElement: FeatureElementInterface) => {
      return _.filter(featureElement.statuses, (status: string) => {
        return status === 'failed'
      }).length > 0;
    });

    return {
      passed: printSpaceIfZero(passedFeatures.length),
      failed: printSpaceIfZero(failedFeatures.length),
      summary: printSpaceIfZero(passedFeatures.length + failedFeatures.length)
    };
  } catch (error) {
    logger.warn('Could not parse report json', {reportID}, stackTrace.get());
    return <ResultsReportInterface>{passed: '', failed: '', summary: ''};
  }
};
