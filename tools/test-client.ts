/* eslint-disable no-console */
import RequestSwishClient, { HTTPRequestConfig } from '../src/index'

const SERVER_URL = 'http://localhost:3000/sapi'
const httpStartHandshake: HTTPRequestConfig = {
  method: 'POST',
  url: SERVER_URL,
}
const httpKillHandshake: HTTPRequestConfig = {
  method: 'DELETE',
  url: SERVER_URL,
}
const swishClient = new RequestSwishClient(httpStartHandshake, httpKillHandshake)

async function testHandShake(): Promise<boolean> {
  try {
    console.log('Starting handshake...')
    const r = await swishClient.establishHandshake()
    console.log(`Handshake completed! your session_id is ${swishClient.SessionId}`)
    console.log(r.swishResponse)
    return true
  } catch (err) {
    console.log(err.message)
  }
  return false
}

async function testRequest(path: string, data: Record<string, unknown>) {
  try {
    console.log(`Sending request ${JSON.stringify(data)}`)
    const r = await swishClient.sendSwish({
      method: 'POST',
      responseType: 'json',
      url: `${SERVER_URL}/${path}`,
      data,
    })
    console.log(r.swishResponse)
  } catch (err) {
    console.log(err.message)
  }
}

async function testDestroySession() {
  console.log('Destroying handshake session...')
  const r = await swishClient.releaseHandshake({ reason: 'testing' })
  console.log(r.swishResponse)
}

async function test() {
  try {
    await testHandShake()
    // now lets start communicating to the secured endpoints
    await testRequest('test/success', { action: 'hello', message: 'Adonis Villamor', passcode: 'whoami' })
    // send a different one this time
    await testRequest('test/success', { action: 'move', message: 'Japan', passcode: 'whereami' })
    // destroy the session
    await testDestroySession()
    // try an illegal access now session is destoryed
    await testRequest('test/success', { action: 'move', message: 'Japan', passcode: 'whereami' })
    // try to create a new handshake and connect again
    console.log('Reconnecting and try again')
    await testHandShake()
    await testRequest('test/success', { action: 'move', message: 'Japan', passcode: 'whereami' })
  } catch (err) {
    console.error(err.message)
  }
}

test()
