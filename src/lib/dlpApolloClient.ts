import {ApolloClient} from 'apollo-client';
import {InMemoryCache, NormalizedCacheObject} from 'apollo-cache-inmemory';
import {WebSocketLink} from 'apollo-link-ws';
import {SubscriptionClient} from 'subscriptions-transport-ws';
import {setContext} from 'apollo-link-context';
import ws from 'ws';
import {split} from 'apollo-client-preset';
import fetch from 'node-fetch';
import {createHttpLink} from 'apollo-link-http';
import {DocumentNode} from "graphql";
import {getMainDefinition} from 'apollo-utilities';
import {getAccessToken} from '../tests/lib/helpers/command';

/**
 * @class DlpApolloClient - GraphQl client functions
 *
 */
export default class DlpApolloClient {
  private apolloClient: ApolloClient<NormalizedCacheObject>;
  private wsClient: SubscriptionClient;
  private authLink: any;

  constructor(host: string) {

    this.wsClient = new SubscriptionClient(`ws://${host}/subscriptions`, {
      reconnect: true,
    }, ws);

    const httpLink = createHttpLink({uri: `http://${host}/graphql`, fetch: fetch});

    const wsLink = new WebSocketLink(this.wsClient);

    const cache = new InMemoryCache();

    const authLink = setContext(async (_, {headers}) => {
      const adminAccessToken = await getAccessToken();
      // return the headers to the context so httpLink can read them
      return {
        headers: {
          ...headers,
          Authorization: `Bearer ${adminAccessToken}`,
          Accept: 'application/json'
        }
      }
    });

    const link = split(
      ({query}) => {
        const {kind, operation} = getMainDefinition(query);
        return kind === 'OperationDefinition' && operation === 'subscription'
      },
      authLink.concat(wsLink),
      authLink.concat(httpLink),
    );

    this.apolloClient = new ApolloClient({link, cache});
  }

  /**
   *
   * @param {DocumentNode} query
   * @param {object} variables
   * @param {SubscriptionActionfInterface} onResponse
   * @returns {Promise<any>}
   */
  async subscribe(query: DocumentNode, variables: object, onResponse: SubscriptionActionfInterface) {
    return new Promise(async (resolve, reject) => {
      try {
        const observable = await this.apolloClient.subscribe({
          query,
          variables
        });

        observable.subscribe({
          next(data: object) {
            onResponse(data);
          },
          error(value: Error) {
            reject(value);
          }
        });

        resolve();

      } catch (e) {
        reject(e);
      }
    });
  };

  /**
   *
   */
  close() {
    this.wsClient.close();
  }

}
