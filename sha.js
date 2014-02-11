function rotr(v, s) {
	return v >>> s | v << 32 - s;
}

_SHA256Base = function () { };
_SHA256Base.prototype._rc = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
_SHA256Base.prototype._words = new Uint32Array(64);
_SHA256Base.prototype._init = function () {
	this._hash = new Uint32Array(this._hash_init);
	this._length = 0;
	this._buffer = new Uint8Array(64);
	this._pos = 0;
	this._view = new DataView(this._buffer.buffer);
};
_SHA256Base.prototype._update = function () {
	var words = this._words, view = this._view;
	for (var i = 0; i < 16; ++i) {
		words[i] = view.getUint32(i * 4);
	}
	for (var i = 16; i < 64; ++i) {
		var w15 = words[i - 15], w2 = words[i - 2];
		words[i] = words[i - 16] + (rotr(w15, 7) ^ rotr(w15, 18) ^ w15 >>> 3) + words[i - 7] + (rotr(w2, 17) ^ rotr(w2, 19) ^ w2 >>> 10);
	}
	var hash = this._hash, rc = this._rc;
	var a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
	for (var i = 0; i < 64; ++i) {
		var t1 = h + ((g ^ f) & e ^ g) + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + rc[i] + words[i];
		h = g, g = f, f = e, e = d + t1 | 0;
		var t2 = (c & (b ^ a) ^ b & a) + (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22));
		d = c, c = b, b = a, a = t1 + t2 | 0;
	}
	hash[0] += a, hash[1] += b, hash[2] += c, hash[3] += d, hash[4] += e, hash[5] += f, hash[6] += g, hash[7] += h;
};
_SHA256Base.prototype._finish = function () {
	var length = this._length;
	this.write("\x80");
	var buffer = this._buffer, pos = this._pos;
	if (pos > 56) {
		while (pos < 64) {
			buffer[pos++] = 0;
		}
		this._update();
		pos = 0;
	}
	while (pos < 59) {
		buffer[pos++] = 0;
	}
	buffer[59] = length >>> 29, buffer[60] = length >>> 21, buffer[61] = length >>> 13, buffer[62] = length >>> 5, buffer[63] = length << 3;
	this._update();
};
_SHA256Base.prototype.write = function (string) {
	var buffer = this._buffer, pos = this._pos;
	for (var i = 0; i < string.length; ++i) {
		buffer[pos++] = string.charCodeAt(i);
		if (pos == 64) {
			this._update();
			pos = 0;
		}
	}
	this._pos = pos;
	this._length += string.length;
};
_SHA256Base.prototype.digest = function () {
	this._finish();
	var digest = new Uint8Array(32), view = new DataView(digest.buffer);
	var hash = this._hash;
	for (var i = 0; i < 8; ++i) {
		view.setUint32(i * 4, hash[i]);
	}
	this.reset();
	return digest;
};
_SHA256Base.prototype.reset = function () {
	this._hash.set(this._hash_init);
	this._pos = this._length = 0;
};

SHA224 = function () {
	this._init();
};
SHA224.prototype = new _SHA256Base();
SHA224.prototype._hash_init = [
	0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
];
SHA224.prototype.digest = function () {
	return new Uint8Array(_SHA256Base.prototype.digest.call(this).buffer, 0, 28);
};

SHA256 = function () {
	this._init();
};
SHA256.prototype = new _SHA256Base();
SHA256.prototype._hash_init = [
	0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];
