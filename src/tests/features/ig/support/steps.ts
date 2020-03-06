// TODO: legacy from Aleksey Tatarnikov. It should be reafactored

import request, {Response} from "superagent";
import {CompareJsonResult, RejectInPromiseInterface, ResolveInPromiseInterface} from '../../../lib/helpers/lib.types';

import {Before, When} from 'cucumber';
import path from 'path';
import {assert, expect} from 'chai';
import fs from 'fs';
import {promisify} from 'util';
import {check_get, compare_json} from '../../../lib/helpers/lib';
import {config} from '../../../lib/helpers/config';

const readFile = promisify(fs.readFile);

const TC_DATA_FOLDER = path.join(__dirname, '..', 'data');

//TODO: seems like it is executed when others are executed(health-check for an instance)
Before(function () {
});

/*********************** Check requesting gateways ****************/
When(/^request gateways at ig$/, {timeout: config.timeouts.generic_test * 1000}, function () {
  return check_get(config.services.initiatorgateway.url + config.suff_ig_gateways, checkGws);
});

/********************** Request default app ***********************/
When(/^request default app at ig$/, {timeout: config.timeouts.generic_test * 1000}, function () {
  return check_get(config.services.initiatorgateway.url, checkdefaultApp);
});


/********************** Check /keycloak endpoint *******************/
When('inititor-gateway: check /keycloak', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    const url = config.services.initiatorgateway.url + config.suff_keycloak;

    request
      .get(url)
      .send()
      .end((err: Error, res: Response) => {
        if (err) {
          expect(err).to.eql(null);
          resolve();
        } else {
          expect(typeof res).to.not.eql('undefined');
          expect(res.status).to.eql(200);

          console.log(res.text);

          const keycloakParams = JSON.parse(res.text);
          expect(Object.keys(keycloakParams).length).to.eql(4);
          expect(typeof keycloakParams.realmName).to.not.eql('undefined');
          expect(typeof keycloakParams.authServerUrl).to.not.eql('undefined');
          expect(typeof keycloakParams.realmPublicKey).to.not.eql('undefined');
          resolve();
        }
      });
  });
});


/****************** Helpers ****************************************/

const checkGws = async (data: any, resolve: ResolveInPromiseInterface, reject: RejectInPromiseInterface) => {
  const excl: string[] = [];
  const exp_msg = (await readFile(`${TC_DATA_FOLDER}/gateways.json`));
  const comp_result: CompareJsonResult = await compare_json(data.text, exp_msg.toString(), excl);
  try {
    assert.isOk(comp_result.getResult(), `diffs: ${comp_result.getDiff()}`);
  } catch (e) {
    return reject(e.message);
  }
  resolve({result: "ok"});
};

const checkdefaultApp = async (data: any, resolve: ResolveInPromiseInterface, reject: RejectInPromiseInterface) => {
  try {
    assert.isOk(data.text.indexOf('Default App') != -1, 'Default App is not loaded at IG');
  } catch (e) {
    return reject(e.message);
  }
  resolve({result: "ok"});
};
