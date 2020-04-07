# request-swish
![Redis toolbox banner](https://adonisv79.github.io/request-swish/images/banner.png)
Request client utilizing the secured swish client protocol which allows any client app to connect to a service (API) utilizing the protocol. For the server side implementation, please see [express-swish-protocol](https://github.com/adonisv79/express-swish-protocol)

To install, run the following in your client project
```
npm i request-swish --save
```
Note that this project uses requet and request-promise so you may need to install thier respective @types (if you use typescript).
```
npm i @types/request @types/request-promise --save
```

Lets create a new instance of the client
```
import RequestSwishClient, { HttpMethods, HTTPRequestConfig } from 'request-swish';
  
const SERVER_URL = 'http://localhost:3000';
const httpStartHandshake: HTTPRequestConfig = {
  method: HttpMethods.GET,
  uri: `${SERVER_URL}/auth/swish/handshake`,
};
const httpKillHandshake: HTTPRequestConfig = {
  method: HttpMethods.DELETE,
  uri: `${SERVER_URL}/auth/swish/handshake`,
};
const swishClient = new RequestSwishClient(httpStartHandshake, httpKillHandshake);
```
The RequestSwishClient requires 2 parameters of type HTTPRequestConfig  which is just an object containing the method and uri where the target swish server may have their handshake 'init' and 'kill' reside. Note that these endpoints may also not exist depending on the implementation of the service.

the client has 3 main functions
```
swishClient.establishHandshake();
swishClient.releaseHandshake();
swishClient.sendSwish();
```
* The first 2 are used to establish and kill the connection/session
* The last one is used to make an exchange/transaction with the service

Let's implement these and start sending calls. we will add the following codes
```
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
    // destroy the session
    await testDestroySession();
    // try an illegal access now session is destoryed
    await testRequest('test/success', { action: 'move', message: 'Japan', passcode: 'whereami' });
  } catch (err) {
    console.error(err.message);
  }
}

test();

```

## Final code
by now you will end up with the following code which you can run against a swish server
```
import RequestSwishClient, { HttpMethods, HTTPRequestConfig } from 'request-swish';

const SERVER_URL = 'http://localhost:3000';
const httpStartHandshake: HTTPRequestConfig = {
  method: HttpMethods.GET,
  uri: `${SERVER_URL}/auth/swish/handshake`,
};
const httpKillHandshake: HTTPRequestConfig = {
  method: HttpMethods.DELETE,
  uri: `${SERVER_URL}/auth/swish/handshake`,
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
```
