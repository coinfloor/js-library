"use strict";

(function () {

	var _worker = new Worker("coinfloor_worker.js");
	var _worker_handlers = [];
	_worker.onmessage = function (event) {
		_worker_handlers.shift().call(this, event.data);
	};

	self.Coinfloor = function () {

		var _self = this;
		var _websocket;
		var _server_nonce;
		var _tag = 0;
		var _idle_ping_timer_id;
		var _event_handlers = {};
		var _result_handlers = {};

		this.on = function (type, handler) {
			var handlers = _event_handlers[type];
			if (handlers) {
				handlers.push(handler);
			}
			else {
				_event_handlers[type] = [ handler ];
			}
		};

		this.trigger = function (type, data) {
			var handlers = _event_handlers[type];
			if (handlers) {
				for (var i = 0; i < handlers.length; ++i) {
					handlers[i].call(this, data);
				}
			}
		};

		this.request = function (request, callback) {
			var tag = request.tag = ++_tag;
			_websocket.send(JSON.stringify(request));
			_result_handlers[tag] = callback;
			reset_idle_ping_timer();
		};

		function reset_idle_ping_timer() {
			if (_idle_ping_timer_id) {
				clearTimeout(_idle_ping_timer_id);
			}
			_idle_ping_timer_id = setTimeout(function () {
				_self.request({ }, null);
			}, 45000);
		}

		/*
		* Initiates a connection to a Coinfloor API server and returns the new
		* WebSocket object. A websocket URL may be given to override the default.
		* If a callback function is provided, it will be invoked after the
		* connection is established.
		*/
		this.connect = function (url, callback) {
			_websocket = new WebSocket(url || "wss://api.coinfloor.co.uk/");
			var handler = function (event) {
				reset_idle_ping_timer();
				var msg = JSON.parse(event.data);
				if (msg.tag !== undefined) {
					var handler = _result_handlers[msg.tag];
					delete _result_handlers[msg.tag];
					if (handler) {
						handler.call(_self, msg);
					}
					else if (handler === undefined) {
						alert("Error code " + msg.error_code + ": " + msg.error_msg);
					}
				}
				else if (msg.notice !== undefined) {
					_self.trigger(msg.notice, msg);
				}
			};
			_websocket.onmessage = function (event) {
				reset_idle_ping_timer();
				var msg = JSON.parse(event.data);
				_server_nonce = atob(msg.nonce);
				this.onmessage = handler;
				if (callback) {
					callback.call(_self, msg);
				}
			};
			return _websocket;
		};

		this._authenticate = function (user_id, cookie, secret, callback) {
			var packed_user_id = String.fromCharCode(0, 0, 0, 0, user_id >> 24 & 0xFF, user_id >> 16 & 0xFF, user_id >> 8 & 0xFF, user_id & 0xFF);
			var client_nonce = "";
			for (var i = 0; i < 16; ++i) {
				client_nonce += String.fromCharCode(Math.random() * 256);
			}
			var data = {
				op: "sign",
				content: packed_user_id + _server_nonce + client_nonce
			};
			if (secret.privkey) {
				data.privkey = secret.privkey;
			}
			else {
				data.seed = packed_user_id + unescape(encodeURIComponent(secret.passphrase));
			}
			_worker.postMessage(data);
			_worker_handlers.push(function (data) {
				_self.request({
					method: "Authenticate",
					user_id: user_id,
					cookie: cookie,
					nonce: btoa(client_nonce),
					signature: [ btoa(data[0]), btoa(data[1]) ]
				}, callback);
			});
		};

		/*
		 * Discrete event hooks are supported for backward compatibility.
		 * New code should register event handlers using on().
		 */
		var _hook_warned;
		function define_hook(type) {
			var _hook, _registered;
			Object.defineProperty(_self, "on" + type, {
				get: function () {
					return _hook;
				},
				set: function (hook) {
					if (!_hook_warned) {
						console.warn("Discrete event hooks are deprecated.");
						_hook_warned = true;
					}
					if (!_registered) {
						_self.on(type, function (msg) {
							if (_hook) {
								_hook(msg);
							}
						});
						_registered = true;
					}
					return _hook = hook;
				},
			});
		}
		define_hook("BalanceChanged");
		define_hook("OrderOpened");
		define_hook("OrdersMatched");
		define_hook("OrderClosed");
		define_hook("TickerChanged");

	};

	/*
	* Authenticates as the specified user with the given authentication cookie
	* and passphrase.
	*/
	Coinfloor.prototype.authenticate = function (user_id, cookie, passphrase, callback) {
		this._authenticate(user_id, cookie, { passphrase: passphrase }, callback);
	};

	/*
	* Retrieves all available balances of the authenticated user.
	*/
	Coinfloor.prototype.getBalances = function (callback) {
		this.request({
			method: "GetBalances"
		}, callback);
	};

	/*
	* Retrieves all open orders of the authenticated user.
	*/
	Coinfloor.prototype.getOrders = function (callback) {
		this.request({
			method: "GetOrders"
		}, callback);
	};

	/*
	* Estimates the total (in units of the counter asset) for a market order
	* trading the specified quantity (in units of the base asset). The
	* quantity should be positive for a buy order or negative for a sell
	* order.
	*/
	Coinfloor.prototype.estimateBaseMarketOrder = function (base, counter, quantity, callback) {
		this.request({
			method: "EstimateMarketOrder",
			base: base,
			counter: counter,
			quantity: quantity
		}, callback);
	};

	/*
	* Estimates the quantity (in units of the base asset) for a market order
	* trading the specified total (in units of the counter asset). The total
	* should be positive for a buy order or negative for a sell order.
	*/
	Coinfloor.prototype.estimateCounterMarketOrder = function (base, counter, total, callback) {
		this.request({
			method: "EstimateMarketOrder",
			base: base,
			counter: counter,
			total: total
		}, callback);
	};

	/*
	* Places a limit order to trade the specified quantity (in units of the
	* base asset) at the specified price or better. The quantity should be
	* positive for a buy order or negative for a sell order. The price should
	* be pre-multiplied by 10000.
	*/
	Coinfloor.prototype.placeLimitOrder = function (base, counter, quantity, price, callback) {
		this.request({
			method: "PlaceOrder",
			base: base,
			counter: counter,
			quantity: quantity,
			price: price
		}, callback);
	};

	/*
	* Executes a market order to trade up to the specified quantity (in units
	* of the base asset). The quantity should be positive for a buy order or
	* negative for a sell order.
	*/
	Coinfloor.prototype.executeBaseMarketOrder = function (base, counter, quantity, callback) {
		this.request({
			method: "PlaceOrder",
			base: base,
			counter: counter,
			quantity: quantity
		}, callback);
	};

	/*
	* Executes a market order to trade up to the specified total (in units of
	* the counter asset). The total should be positive for a buy order or
	* negative for a sell order.
	*/
	Coinfloor.prototype.executeCounterMarketOrder = function (base, counter, total, callback) {
		this.request({
			method: "PlaceOrder",
			base: base,
			counter: counter,
			total: total
		}, callback);
	};

	/*
	* Cancels the specified open order.
	*/
	Coinfloor.prototype.cancelOrder = function (id, callback) {
		this.request({
			method: "CancelOrder",
			id: id
		}, callback);
	};

	/*
	* Cancels all open orders belonging to the authenticated user.
	*/
	Coinfloor.prototype.cancelAllOrders = function (callback) {
		this.request({
			method: "CancelAllOrders"
		}, callback);
	};

	/*
	* Retrieves the trailing 30-day trading volume of the authenticated user
	* in the specified asset.
	*/
	Coinfloor.prototype.getTradeVolume = function (asset, callback) {
		this.request({
			method: "GetTradeVolume",
			asset: asset
		}, callback);
	};

	/*
	* Subscribes to (or unsubscribes from) the orders feed of the specified
	* order book. Subscribing to feeds does not require authentication.
	*/
	Coinfloor.prototype.watchOrders = function (base, counter, watch, callback) {
		this.request({
			method: "WatchOrders",
			base: base,
			counter: counter,
			watch: watch
		}, callback);
	};

	/*
	* Subscribes to (or unsubscribes from) the ticker feed of the specified
	* order book. Subscribing to feeds does not require authentication.
	*/
	Coinfloor.prototype.watchTicker = function (base, counter, watch, callback) {
		this.request({
			method: "WatchTicker",
			base: base,
			counter: counter,
			watch: watch
		}, callback);
	};

	// singleton instance for backward compatibility
	Coinfloor = new Coinfloor();

})();
