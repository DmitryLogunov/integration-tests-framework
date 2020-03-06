import reporter from 'cucumber-html-reporter';
import dateFormat from 'dateformat';

const nowDateTime = dateFormat(new Date(), 'yyyy-mm-dd_HH-MM-ss');
const defaultReportFolder = `./data/reports/${nowDateTime}`;

const options = {
  theme: 'bootstrap',
  jsonFile: process.argv[2] || `${defaultReportFolder}/report.json`,
  output: process.argv[3] || `${defaultReportFolder}/report.html`,
  reportSuiteAsScenarios: true,
  launchReport: true,
  metadata: {
    "App Version": "0.1",
    "Test Environment": "DEV",
    "Browser": "Chrome  66.0",
    "Platform": "Ubuntu",
    "Parallel": "Scenarios",
    "Executed": "Remote"
  }
};

reporter.generate(options);
