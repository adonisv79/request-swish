import { Response } from 'request';
import rp from 'request-promise';
import { HandshakeClient } from 'swish-protocol';

/** Common REST HTTP Methods */
export enum HttpMethods {
  OPTIONS = 0, GET = 2, POST = 4, PUT = 8, DELETE = 16
}

/** HTTP Request parameters used to identify a public resource */
export interface HTTPRequestConfig {
  uri: string;
  method: HttpMethods;
}

/** Defines a Swish Request Class that allows a client to communicate with a server */
export default class RequestSwishClient {
  private client: HandshakeClient;

  private sessionId: string;

  private handshakeStartConfig: HTTPRequestConfig;

  private handshakeKillConfig: HTTPRequestConfig;

  /**
   * Creates a new instance of a RequestSwishClient
   * @param handshakeStartConfig the HTTP resource to connect to during handshake establishment
   * @param handshakeKillConfig the HTTP resource to connect to during handshake termination
   */
  constructor(handshakeStartConfig: HTTPRequestConfig, handshakeKillConfig: HTTPRequestConfig) {
    this.client = new HandshakeClient();
    this.sessionId = '';
    this.handshakeStartConfig = handshakeStartConfig;
    this.handshakeKillConfig = handshakeKillConfig;
  }

  /** The user's unique Session Id. if it is empty then the handshake connection is not established */
  get SessionId(): string {
    return this.sessionId;
  }

  /** Performs a swish handshake connection with a server */
  async establishHandshake(): Promise<any> {
    const swish = this.client.generateHandshake();
    // run the request. we don't use async await coz request-promise uses bluebird
    return rp({
      headers: {
        'swish-action': swish.headers.swishAction,
        'swish-iv': swish.headers.swishIV,
        'swish-key': swish.headers.swishKey,
        'swish-next': swish.headers.swishNextPublic,
        'swish-sess-id': swish.headers.swishSessionId,
      },
      json: true,
      method: HttpMethods[this.handshakeStartConfig.method],
      resolveWithFullResponse: true,
      uri: this.handshakeStartConfig.uri,
    }).then((response: Response) => {
      this.sessionId = (response.headers['swish-sess-id'] || '').toString();  
      const result = this.client.handleHandshakeResponse({
        swishAction: (response.headers['swish-action'] || '').toString(),
        swishIV: (response.headers['swish-iv'] || '').toString(),
        swishKey: (response.headers['swish-key'] || '').toString(),
        swishNextPublic: (response.headers['swish-next'] || '').toString(),
        swishSessionId: this.sessionId,
      }, response.body);
      return result;
    });
  }

  /**
   * Sends a new encrypted message and consuming the nect encryption chain values
   * @param config The HTTP resource to send the request to
   * @param body The message body
   */
  async sendMessage(config: HTTPRequestConfig, body: any): Promise<any> {
    const swish = this.client.encryptRequest(body);
    // run the request. we don't use async await coz request-promise uses bluebird
    const headers = {
      'swish-action': swish.headers.swishAction,
      'swish-iv': swish.headers.swishIV,
      'swish-key': swish.headers.swishKey,
      'swish-next': swish.headers.swishNextPublic,
      'swish-sess-id': swish.headers.swishSessionId,
    };
    return rp({
      body: swish.body,
      headers,
      json: true,
      method: HttpMethods[config.method],
      resolveWithFullResponse: true,
      uri: config.uri,
    }).then((response) => {
      const dec = this.client.decryptResponse({
        swishAction: response.headers['swish-action'],
        swishIV: response.headers['swish-iv'],
        swishKey: response.headers['swish-key'],
        swishNextPublic: response.headers['swish-next'],
        swishSessionId: response.headers['swish-sess-id'],
      }, response.body);
      return dec;
    }).catch((err) => {
      if ((err.response || {}).body && (err.response || {}).headers) {
        const dec = this.client.decryptResponse({
          swishAction: err.response.headers['swish-action'],
          swishIV: err.response.headers['swish-iv'],
          swishKey: err.response.headers['swish-key'],
          swishNextPublic: err.response.headers['swish-next'],
          swishSessionId: err.response.headers['swish-sess-id'],
        }, err.response.body);
        return dec;
      }
      throw err;
    });
  }

  /** Ends the swish handshake connection with the server */
  async releaseHandshake(): Promise<any> {
    const swish = this.client.encryptRequest({});
    // run the request. we don't use async await coz request-promise uses bluebird
    return rp({
      headers: {
        'swish-action': 'session_destroy',
        'swish-iv': swish.headers.swishIV,
        'swish-key': swish.headers.swishKey,
        'swish-next': swish.headers.swishNextPublic,
        'swish-sess-id': swish.headers.swishSessionId,
      },
      json: false,
      method: HttpMethods[this.handshakeKillConfig.method],
      resolveWithFullResponse: true,
      uri: this.handshakeKillConfig.uri,
    }).then((response: Response) => {
      this.sessionId = '';
      return response.body;
    });
  }
}
