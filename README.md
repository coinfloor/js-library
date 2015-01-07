js-library
==========

## Coinfloor's JavaScript client library

Coinfloor's application programming interface (API) provides our clients programmatic access to control aspects of their accounts and to place orders on the Coinfloor trading platform. The JavaScript client library exposes the Coinfloor API to your JavaScript application.

### Invocation model

Each API method accepts a callback function object that will be invoked when the result of the method is available. The callback function receives the reply object exactly as received from the server, so it should check the `error_code` field in the message and act accordingly.

### Example

Please take a look at the Coinfloor trade page, which has been implemented using this JavaScript client library.


## API

For an explanation of our API methods and what they return, please see our [API specification](https://github.com/coinfloor/API).

### Numbers and scale

All quantities and prices are transmitted and received as integers with implicit scale factors. For scale information, please see [SCALE.md](https://github.com/coinfloor/API/blob/master/SCALE.md).


## Requirements

Use of this library requires a JavaScript engine that supports the [WebSocket protocol](https://tools.ietf.org/html/rfc6455).
If your application is a web application, please see this [list of supporting web browsers](http://caniuse.com/websockets).


## Licence

Copyright 2014 Coinfloor LTD.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

> http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.


## Give us your feedback!

We're always looking to get as much feedback as we can. We want to hear your opinion. [Contact us](http://support.coinfloor.co.uk/).
