"use strict";

(function () {

	var _rc = [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	];

	var _words = new Uint32Array(64);

	function SHA256Base(hash_init) {

		var _hash = new Uint32Array(hash_init);
		var _length = 0;
		var _buffer = new Uint8Array(64);
		var _pos = 0;
		var _view = new DataView(_buffer.buffer);

		function update() {
			function rotr(v, s) {
				return v >>> s | v << 32 - s;
			}
			for (var i = 0; i < 16; ++i) {
				_words[i] = _view.getUint32(i * 4);
			}
			for (var i = 16; i < 64; ++i) {
				var w15 = _words[i - 15], w2 = _words[i - 2];
				_words[i] = _words[i - 16] + (rotr(w15, 7) ^ rotr(w15, 18) ^ w15 >>> 3) + _words[i - 7] + (rotr(w2, 17) ^ rotr(w2, 19) ^ w2 >>> 10);
			}
			var a = _hash[0], b = _hash[1], c = _hash[2], d = _hash[3], e = _hash[4], f = _hash[5], g = _hash[6], h = _hash[7];
			for (var i = 0; i < 64; ++i) {
				var t1 = h + ((g ^ f) & e ^ g) + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + _rc[i] + _words[i];
				h = g, g = f, f = e, e = d + t1 | 0;
				var t2 = (c & (b ^ a) ^ b & a) + (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22));
				d = c, c = b, b = a, a = t1 + t2 | 0;
			}
			_hash[0] += a, _hash[1] += b, _hash[2] += c, _hash[3] += d, _hash[4] += e, _hash[5] += f, _hash[6] += g, _hash[7] += h;
		}

		this.write = function (string) {
			for (var i = 0; i < string.length; ++i) {
				_buffer[_pos++] = string.charCodeAt(i);
				if (_pos == 64) {
					update();
					_pos = 0;
				}
			}
			_length += string.length;
		};

		this.digest = function (l) {
			var length = _length;
			this.write("\x80");
			if (_pos > 56) {
				while (_pos < 64) {
					_buffer[_pos++] = 0;
				}
				update();
				_pos = 0;
			}
			while (_pos < 59) {
				_buffer[_pos++] = 0;
			}
			_buffer[59] = length >>> 29, _buffer[60] = length >>> 21, _buffer[61] = length >>> 13, _buffer[62] = length >>> 5, _buffer[63] = length << 3;
			update();
			var digest = new Uint8Array(l * 4), view = new DataView(digest.buffer);
			for (var i = 0; i < l; ++i) {
				view.setUint32(i * 4, _hash[i]);
			}
			this.reset();
			return digest;
		};

		this.reset = function () {
			_hash.set(hash_init);
			_pos = _length = 0;
		};

	}

	var SHA256_init = [
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	];

	self.SHA256 = function () {

		var _base = new SHA256Base(SHA256_init);

		this.write = function (string) {
			return _base.write(string);
		};

		this.digest = function () {
			return _base.digest(8);
		};

		this.reset = function () {
			return _base.reset();
		};

	};

	var SHA224_init = [
		0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
	];

	self.SHA224 = function () {

		var _base = new SHA256Base(SHA224_init);

		this.write = function (string) {
			return _base.write(string);
		};

		this.digest = function () {
			return _base.digest(7);
		};

		this.reset = function () {
			return _base.reset();
		};

	};

})();
