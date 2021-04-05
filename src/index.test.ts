import axios, { AxiosResponse } from 'axios'
import { SwishClient } from 'swish-protocol'
import { mocked } from 'ts-jest/dist/utils/testing'
import RequestSwishClient, { HTTPRequestConfig } from './index'

jest.mock('axios')
jest.mock('swish-protocol')
const mockedSwishClient = mocked(SwishClient, true)
const serverSuccessData = '7BZrmJwZ8A51LnRvMMOCVw=='
const SERVER_URL = 'http://localhost:3000'
const hsStartConfig: HTTPRequestConfig = {
  method: 'POST',
  url: `${SERVER_URL}/auth/handshake`,
}
const hsKillConfig: HTTPRequestConfig = {
  method: 'DELETE',
  url: `${SERVER_URL}/auth/handshake`,
}
const client = new RequestSwishClient(hsStartConfig, hsKillConfig)

describe('SwishClient.generateHandshake', () => {
  test('should be able to generate a valid handshake session', async () => {
    const mockedResponse: AxiosResponse = {
      data: serverSuccessData,
      status: 200,
      statusText: 'Mocked Success',
      headers: {
        'swish-action': 'mocked_response',
        'swish-sess-id': 'a4c45c559590',
        // eslint-disable-next-line max-len
        'swish-token': 'FM7+9y8WSPeqj0JqW+BZYnsPjZO0ihFfIKfEdiLnhGbPINcZCAsWeJjC1ULdGUyuV97LortF3JU1ZvMV6R6AZQ==.Wg+tS+oSfbWeg5VoRjMayeiL6vEoHBxLyya2fdHDCYo5PSpwOFQ0rT1v6t0d6Vdt763W+svXMC/tNUftmj81yQ==.Gsr9V0H0qhOykZrUwOr8jR7O5UnEwHTJx5OfdamBpXAOaGy2WAcDS0Bl+17Lx+4XgNMq9I3Yf5J/8pGWe0lwJs2n8yFU13ciljBtM1HoCo6zr5uI4j3aVL/NxtgjDGLOPVoIMDlg6FHfqMSpJqBXPFBZpymULZ2i8x6ugnMjMD0r6vcuqw5mjqfGTcn6WWuhOwW9/Aas7Ge3vZzaMmsGLH5e+xNPa6eZWhI8VAtz4qg0h4yg2rsDqC8546OJA/Ko',
      },
      config: {},
    }
    mocked(axios).mockResolvedValue(mockedResponse)

    mockedSwishClient.prototype.generateHandshake.mockReturnValueOnce({
      headers: {
        swishAction: 'handshake_init',
        swishSessionId: 'adonisv79',
        swishToken: 'thisissomevalidaesiv.thisissomevalidaeskey.thisissomevalidrsanextpublickey',
      },
      body: {
        encBody: '',
        isJson: false,
      },
    })
    mockedSwishClient.prototype.handleHandshakeResponse.mockReturnValueOnce({ status: 'ok' })
    const r = await client.establishHandshake()
    expect(r.swishResponseHeaders.swishAction).toEqual('mocked_response')
    expect(r.swishResponseHeaders.swishSessionId).toEqual('a4c45c559590')
    expect(r.swishResponse).toStrictEqual({ status: 'ok' })
  })
})

describe('SwishClient.releaseHandshake', () => {
  test('', async () => {
    mockedSwishClient.prototype.encryptRequest.mockReturnValueOnce({
      headers: {
        swishAction: 'session_destroy',
        swishSessionId: 'adonisv79',
        swishToken: 'thisissomevalidaesiv.thisissomevalidaeskey.thisissomevalidrsanextpublickey',
      },
      body: {
        encBody: '',
        isJson: false,
      },
    })
    mockedSwishClient.prototype.decryptResponse.mockReturnValueOnce({ logout_status: 'ok' })
    const r = await client.releaseHandshake()
    expect(r.swishResponseHeaders.swishAction).toEqual('mocked_response')
    expect(r.swishResponseHeaders.swishSessionId).toEqual('a4c45c559590')
    expect(r.swishResponse).toStrictEqual({ logout_status: 'ok' })
  })
})
