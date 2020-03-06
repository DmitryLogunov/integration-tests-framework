const {When} = require('cucumber');
import {assert, expect} from 'chai';
import uniqid from 'uniqid';
import {config} from '../../../lib/helpers/config';
import {getAccessToken} from '../../../lib/helpers/command';
import {uploadFile, downloadFile} from '../../../lib/helpers/assets';
import {Then} from 'cucumber';

const TIMEOUTS = {timeout: config.timeouts.generic_test * 1000};

const file = {
  data: 'Hello, world!' + uniqid(),
  filename: "file.txt",
  type: "text/plain"
};

let response: any;
let id: string;

When('send an upload request using wrong auth token', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      await uploadFile(JSON.stringify(file), 'wrong_token');
    } catch (e) {
      try {
        expect(e.message).to.eql('Request failed with status code 403');
      } catch (e) {
        return reject(e.message);
      }
      resolve();
    }
    reject('No 403 response as expected');
  });
});

When('send a download request using wrong auth token', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      await downloadFile('file', 'wrong_token');
    } catch (e) {
      try {
        expect(e.message).to.eql('Request failed with status code 403');
      } catch (e) {
        return reject(e.message);
      }
      resolve();
    }
    reject('No 403 response as expected');
  });
});

When('send upload file request', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await uploadFile(JSON.stringify(file), await getAccessToken());
      expect(response.status).to.eql(200);
      id = response.data.data;
    } catch (e) {
      return reject(e.message);
    }
    resolve();
  });
});

When(/^send upload file request without "(.*)"$/, TIMEOUTS, function (property: string) {
  return new Promise(async (resolve, reject) => {
    try {
      let editedFile: any = Object.assign({}, file);
      editedFile[property] = '';
      response = await uploadFile(JSON.stringify(editedFile), await getAccessToken());
    } catch (e) {
      response = e.response;
      return resolve();
    }
    reject('No error response as expected');
  });
});

When('send download file request', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await downloadFile(id, await getAccessToken());
      expect(response.status).to.eql(200);
      expect(Buffer.from(response.data).toString('utf8')).to.eql(file.data);
    } catch (e) {
      return reject(e.message);
    }
    resolve();
  });
});

When('send download file request without file name', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      response = await downloadFile('', await getAccessToken());
    } catch (e) {
      response = e.response;
      return resolve();
    }
    reject('No error response as expected');
  });
});

When('download file that not exist', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      response = await downloadFile('nonexistent-id', await getAccessToken());
    } catch (e) {
      response = e.response;
      return resolve();
    }
    reject('No error response as expected');
  });
});

Then(/^expected response status (\d{3}) and message "(.*)"$/, TIMEOUTS,function (code: string, message: string) {
  return new Promise(async (resolve, reject) => {
    try {
      expect(response.status).to.eql(+code);
      expect(response.data.success).to.eql(false);
      expect(response.data.message).to.eql(message);
    } catch (e) {
      return reject(e.message);
    }
    resolve();
  });
});
