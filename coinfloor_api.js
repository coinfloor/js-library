Coinfloor = {
	_worker: new Worker("coinfloor_worker.js"),
	_worker_handlers: [],
	_tag: 0,
	_result_handlers: [],

	_do_request: function (request, callback) {
		var tag = request.tag = ++this._tag;
		this._websocket.send(JSON.stringify(request));
		this._result_handlers[tag] = callback;
		this._reset_idle_ping_timer();
	},

	_reset_idle_ping_timer: function () {
		if (this._idle_ping_timer_id) {
			clearTimeout(this._idle_ping_timer_id);
		}
		this._idle_ping_timer_id = setTimeout(function () {
			Coinfloor._do_request({ }, function () { });
		}, 45000);
	},

	/*
	 * Initiates a connection to a Coinfloor API server and returns the new
	 * WebSocket object. A websocket URL may be given to override the default.
	 * If a callback function is provided, it will be invoked after the
	 * connection is established.
	 */
	connect: function (url, callback) {
		var ws = this._websocket = new WebSocket(url || "ws://api.coinfloor.co.uk/");
		var handler = function (event) {
			Coinfloor._reset_idle_ping_timer();
			var msg = JSON.parse(event.data);
			if (msg.tag !== undefined) {
				var handler = Coinfloor._result_handlers[msg.tag];
				delete Coinfloor._result_handlers[msg.tag];
				if (handler) {
					handler.call(Coinfloor, msg);
				}
				else if (handler === undefined) {
					alert("Error code " + msg.error_code + ": " + msg.error_msg);
				}
			}
			else if (msg.notice == "BalanceChanged") {
				Coinfloor.onBalanceChanged && Coinfloor.onBalanceChanged(msg);
			}
			else if (msg.notice == "OrderOpened") {
				Coinfloor.onOrderOpened && Coinfloor.onOrderOpened(msg);
			}
			else if (msg.notice == "OrdersMatched") {
				Coinfloor.onOrdersMatched && Coinfloor.onOrdersMatched(msg);
			}
			else if (msg.notice == "OrderClosed") {
				Coinfloor.onOrderClosed && Coinfloor.onOrderClosed(msg);
			}
			else if (msg.notice == "TickerChanged") {
				Coinfloor.onTickerChanged && Coinfloor.onTickerChanged(msg);
			}
		};
		ws.onmessage = function (event) {
			Coinfloor._reset_idle_ping_timer();
			var msg = JSON.parse(event.data);
			Coinfloor._server_nonce = atob(msg.nonce);
			this.onmessage = handler;
			callback.call(Coinfloor, msg);
		};
		return ws;
	},

	/*
	 * Authenticates as the specified user with the given authentication cookie
	 * and passphrase.
	 */
	authenticate: function (user_id, cookie, passphrase, callback) {
		var packed_user_id = String.fromCharCode(0, 0, 0, 0, user_id >> 24 & 0xFF, user_id >> 16 & 0xFF, user_id >> 8 & 0xFF, user_id & 0xFF);
		var client_nonce = "";
		for (var i = 0; i < 16; ++i) {
			client_nonce += String.fromCharCode(Math.random() * 256);
		}
		this._worker.postMessage({
			op: "sign",
			seed: packed_user_id + unescape(encodeURIComponent(passphrase)),
			content: packed_user_id + this._server_nonce + client_nonce
		});
		this._worker_handlers.push(function (data) {
			this._do_request({
				method: "Authenticate",
				user_id: user_id,
				cookie: cookie,
				nonce: btoa(client_nonce),
				signature: [ btoa(data[0]), btoa(data[1]) ]
			}, callback);
		});
	},

	/*
	 * Retrieves all available balances of the authenticated user.
	 */
	getBalances: function (callback) {
		this._do_request({
			method: "GetBalances"
		}, callback);
	},

	/*
	 * Retrieves all open orders of the authenticated user.
	 */
	getOrders: function (callback) {
		this._do_request({
			method: "GetOrders"
		}, callback);
	},

	/*
	 * Estimates the total (in units of the counter asset) for a market order
	 * trading the specified quantity (in units of the base asset). The
	 * quantity should be positive for a buy order or negative for a sell
	 * order.
	 */
	estimateBaseMarketOrder: function (base, counter, quantity, callback) {
		this._do_request({
			method: "EstimateMarketOrder",
			base: base,
			counter: counter,
			quantity: quantity
		}, callback);
	},

	/*
	 * Estimates the quantity (in units of the base asset) for a market order
	 * trading the specified total (in units of the counter asset). The total
	 * should be positive for a buy order or negative for a sell order.
	 */
	estimateCounterMarketOrder: function (base, counter, total, callback) {
		this._do_request({
			method: "EstimateMarketOrder",
			base: base,
			counter: counter,
			total: total
		}, callback);
	},

	/*
	 * Places a limit order to trade the specified quantity (in units of the
	 * base asset) at the specified price or better. The quantity should be
	 * positive for a buy order or negative for a sell order. The price should
	 * be pre-multiplied by 10000.
	 */
	placeLimitOrder: function (base, counter, quantity, price, callback) {
		this._do_request({
			method: "PlaceOrder",
			base: base,
			counter: counter,
			quantity: quantity,
			price: price
		}, callback);
	},

	/*
	 * Executes a market order to trade up to the specified quantity (in units
	 * of the base asset). The quantity should be positive for a buy order or
	 * negative for a sell order.
	 */
	executeBaseMarketOrder: function (base, counter, quantity, callback) {
		this._do_request({
			method: "PlaceOrder",
			base: base,
			counter: counter,
			quantity: quantity
		}, callback);
	},

	/*
	 * Executes a market order to trade up to the specified total (in units of
	 * the counter asset). The total should be positive for a buy order or
	 * negative for a sell order.
	 */
	executeCounterMarketOrder: function (base, counter, total, callback) {
		this._do_request({
			method: "PlaceOrder",
			base: base,
			counter: counter,
			total: total
		}, callback);
	},

	/*
	 * Cancels the specified open order.
	 */
	cancelOrder: function (id, callback) {
		this._do_request({
			method: "CancelOrder",
			id: id
		}, callback);
	},

	/*
	 * Retrieves the trailing 30-day trading volume of the authenticated user
	 * in the specified asset.
	 */
	getTradeVolume: function (asset, callback) {
		this._do_request({
			method: "GetTradeVolume",
			asset: asset
		}, callback);
	},

	/*
	 * Subscribes to (or unsubscribes from) the orders feed of the specified
	 * order book. Subscribing to feeds does not require authentication.
	 */
	watchOrders: function (base, counter, watch, callback) {
		this._do_request({
			method: "WatchOrders",
			base: base,
			counter: counter,
			watch: watch
		}, callback);
	},

	/*
	 * Subscribes to (or unsubscribes from) the ticker feed of the specified
	 * order book. Subscribing to feeds does not require authentication.
	 */
	watchTicker: function (base, counter, watch, callback) {
		this._do_request({
			method: "WatchTicker",
			base: base,
			counter: counter,
			watch: watch
		}, callback);
	},

	/*
	 * A user-supplied callback that is invoked when an available balance of
	 * the authenticated user has changed.
	 */
	onBalanceChanged: null,

	/*
	 * A user-supplied callback that is invoked when an order is opened. Only
	 * events pertaining to the authenticated user's own orders are reported to
	 * this callback unless the client is subscribed to the orders feed of an
	 * order book.
	 */
	onOrderOpened: null,

	/*
	 * A user-supplied callback that is invoked when two orders are matched
	 * (and thus a trade occurs). Only events pertaining to the authenticated
	 * user's own orders are reported to this callback unless the client is
	 * subscribed to the orders feed of an order book.
	 */
	onOrdersMatched: null,

	/*
	 * A user-supplied callback that is invoked when an order is closed. Only
	 * events pertaining to the authenticated user's own orders are reported to
	 * this callback unless the client is subscribed to the orders feed of an
	 * order book.
	 */
	onOrderClosed: null,

	/*
	 * A user-supplied callback that is invoked when a ticker changes. Events
	 * are reported to this callback only if the client is subscribed to the
	 * ticker feed of an order book.
	 */
	onTickerChanged: null
};
Coinfloor._worker.onmessage = function (event) {
	Coinfloor._worker_handlers.shift().call(Coinfloor, event.data);
};
