import RequestSwishClient, { HttpMethods, HTTPRequestConfig } from '../src/index';

const SERVER_URL = 'http://localhost:3000';
const httpStartHandshake: HTTPRequestConfig = {
  method: HttpMethods.POST,
  uri: `${SERVER_URL}/auth/handshake`,
};
const httpKillHandshake: HTTPRequestConfig = {
  method: HttpMethods.DELETE,
  uri: `${SERVER_URL}/auth/handshake`,
};
const swishClient = new RequestSwishClient(httpStartHandshake, httpKillHandshake);

async function testHandShake(): Promise<boolean> {
  try {
    console.log('Starting handshake...');
    const r = await swishClient.establishHandshake();
    console.log(`Handshake completed! your session_id is ${swishClient.SessionId}`);
    console.log(r.swishResponse || r.body);
    return true;
  } catch (err) {
    console.log(err.message);
  }
  return false;
}

async function testRequest(path: string, body: any) {
  try {
    console.log(`Sending request ${JSON.stringify(body)}`);
    const r = await swishClient.sendSwish({
      json: true,
      method: HttpMethods[HttpMethods.POST],
      resolveWithFullResponse: true,
      uri: `${SERVER_URL}/${path}`,
      body,
    });
    console.log(r.swishResponse || r.body);
  } catch (err) {
    console.log(err.message);
  }
}

async function testDestroySession() {
  console.log('Destroying handshake session...');
  const r = await swishClient.releaseHandshake();
  console.log(r.swishResponse || r.body);
}

async function test() {
  try {
    await testHandShake();
    // now lets start communicating to the secured endpoints
    await testRequest('test/success', { action: 'hello', message: 'Adonis Villamor', passcode: 'whoami' });
    // send a different one this time
    await testRequest('test/success', { action: 'move', message: 'Japan', passcode: 'whereami' });
    // destroy the session
    await testDestroySession();
    // try an illegal access now session is destoryed
    await testRequest('test/success', { action: 'move', message: 'Japan', passcode: 'whereami' });
  } catch (err) {
    console.error(err.message);
  }
}

test();
