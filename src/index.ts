import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import {
  SwishClient, SwishBody, SwishHeaders, SwishPackage,
} from 'swish-protocol'

/** HTTP Request parameters used to identify a public resource */
export interface HTTPRequestConfig {
  url: string;
  method: Method;
}

interface SwishHttpHeaders {
  'swish-action': string;
  'swish-sess-id': string;
  'swish-token': string;
}

interface SwishResponse {
  // body: Record<string, unknown> | Buffer;
  swishResponse: Record<string, unknown> | Buffer;
  swishResponseHeaders: SwishHeaders;
}

interface SwishResponse {
  // body: Record<string, unknown> | Buffer;
  swishResponse: Record<string, unknown> | Buffer;
  swishResponseHeaders: SwishHeaders;
}

/** Defines a Swish Request Class that allows a client to communicate with a server */
export default class RequestSwishClient {
  private client: SwishClient

  private sessionId: string

  private handshakeStartConfig: HTTPRequestConfig

  private handshakeKillConfig: HTTPRequestConfig

  /**
   * Creates a new instance of a RequestSwishClient
   * @param handshakeStartConfig the HTTP resource to connect to during handshake establishment
   * @param handshakeKillConfig the HTTP resource to connect to during handshake termination
   */
  constructor(handshakeStartConfig: HTTPRequestConfig, handshakeKillConfig: HTTPRequestConfig) {
    this.client = new SwishClient()
    this.sessionId = ''
    this.handshakeStartConfig = handshakeStartConfig
    this.handshakeKillConfig = handshakeKillConfig
  }

  /** The user's unique Session Id. if it is empty then the handshake connection is not established */
  get SessionId(): string { return this.sessionId }

  /**
   * Validates the AxiosResponse if it contains the necessary values to make it a swish request
   * @param response The Axios response object to test
  */
  private static validateSwishResponse(response: AxiosResponse): boolean {
    if (response && response.data && response.headers && response.headers['swish-action']
      && response.headers['swish-sess-id'] && response.headers['swish-token']
    ) { return true }
    throw new Error('SWISH_RESPONSE_INVALID')
  }

  /** Performs a swish handshake connection with a server and starts a new session */
  async establishHandshake(): Promise<SwishResponse> {
    const options: AxiosRequestConfig = {
      method: this.handshakeStartConfig.method,
      responseType: 'json',
      url: this.handshakeStartConfig.url,
    }
    const swish:SwishPackage = this.client.generateHandshake()
    const swishHeaders: SwishHttpHeaders = {
      'swish-action': swish.headers.swishAction,
      'swish-sess-id': swish.headers.swishSessionId,
      'swish-token': swish.headers.swishToken,
    }
    const response = await this.handleRequest(options, swishHeaders, swish.body)
    this.sessionId = response.swishResponseHeaders.swishSessionId
    return response
  }

  /** Ends the swish handshake connection with the server and clears the session */
  async releaseHandshake(): Promise<SwishResponse> {
    const options: AxiosRequestConfig = {
      method: this.handshakeKillConfig.method,
      responseType: 'json',
      url: this.handshakeKillConfig.url,
    }
    const response = await this.sendSwish(options)
    this.sessionId = ''
    return response
  }

  /**
   * Sends a new encrypted message and consuming the next encryption chain values
   * @param config The HTTP resource to send the request to
   * @param body The message body
   */
  async sendSwish(options: AxiosRequestConfig): Promise<SwishResponse> {
    const swish = this.client.encryptRequest(options.data)
    // run the request. we don't use async await coz request-promise uses bluebird
    const swishHeaders: SwishHttpHeaders = {
      'swish-action': swish.headers.swishAction,
      'swish-sess-id': swish.headers.swishSessionId,
      'swish-token': swish.headers.swishToken,
    }
    const response = await this.handleRequest(options, swishHeaders, swish.body)
    return response
  }

  private async handleRequest(options: AxiosRequestConfig, swishHeaders?: SwishHttpHeaders, swishBody?: SwishBody): Promise<SwishResponse> {
    const retVal: Partial<SwishResponse> = {}

    if (swishHeaders || swishBody) { // if any exists...
      if (!(swishHeaders && swishBody)) { // but not both
        throw new Error('SWISH_REQUEST_INVALID_FORMAT')
      } else {
        options.headers = { ...options.headers, ...swishHeaders } // merge the headers...
        options.data = swishBody // them override the entire body with the encrypted version
      }
    }

    const response = await axios(options)
    if (RequestSwishClient.validateSwishResponse(response)) {
      retVal.swishResponseHeaders = {
        swishAction: response.headers['swish-action'],
        swishSessionId: response.headers['swish-sess-id'],
        swishToken: response.headers['swish-token'],
      }
      if (swishHeaders && swishHeaders['swish-action'] === 'handshake_init') {
        retVal.swishResponse = this.client.handleHandshakeResponse({
          headers: retVal.swishResponseHeaders,
          body: response.data,
        })
      } else {
        retVal.swishResponse = this.client.decryptResponse({
          headers: retVal.swishResponseHeaders,
          body: response.data,
        })
      }
    }
    return retVal as SwishResponse
  }
}
