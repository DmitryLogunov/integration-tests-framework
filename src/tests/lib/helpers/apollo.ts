import {config} from './config';
import DlpApolloClient from '../../../lib/dlpApolloClient';
import gql from 'graphql-tag';
import * as URL from 'url';

const WAITING_PERIOD = 2000;

const haloQuery = gql`
      subscription onHalo($serviceName: String!) {
        halo(serviceName: $serviceName) 
      }
    `;

const systemCommandResultQuery = gql`
    subscription systemCommandResult($connectionId: String!) {
        systemCommandResult(connection_id: $connectionId) {
            flow_id
            success
            message
            data {
                key,
                value
            }
            errors {
                code,
                description
            }
        }
    }
`;


export class ApolloSubscriber {
  private client?: DlpApolloClient;

  constructor() {
    const qgHost = URL.parse(config.query_srv_url).host;

    if (qgHost) {
      this.client = new DlpApolloClient(qgHost.toString());
    } else {
      throw new Error('Incorrect QG host');
    }
  }

  close() {
    if (this.client) {
      this.client.close();
    }
  }

  async subscribeHalo(serviceName: string, cb: Function) {
    return new Promise(async (resolve, reject) => {
      if (this.client) {
        try {
          const subscription = await this.client.subscribe(
            haloQuery,
            {serviceName},
            (data: object) => {
              cb(serviceName);
            });

          resolve();
        } catch (e) {
          reject(e);
        }
      } else {
        reject('Incorrect QG host');
      }
    });
  }
}

export const subscribeCommandResult = async (connectionId: string) => {
  return new Promise<any>(async (resolve, reject) => {
    const qgHost = URL.parse(config.query_srv_url).host;

    if(qgHost) {
      const client = new DlpApolloClient(qgHost.toString());
      try {
        const timer = setTimeout(async () => {
          client.close();
          return reject({message: `Time out waiting response for connection: ${connectionId}`});
        }, WAITING_PERIOD);

        const subscription = await client.subscribe(
          systemCommandResultQuery,
          {connectionId},
          (data: any) => {
            client.close();
            clearTimeout(timer);
            resolve(data);
          });

      } catch (e) {
        return reject(e);
      }
    } else {
      return reject('Incorrect QG host');
    }
  });
};