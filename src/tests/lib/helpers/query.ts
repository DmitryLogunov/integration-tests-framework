import axios from 'axios';
import {config} from './config';
import {expect} from 'chai';

/**
 * Sends grqphQl request with specified query
 */
export const sendQuery = async (query: string, token: string) => {
  const requestParams = {
    method: 'get',
    url: `${config.query_srv_url}/graphql?query=${query}`,
    headers: {
      Authorization: `Bearer ${token}`
    }

  };
  return await axios(requestParams);
};
