importScripts("ecp.js", "sha.js");

/*
 * Converts a multi-precision integer, stored as an array of 31-bit limbs in
 * little-endian order (least significant limb first), into a string of
 * characters in big-endian order (most significant byte first).
 */
function mpn_to_string(mpn) {
	var words = mpn_unpack(mpn);
	var bytes = "";
	for (var i = 0; i < words.length; ++i) {
		var w = words[i];
		bytes += String.fromCharCode(w >> 24 & 0xFF, w >> 16 & 0xFF, w >> 8 & 0xFF, w & 0xFF);
	}
	return bytes;
}

/*
 * Hashes a string and converts the resulting digest into a multi-precision
 * integer, stored as an array of 31-bit limbs in little-endian order (least
 * significant limb first).
 */
function hash_string_to_mpn(string) {
	var sha = new SHA224();
	sha.write(string);
	var view = new DataView(sha.digest().buffer);
	var digest = new Uint32Array(7);
	for (var i = 0; i < 7; ++i) {
		digest[i] = view.getUint32(i * 4);
	}
	return mpn_pack(digest);
}

onmessage = function (event) {
	if (event.data.op == "pubkey") {
		var d = hash_string_to_mpn(event.data.seed);
		var Q = ecp_new(8), R = ecp_new(8);
		ecp_proj(Q, ecp_mul(R, d, secp224k1_G, secp224k1_a, secp224k1_p, 8), secp224k1_p, 8);
		postMessage([ mpn_to_string(Q[0]), mpn_to_string(Q[1]) ]);
	}
	else if (event.data.op == "sign") {
		var d = hash_string_to_mpn(event.data.seed);
		var z = hash_string_to_mpn(event.data.content);
		var r = mpn_new(8), s = mpn_new(8);
		ecp_sign(r, s, secp224k1_p, secp224k1_a, secp224k1_G, secp224k1_n, d, z, 8);
		postMessage([ mpn_to_string(r), mpn_to_string(s) ]);
	}
};
