import { Response, UriOptions } from 'request';
import rp, { RequestPromiseOptions } from 'request-promise';
import { SwishClient, SwishBody, SwishPackage } from 'swish-protocol';

/** Common REST HTTP Methods */
export enum HttpMethods {
  OPTIONS = 0, GET = 2, POST = 4, PUT = 8, DELETE = 16
}

/** HTTP Request parameters used to identify a public resource */
export interface HTTPRequestConfig {
  uri: string;
  method: HttpMethods;
}

interface SwishRequestHeaders {
  'swish-action': string;
  'swish-iv': string;
  'swish-key': string;
  'swish-next': string;
  'swish-sess-id': string;
}

/** Defines a Swish Request Class that allows a client to communicate with a server */
export default class RequestSwishClient {
  private client: SwishClient;

  private sessionId: string;

  private handshakeStartConfig: HTTPRequestConfig;

  private handshakeKillConfig: HTTPRequestConfig;

  /**
   * Creates a new instance of a RequestSwishClient
   * @param handshakeStartConfig the HTTP resource to connect to during handshake establishment
   * @param handshakeKillConfig the HTTP resource to connect to during handshake termination
   */
  constructor(handshakeStartConfig: HTTPRequestConfig, handshakeKillConfig: HTTPRequestConfig) {
    this.client = new SwishClient();
    this.sessionId = '';
    this.handshakeStartConfig = handshakeStartConfig;
    this.handshakeKillConfig = handshakeKillConfig;
  }

  /** The user's unique Session Id. if it is empty then the handshake connection is not established */
  get SessionId(): string { return this.sessionId; }

  private swishResponseIsValid(response: any): boolean {
    if ((response || {}).body && (response || {}).headers && response.headers['swish-action']
      && response.headers['swish-iv'] && response.headers['swish-key']
      && response.headers['swish-next'] && response.headers['swish-sess-id']
    ) { return true; }
    return false;
  }

  /** Performs a swish handshake connection with a server */
  async establishHandshake(): Promise<any> {
    const options: RequestPromiseOptions & UriOptions = {
      json: true,
      method: HttpMethods[this.handshakeStartConfig.method],
      resolveWithFullResponse: true,
      uri: this.handshakeStartConfig.uri,
    };
    const swish = this.client.generateHandshake();
    const swishHeaders: SwishRequestHeaders = {
      'swish-action': swish.headers.swishAction,
      'swish-iv': swish.headers.swishIV,
      'swish-key': swish.headers.swishKey,
      'swish-next': swish.headers.swishNextPublic,
      'swish-sess-id': swish.headers.swishSessionId,
    };
    const response = await this.handleRequest(options, swishHeaders, swish.body);
    this.sessionId = response.swishResponseHeaders.swishSessionId;
    return response;
  }

  /** Ends the swish handshake connection with the server */
  async releaseHandshake(): Promise<any> {
    const options: RequestPromiseOptions & UriOptions = {
      json: true,
      method: HttpMethods[this.handshakeKillConfig.method],
      resolveWithFullResponse: true,
      uri: this.handshakeKillConfig.uri,
    };
    const swish = this.client.encryptRequest({});
    const swishHeaders: SwishRequestHeaders = {
      'swish-action': 'session_destroy',
      'swish-iv': swish.headers.swishIV,
      'swish-key': swish.headers.swishKey,
      'swish-next': swish.headers.swishNextPublic,
      'swish-sess-id': swish.headers.swishSessionId,
    };
    const response = await this.handleRequest(options, swishHeaders, swish.body);
    this.sessionId = '';
    return response;
  }

  /**
   * Sends a new encrypted message and consuming the nect encryption chain values
   * @param config The HTTP resource to send the request to
   * @param body The message body
   */
  async sendSwish(options: RequestPromiseOptions & UriOptions): Promise<any> {
    const swish = this.client.encryptRequest(options.body);
    // run the request. we don't use async await coz request-promise uses bluebird
    const swishHeaders: SwishRequestHeaders = {
      'swish-action': swish.headers.swishAction,
      'swish-iv': swish.headers.swishIV,
      'swish-key': swish.headers.swishKey,
      'swish-next': swish.headers.swishNextPublic,
      'swish-sess-id': swish.headers.swishSessionId,
    };
    const result = await this.handleRequest(options, swishHeaders, swish.body);
    return result;
  }

  /**
   * Sends a normal Request-promise call
   * @param options The request options to use
   */
  async sendNormal(options: RequestPromiseOptions & UriOptions): Promise<any> {
    const result = await this.handleRequest(options);
    return result;
  }

  private async handleRequest(options: RequestPromiseOptions & UriOptions, swishHeaders?: SwishRequestHeaders, swishBody?: SwishBody): Promise<any> {
    try {
      let usedSwish = false;
      if (swishHeaders || swishBody) { // if any exists...
        if (!(swishHeaders && swishBody)) { // but not both
          throw new Error('SWISH_REQUEST_INVALID_FORMAT');
        } else {
          options.headers = { ...options.headers, ...swishHeaders }; // merge the headers...
          options.body = swishBody; // them override the entire body with the encrypted version
          usedSwish = true;
        }
      }
      const response = await rp(options);
      if (usedSwish && this.swishResponseIsValid(response)) { // handle swish decryption
        response.swishResponseHeaders = {
          swishAction: response.headers['swish-action'],
          swishIV: response.headers['swish-iv'],
          swishKey: response.headers['swish-key'],
          swishNextPublic: response.headers['swish-next'],
          swishSessionId: response.headers['swish-sess-id'],
        };
        if ((swishHeaders || {})['swish-action'] === 'handshake_init') {
          response.swishResponse = this.client.handleHandshakeResponse({
            headers: response.swishResponseHeaders,
            body: response.body,
          });
        } else {
          response.swishResponse = this.client.decryptResponse({
            headers: response.swishResponseHeaders,
            body: response.body,
          });
        }
      }
      return response;
    } catch (err) {
      if ((err.response || {}).body && (err.response || {}).headers
        && this.swishResponseIsValid(err.response)) {
        const swishRes: SwishPackage = {
          headers: {
            swishAction: err.response.headers['swish-action'],
            swishIV: err.response.headers['swish-iv'],
            swishKey: err.response.headers['swish-key'],
            swishNextPublic: err.response.headers['swish-next'],
            swishSessionId: err.response.headers['swish-sess-id'],
          },
          body: err.response.body,
        };
        return this.client.decryptResponse(swishRes);
      }
      throw err;
    }
  }
}
