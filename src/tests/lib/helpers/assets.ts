import axios from 'axios';
import {config} from './config';
import {expect} from 'chai';

/**
 * Sends 'upload file' request to the assets gateway
 */
export const uploadFile = async (data: string, token: string) => {
  return await axios({
    method: 'put',
    url: `${config.assets_srv_url}/upload`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data
  });
};

/**
 * Sends 'download file' request to the assets gateway
 */
export const downloadFile = async (fileId: string, token: string) => {
  return await axios({
    method: 'get',
    url: `${config.assets_srv_url}/download?id=${fileId}`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};