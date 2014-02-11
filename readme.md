## Coinfloor trade client

Welcome to the Coinfloor Javascript trade client implementation. You can use this example implementation to connect to the Coinfloor API which is currently in private beta. Coinfloor’s application programming interface (API) allows our clients to programmatically access and control aspects of their accounts and place orders on the Coinfloor trading platform.  The JS trading library uses websockets to connect to our trading engine. 

If you are interested in testing using a custom client either in Javascript or using another programming language, feel free to use our libecp wrapper for signing,verifying signatures and generating keys. https://github.com/coinfloor/ruby-libecp

## Signup to our beta
Are you interested in getting rewarded for testing out our trade engine? Sign up to our private beta at (http://eepurl.com/MeuYr). 

## Notes: 
All requests to the Coinfloor’s trading engine go through a load balancer. Clients connecting via websocket should send a ping frame every 45 seconds or so while the connection is otherwise idle. This prevents the load balancer from dropping the connection.

Asset codes: (these might be different when we go live)
```
Bitcoin:0xF800
British Pound: 0xFA20
```

## Let us know your feedback!
We’re looking to get as much feedback as we can from this private beta. We know that there are a lot of areas in which we can improve and we would like to hear your opinion. Contact us at http://support.coinfloor.co.uk! 

## Licence
```
Copyright 2014 Coinfloor LTD.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Requirements
Relies on JS being enabled in the browser and the browser being Websockets compatible. For a detailed overview of Websockets support, see http://caniuse.com/websockets


### Numbers and scale

All numbers given and recieved are integers, numbers entered and returned must be scaled up for down.

For scale information please see [SCALE.md] (SCALE.md)


## API

For an explanation of the API calls and what they return, please see [API.md](API.md)

