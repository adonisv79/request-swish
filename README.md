# request-swish
![request swish banner](https://adonisv79.github.io/request-swish/images/banner.png)
This is an axios based swish client used to make SWISH communications with a server that implements the same protocol. For the core SWISH Protocol project, please refer to https://github.com/adonisv79/swish-protocol

## Project stats
* Package: [![npm](https://img.shields.io/npm/v/request-swish.svg)](https://www.npmjs.com/package/request-swish) [![npm](https://img.shields.io/npm/dm/request-swish.svg)](https://www.npmjs.com/package/request-swish)
* License: [![GitHub](https://img.shields.io/github/license/adonisv79/request-swish.svg)](https://github.com/adonisv79/request-swish/blob/master/LICENSE)
* CICD: [![Codacy Badge](https://api.codacy.com/project/badge/Grade/82a6fbafd28343a9886caf60bbda4dd7)](https://www.codacy.com/app/adonisv79/request-swish?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=adonisv79/request-swish&amp;utm_campaign=Badge_Grade) [![Known Vulnerabilities](https://snyk.io/test/github/adonisv79/request-swish/badge.svg)](https://snyk.io/test/github/adonisv79/request-swish)
  * master: [![Build Status](https://travis-ci.org/adonisv79/request-swish.svg?branch=master)](https://travis-ci.org/adonisv79/request-swish) [![Coverage Status](https://coveralls.io/repos/github/adonisv79/request-swish/badge.svg?branch=master)](https://coveralls.io/github/adonisv79/request-swish?branch=master)


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
import RequestSwishClient, { HTTPRequestConfig } from 'request-swish';
  
const SERVER_URL = 'http://localhost:3000';
const httpStartHandshake: HTTPRequestConfig = {
  method: 'POST',
  url: `${SERVER_URL}/auth/handshake`,
}
const httpKillHandshake: HTTPRequestConfig = {
  method: 'DELETE',
  url: `${SERVER_URL}/auth/handshake`,
}
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
  const r = await swishClient.releaseHandshake()
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
  } catch (err) {
    console.error(err.message)
  }
}

test();

```

Execute the code while running the sample server from the tools in https://github.com/adonisv79/swish-protocol
