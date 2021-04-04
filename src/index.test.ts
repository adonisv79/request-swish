import axios, { AxiosResponse } from 'axios'
import { SwishClient } from 'swish-protocol'
import { mocked } from 'ts-jest/dist/utils/testing'
import RequestSwishClient, { HTTPRequestConfig } from './index'

jest.mock('axios')
jest.mock('swish-protocol')
const mockedSwishClient = mocked(SwishClient, true)
// const clientNextPublicAes = '-----BEGIN PUBLIC KEY-----\n'
//     + 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALjzfNYuouNrU7pDE6aAN4hqj6yYlBqw\n'
//     + 'TCzuZxAz3u4yhA7HOPncFyPh6q2MorSugH2u1POVSgFnr2cd06FTc9MCAwEAAQ==\n'
//     + '-----END PUBLIC KEY-----\n'
// const clientNextPrivateAes = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n'
//   + 'MIIBvTBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQwwHAQIaoZCp75bkgQCAggA\n'
//   + 'MAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAECBBBydRvt/mC9bFTCXcq+1TGeBIIB\n'
//   + 'YOMajHwTg+gj/rPnrOGcGfkUYKKrNF64hvQ+5HJH95FTTr78YgEilJxe6ZuOn4Q+\n'
//   + 'Tplguoy+EY7n4Q8CL6aGGPB2gf7rkSYWFGPqkgxgc11FT+SVLNXyuKkGvElmBqoR\n'
//   + 'dplkp2QZO9ioXu4wrD6tAvdBsT6ewRY/KZDGBf5ofjAxawWTrTKUb2LH1O/M4kr8\n'
//   + 'rNmMLL1/ox/b2vnJwUhBVctS3tjdMxiTZUy7y5qJj/VhooWc29Aq0B9FNKyPW64y\n'
//   + 'uLutMntCLOR1nfHNzwDoGbbttVetYQr1cjmjHZzpT5v+NiT0lTbc7TC6inHUd8BI\n'
//   + '2vsYotGGRO2gB3vnTMQXjCXZ9VM2BAcx4SFND2fflaKKJ1EwKQ1DCm/nSwWGFlxy\n'
//   + 'ldGvGNxb6C/yvDYwu3TvR4DKjPD72P9gSpuiSpVZNu+X8JKVt42ADGI9jV4sdoDl\n'
//   + 'wibe1XVEAbsI6MGFsiVQveQ=\n'
//   + '-----END ENCRYPTED PRIVATE KEY-----\n'
// const clientPassphrase = 1617529193313
const serverSuccessData = '7BZrmJwZ8A51LnRvMMOCVw=='
const serverSuccessHeaders = {
  'swish-action': 'mocked_response',
  'swish-iv': 'FM7+9y8WSPeqj0JqW+BZYnsPjZO0ihFfIKfEdiLnhGbPINcZCAsWeJjC1ULdGUyuV97LortF3JU1ZvMV6R6AZQ==',
  'swish-key': 'Wg+tS+oSfbWeg5VoRjMayeiL6vEoHBxLyya2fdHDCYo5PSpwOFQ0rT1v6t0d6Vdt763W+svXMC/tNUftmj81yQ==',
  // eslint-disable-next-line max-len
  'swish-next': 'Gsr9V0H0qhOykZrUwOr8jR7O5UnEwHTJx5OfdamBpXAOaGy2WAcDS0Bl+17Lx+4XgNMq9I3Yf5J/8pGWe0lwJs2n8yFU13ciljBtM1HoCo6zr5uI4j3aVL/NxtgjDGLOPVoIMDlg6FHfqMSpJqBXPFBZpymULZ2i8x6ugnMjMD0r6vcuqw5mjqfGTcn6WWuhOwW9/Aas7Ge3vZzaMmsGLH5e+xNPa6eZWhI8VAtz4qg0h4yg2rsDqC8546OJA/Ko',
  'swish-sess-id': 'a4c45c559590',
}
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
  test('', async () => {
    const mockedResponse: AxiosResponse = {
      data: serverSuccessData,
      status: 200,
      statusText: 'Mocked Success',
      headers: serverSuccessHeaders,
      config: {},
    }
    mocked(axios).mockResolvedValue(mockedResponse)

    mockedSwishClient.prototype.generateHandshake.mockReturnValueOnce({
      headers: {
        swishAction: 'handshake_init',
        swishIV: 'someiv',
        swishKey: 'somekey',
        swishNextPublic: 'somepubkey',
        swishSessionId: 'adonisv79',
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
        swishIV: 'someiv',
        swishKey: 'somekey',
        swishNextPublic: 'somepubkey',
        swishSessionId: 'adonisv79',
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
