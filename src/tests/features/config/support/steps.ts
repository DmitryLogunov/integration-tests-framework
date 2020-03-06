import {BeforeAll, setWorldConstructor, Then, When} from 'cucumber';
import {ConfigCustomWorld} from "./world";
import request, {Response} from 'superagent';
import {assert, expect} from 'chai';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {config} from '../../../lib/helpers/config';

const readFile = promisify(fs.readFile);
import _ from 'lodash';

const TC_DATA_FOLDER = path.join(__dirname, '..', 'data');
const CONFIG_TOPIC = 'config', GETCONFIG_TOPIC = 'getconfig';

let getConfigPostBody: string;


BeforeAll(async function () {
  getConfigPostBody = await readFile(`${TC_DATA_FOLDER}/get_config_body.json`, 'utf8');
  setWorldConstructor(ConfigCustomWorld);
});

/************************  Check config generation *****************/

When(/^retrieve config using (.*)$/, {timeout: config.timeouts.generic_test * 1000}, function (this: CustomWorld, name: string) {
  return getCfgFromConfService(name, this);
});

Then(/^generated config is as for (.*)$/, {timeout: config.timeouts.generic_test * 1000}, function (this: CustomWorld, name: string) {
  const _self = this;
  const config = _self.getConfServiceConfig();

  expect(typeof config).to.not.eql('undefined');

  const keys = _
    .chain(config)
    .map(pair => pair.key)
    .flatten()
    .uniq()
    .value();

  expect(_.includes(keys, 'common/config/datahash')).to.eql(true);

  const checkEmailmanagementKey = 'service/emailmanagement/provider/sendgrid/api-key';
  switch (name) {
    case 'emailmanagement':
      expect(_.includes(keys, checkEmailmanagementKey)).to.eql(true);
      break;
    case 'commandgateway':
      expect(_.includes(keys, checkEmailmanagementKey)).to.eql(false);
      break;
  }
});

/********************** Check /keycloak endpoint *******************/

When('config-servcie: check /keycloak', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    const url = config.services.config_service.url + config.suff_keycloak;

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

const getCfgFromConfService = (name: string, _self: CustomWorld) => {
  return new Promise(async (resolve, reject) => {

    //getConfigPostBody - local package var - initiated at BeforeAll
    let confMsgBody = JSON.parse(getConfigPostBody);
    confMsgBody.header.service_name = name;
    request.post(config.services.config_service.url + config.suff_conf_getconfig)
      .send(confMsgBody)
      .set('Content-Type', 'application/json')
      .end((err: Error, res: Response) => {
        if (err) return reject(err);
        _self.setConfServiceConfig(JSON.parse(res.text).body.config);
        resolve();
      });
  });
};

