import {When} from 'cucumber';
import request, {Response} from "superagent";
import {expect} from 'chai';
import {config} from '../../../lib/helpers/config';
import {checkResponseOK} from '../../../lib/helpers/command';

/* Sending reqests to health-check endpoint and checking response for all services */
When(/^request health-check (.*)$/, {timeout: config.timeouts.generic_test * 1000}, (name: string) => {
  const url = config.services[name].url + config.suff_health_check;
  request
    .get(url)
    .send()
    .end((err: Error, res: Response) => checkResponseOK(err, res));
});

