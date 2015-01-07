"use strict";

importScripts("ecp.js", "sha.js");

/*
 * Converts an array of words in big-endian order (most significant word first)
 * into a string of bytes in big-endian order (most significant byte first).
 */
function words_to_string(words) {
	var bytes = "";
	for (var i = 0; i < words.length; ++i) {
		var w = words[i];
		bytes += String.fromCharCode(w >> 24 & 0xFF, w >> 16 & 0xFF, w >> 8 & 0xFF, w & 0xFF);
	}
	return bytes;
}

/*
 * Converts a string of bytes in big-endian order (most significant byte first)
 * into an array of words in big-endian order (most significant word first).
 */
function string_to_words(string) {
	var words = [];
	for (var i = 0; i < string.length; i += 4) {
		words.push(string.charCodeAt(i) << 24 | string.charCodeAt(i + 1) << 16 | string.charCodeAt(i + 2) << 8 | string.charCodeAt(i + 3));
	}
	return words;
}

/*
 * Hashes a string and returns the resulting digest as an array of words in
 * big-endian order (most significant word first).
 */
function hash_string_to_words(string) {
	var sha = new SHA224();
	sha.write(string);
	var view = new DataView(sha.digest().buffer);
	var digest = new Uint32Array(7);
	for (var i = 0; i < 7; ++i) {
		digest[i] = view.getUint32(i * 4);
	}
	return digest;
}

onmessage = function (event) {
	switch (event.data.op) {
		case "privkey":
			postMessage(words_to_string(hash_string_to_words(event.data.seed)));
			break;
		case "pubkey":
			var d = mpn_pack(event.data.privkey ? string_to_words(event.data.privkey) : hash_string_to_words(event.data.seed));
			var Q = ecp_new(8), R = ecp_new(8);
			ecp_proj(Q, ecp_mul(R, d, secp224k1_G, secp224k1_a, secp224k1_p, 8), secp224k1_p, 8);
			postMessage([ words_to_string(mpn_unpack(Q[0])), words_to_string(mpn_unpack(Q[1])) ]);
			break;
		case "sign":
			var d = mpn_pack(event.data.privkey ? string_to_words(event.data.privkey) : hash_string_to_words(event.data.seed));
			var z = mpn_pack(hash_string_to_words(event.data.content));
			var r = mpn_new(8), s = mpn_new(8);
			ecp_sign(r, s, secp224k1_p, secp224k1_a, secp224k1_G, secp224k1_n, d, z, 8);
			postMessage([ words_to_string(mpn_unpack(r)), words_to_string(mpn_unpack(s)) ]);
			break;
	}
};
