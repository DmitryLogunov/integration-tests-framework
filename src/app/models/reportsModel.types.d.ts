/* tests report params interfaces */

interface ReportInterface {
  reportID: string;
  datetimeReport: string;
  passed: string;
  failed: string;
  summary: string;
}

interface ResultsReportInterface {
  passed: string;
  failed: string;
  summary: string;
}

/* JSON tests report interfaces */

interface StatusResultFeatureStepInterface {
  status: string;
}

interface FeatureStepInterface {
  result: StatusResultFeatureStepInterface;
}

interface ElementStepsInterface {
  id: string;
  steps: Array<FeatureStepInterface>;
}

interface FeatureElementInterface {
  statuses: Array<string>;
}

interface FeatureInterface {
  elements: Array<FeatureElementInterface>;
}
