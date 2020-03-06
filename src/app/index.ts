import express from 'express';
import cors from 'cors';

import {
  _404Controller,
  assetsController,
  indexController,
  reportsController,
  runController,
  showReportController,
  startTestsController
} from './controllers';

/* Configure Express server */
const app: express.Application = express();

app.use(cors());

// set the view engine to ejs
app.set('views', 'app/views');
app.set('view engine', 'ejs');

// routes
app.get('/', indexController);
app.get('/reports', reportsController);
app.get('/start-tests', startTestsController);
app.get('/404', _404Controller);
app.get('/assets/*', assetsController);
app.get('/show-report', showReportController);
app.get('/run', runController);

export default app;
