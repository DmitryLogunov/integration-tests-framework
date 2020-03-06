/**
 * formatReportID(reportID) - returns the report ID (same report folder) in format 'YYYY/MM/DD hh:mm:ss'
 *
 * @param {String} - reportID, 'YYYY-MM-DD_hh-mm-ss'
 * @return {String} - datetimeReport, 'YYYY/MM/DD hh:mm:ss'
 */
export const formatReportID = (reportID: string): string => {
  let datetimeReport = '';
  if (reportID !== '') {
    let [dateReport, timeReport] = reportID.split('_');
    if (typeof dateReport !== 'undefined') {
      dateReport = dateReport.replace(/\-/g, '/');
    }
    if (typeof timeReport !== 'undefined') {
      timeReport = timeReport.replace(/\-/g, ':');
    }
    datetimeReport = `${dateReport} ${timeReport}`;
  }

  return datetimeReport;
};

/**
 * printSpaceIfZero(number) - returns number or '' (if number == 0)
 *
 * @params {Integer} number
 * @return {String}
 */
export const printSpaceIfZero = (number: number): string => {
  return number === 0 ? '' : number.toString();
};

