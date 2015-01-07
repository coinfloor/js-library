"use strict";

(function () {

	/*
	* Packs an unsigned multi-precision integer, stored as an array of 32-bit
	* words (e.g., a Uint32Array) in big-endian order (most significant word
	* first), into an array of 31-bit limbs in little-endian order (least
	* significant limb first), suitable for use with the mpn_* math functions.
	*/
	self.mpn_pack = function (words) {
		var k = words.length, n = mpn_new(Math.ceil(k * 32 / 31)), w, wr = 0, l = 0, lr = 31;
		for (var i = 0, j = 0;;) {
			if (wr == 0) {
				if (++i > k) {
					if (l != 0) {
						n[j++] = l >>> lr;
					}
					return n;
				}
				w = words[k - i], wr = 32;
			}
			var s = Math.min(wr, lr);
			l = l >>> s | (w & (1 << s) - 1) << 31 - s, w >>>= s;
			if ((lr -= s) == 0) {
				n[j++] = l;
				l = 0, lr = 31;
			}
			wr -= s;
		}
	};

	/*
	* Unpacks an unsigned multi-precision integer, stored as an array of 31-bit
	* limbs in little-endian order (least significant limb first), into an array
	* of 32-bit words (a Uint32Array) in big-endian order (most significant word
	* first).
	*/
	self.mpn_unpack = function (n) {
		var k = n.length, words = new Uint32Array(Math.floor(k * 31 / 32)), l, lr = 0, w = 0, wr = 32;
		for (var i = 0, j = 0;;) {
			if (lr == 0) {
				if (i >= k) {
					if (w != 0) {
						words[words.length - ++j] = w >>> wr;
					}
					return words;
				}
				l = n[i++], lr = 31;
			}
			var s = Math.min(lr, wr);
			w = w >>> s | (l & (1 << s) - 1) << 32 - s, l >>>= s;
			if ((wr -= s) == 0) {
				words[words.length - ++j] = w;
				w = 0, wr = 32;
			}
			lr -= s;
		}
	};

	/*
	* Allocates and zeros a new multi-precision integer having the specified
	* number of limbs.
	*/
	self.mpn_new = function (l) {
		var n = new Array(l);
		mpn_zero(n, l);
		return n;
	};

	/*
	* Returns whether the given multi-precision integer is equal to zero.
	*/
	self.mpn_zero_p = function (n, l) {
		for (var i = 0; i < l; ++i) {
			if (n[i] != 0) {
				return false;
			}
		}
		return true;
	};

	/*
	* Returns whether the given multi-precision integer is equal to one.
	*/
	self.mpn_one_p = function (n, l) {
		if (l <= 0 || n[0] != 1) {
			return false;
		}
		for (var i = 1; i < l; ++i) {
			if (n[i] != 0) {
				return false;
			}
		}
		return true;
	};

	/*
	* Returns whether the given multi-precision integer is even.
	*/
	self.mpn_even_p = function (n, l) {
		return l == 0 || (n[0] & 1) == 0;
	};

	/*
	* Compares two unsigned multi-precision integers. Returns a negative value if
	* n1 < n2, a positive value if n1 > n2, or zero if n1 == n2.
	*/
	self.mpn_cmp = function (n1, n2, l) {
		while (l > 0) {
			var c = n1[--l] - n2[l];
			if (c != 0) {
				return c;
			}
		}
		return 0;
	};

	/*
	* Sets the given multi-precision integer to zero.
	*/
	self.mpn_zero = function (r, l) {
		for (var i = 0; i < l; ++i) {
			r[i] = 0;
		}
	};

	/*
	* Copies the given multi-precision integer s into r.
	*/
	self.mpn_copyi = function (r, s, l) {
		for (var i = 0; i < l; ++i) {
			r[i] = s[i];
		}
	};

	/*
	* Adds two multi-precision integers n1 and n2, stores their sum into r, and
	* returns whether the addition overflowed (i.e., returns the "carry-out bit").
	*/
	self.mpn_add = function (r, n1, n2, l) {
		var c = 0;
		for (var i = 0; i < l; ++i) {
			r[i] = (c = (c >>> 31) + n1[i] + n2[i]) & 0x7FFFFFFF;
		}
		return c >>> 31;
	};

	/*
	* Subtracts two multi-precision integers n1 and n2, stores the difference n1 -
	* n2 into r, and returns whether the subtraction underflowed (i.e., returns
	* the "borrow-out bit").
	*/
	self.mpn_sub = function (r, n1, n2, l) {
		var c = 0;
		for (var i = 0; i < l; ++i) {
			r[i] = (c = (c >> 31) + n1[i] - n2[i]) & 0x7FFFFFFF;
		}
		return c >> 31;
	};

	/*
	* Doubles the given multi-precision integer n, stores the result into r, and
	* returns whether the result overflowed (i.e., returns the "carry-out bit").
	*/
	self.mpn_dbl = function (r, n, l) {
		var c = 0;
		for (var i = 0; i < l; ++i) {
			r[i] = (c = c >>> 31 | n[i] << 1) & 0x7FFFFFFF;
		}
		return c >>> 31;
	};

	/*
	* Logically shifts the given multi-precision integer n by one bit to the
	* right, stores the result into r, and returns the bit shifted out.
	*/
	self.mpn_shr1 = function (r, n, l) {
		var c = 0;
		while (l > 0) {
			var w = n[--l] | c;
			c = w << 31;
			r[l] = w >>> 1;
		}
		return c;
	};

	/*
	* Adds two multi-precision integers n1 and n2 in the finite field of order p,
	* stores their sum into r, and returns r.
	*/
	self.fp_add = function (r, n1, n2, p, l) {
		if (mpn_add(r, n1, n2, l) || mpn_cmp(r, p, l) >= 0) {
			mpn_sub(r, r, p, l);
		}
		return r;
	};

	/*
	* Subtracts two multi-precision integers n1 and n2 in the finite field of
	* order p, stores the difference n1 - n2 into r, and returns r.
	*/
	self.fp_sub = function (r, n1, n2, p, l) {
		if (mpn_sub(r, n1, n2, l)) {
			mpn_add(r, r, p, l);
		}
		return r;
	};

	/*
	* Doubles the given multi-precision integer n in the finite field of order p,
	* stores the result into r, and returns r.
	*/
	self.fp_dbl = function (r, n, p, l) {
		if (mpn_dbl(r, n, l) || mpn_cmp(r, p, l) >= 0) {
			mpn_sub(r, r, p, l);
		}
		return r;
	};

	/*
	* Multiplies two multi-precision integers n1 and n2 in the finite field of
	* order p, stores their product into r, and returns r.
	*/
	self.fp_mul = function (r, n1, n2, p, l) {
		mpn_zero(r, l);
		var active = false;
		for (var i = l; i > 0;) {
			var w = n2[--i];
			for (var j = 31; j > 0; --j) {
				if (active) {
					fp_dbl(r, r, p, l);
				}
				if ((w <<= 1) < 0) {
					fp_add(r, r, n1, p, l);
					active = true;
				}
			}
		}
		return r;
	};

	/*
	* Squares the given multi-precision integer n in the finite field of order p,
	* stores the square into r, and returns r.
	*/
	self.fp_sqr = function (r, n, p, l) {
		return fp_mul(r, n, n, p, l);
	};

	var _fp_u = mpn_new(9), _fp_v = mpn_new(9), _fp_s = mpn_new(9);

	/*
	* Inverts the given multi-precision integer n in the finite field of order p,
	* stores the inverse into r, and returns r.
	*/
	self.fp_inv = function (r, n, p, l) {
		if (mpn_zero_p(n, l)) {
			throw new RangeError("not invertible");
		}
		var u = _fp_u, v = _fp_v, s = _fp_s;
		mpn_copyi(u, n, l), mpn_copyi(v, p, l);
		mpn_zero(r, l), mpn_zero(s, l);
		r[0] = 1;
		for (;;) {
			if (mpn_one_p(u, l)) {
				return r;
			}
			if (mpn_one_p(v, l)) {
				mpn_copyi(r, s, l);
				return r;
			}
			while (mpn_even_p(u, l)) {
				mpn_shr1(u, u, l);
				if (mpn_even_p(r, l)) {
					mpn_shr1(r, r, l);
				}
				else {
					var c = mpn_add(r, r, p, l) << 30;
					mpn_shr1(r, r, l);
					r[l - 1] |= c;
				}
			}
			while (mpn_even_p(v, l)) {
				mpn_shr1(v, v, l);
				if (mpn_even_p(s, l)) {
					mpn_shr1(s, s, l);
				}
				else {
					var c = mpn_add(s, s, p, l) << 30;
					mpn_shr1(s, s, l);
					s[l - 1] |= c;
				}
			}
			if (mpn_cmp(u, v, l) >= 0) {
				mpn_sub(u, u, v, l);
				fp_sub(r, r, s, p, l);
			}
			else {
				mpn_sub(v, v, u, l);
				fp_sub(s, s, r, p, l);
			}
		}
	};

	var _ecp_t0 = mpn_new(9), _ecp_t1 = mpn_new(9), _ecp_t2 = mpn_new(9), _ecp_t3 = mpn_new(9), _ecp_t4 = mpn_new(9), _ecp_t5 = mpn_new(9), _ecp_t6 = mpn_new(9);

	/*
	* Allocates and returns a new elliptic-curve point with coordinates having the
	* specified number of limbs.
	*/
	self.ecp_new = function (l) {
		return [ mpn_new(l), mpn_new(l), mpn_new(l) ];
	};

	/*
	* Copies the elliptic-curve point at N into R and returns R.
	*/
	self.ecp_copy = function (R, N, l) {
		mpn_copyi(R[0], N[0], l), mpn_copyi(R[1], N[1], l), mpn_copyi(R[2], N[2], l);
		return R;
	};

	/*
	* Doubles the elliptic-curve point N on the curve with parameter a in the
	* finite field of order p, stores the result in R, and returns R.
	*/
	self.ecp_dbl = function (R, N, a, p, l) {
		var x = N[0], y = N[1], z = N[2];
		var xr = R[0], yr = R[1], zr = R[2];
		if (mpn_zero_p(z, l)) {
			mpn_zero(xr, l), mpn_zero(yr, l), mpn_zero(zr, l);
			return R;
		}
		var t0 = _ecp_t0, t1 = _ecp_t1, t2 = _ecp_t2, t3 = _ecp_t3;
		fp_add(t0, t0, fp_dbl(t1, fp_sqr(t0, x, p, l), p, l), p, l);
		if (!mpn_zero_p(a, l)) {
			fp_add(t0, t0, fp_mul(t1, a, fp_sqr(t2, fp_sqr(t1, z, p, l), p, l), p, l), p, l);
		}
		fp_dbl(t1, fp_sqr(t1, y, p, l), p, l);
		fp_dbl(t2, fp_mul(t2, x, t1, p, l), p, l);
		fp_dbl(t3, fp_sqr(t3, t1, p, l), p, l);
		fp_sub(xr, fp_sqr(xr, t0, p, l), fp_dbl(t1, t2, p, l), p, l);
		fp_sub(yr, fp_mul(yr, t0, fp_sub(t1, t2, xr, p, l), p, l), t3, p, l);
		fp_dbl(zr, fp_mul(zr, y, z, p, l), p, l);
		return R;
	};

	/*
	* Adds two elliptic-curve points N1 and N2 on the curve with parameter a in
	* the finite field of order p, stores the result in R, and returns R. Point N2
	* must be given in affine coordinates (i.e., N2[2] == 1).
	*/
	self.ecp_add_aff = function (R, N1, N2, a, p, l) {
		var x1 = N1[0], y1 = N1[1], z1 = N1[2], x2 = N2[0], y2 = N2[1];
		var xr = R[0], yr = R[1], zr = R[2];
		var t0 = _ecp_t0, t1 = _ecp_t1, t2 = _ecp_t2, t3 = _ecp_t3, t4 = _ecp_t4;
		fp_sqr(t0, z1, p, l);
		fp_mul(t1, x2, t0, p, l);
		fp_mul(t2, z1, t0, p, l);
		fp_mul(t0, y2, t2, p, l);
		if (mpn_cmp(t1, x1, l) == 0) {
			if (mpn_cmp(t0, y1, l) == 0) {
				return ecp_dbl(R, N1, a, p, l);
			}
			mpn_zero(xr, l), mpn_zero(yr, l), mpn_zero(zr, l);
			xr[0] = yr[0] = 1;
			return R;
		}
		fp_sub(t2, t1, x1, p, l);
		fp_sub(t1, t0, y1, p, l);
		fp_sqr(t0, t2, p, l);
		fp_mul(t3, t0, t2, p, l);
		fp_mul(t4, x1, t0, p, l);
		fp_sub(xr, fp_sub(xr, fp_sqr(xr, t1, p, l), t3, p, l), fp_dbl(t0, t4, p, l), p, l);
		fp_sub(yr, fp_mul(yr, t1, fp_sub(t4, t4, xr, p, l), p, l), fp_mul(t0, y1, t3, p, l), p, l);
		fp_mul(zr, z1, t2, p, l);
		return R;
	};

	/*
	* Adds two elliptic-curve points N1 and N2 on the curve with parameter a in
	* the finite field of order p, stores the result in R, and returns R.
	*/
	self.ecp_add = function (R, N1, N2, a, p, l) {
		var x1 = N1[0], y1 = N1[1], z1 = N1[2], x2 = N2[0], y2 = N2[1], z2 = N2[2];
		var xr = R[0], yr = R[1], zr = R[2];
		if (mpn_zero_p(z1, l)) {
			if (mpn_zero_p(z2, l)) {
				mpn_zero(xr, l), mpn_zero(yr, l), mpn_zero(zr, l);
				return R;
			}
			return ecp_copy(R, N2, l);
		}
		if (mpn_zero_p(z2, l)) {
			return ecp_copy(R, N1, l);
		}
		if (mpn_one_p(z2, l)) {
			return ecp_add_aff(R, N1, N2, a, p, l);
		}
		var t0 = _ecp_t0, t1 = _ecp_t1, t2 = _ecp_t2, t3 = _ecp_t3, t4 = _ecp_t4, t5 = _ecp_t5, t6 = _ecp_t6;
		fp_sqr(t0, z1, p, l);
		fp_mul(t1, x2, t0, p, l);
		fp_mul(t2, z1, t0, p, l);
		fp_mul(t0, y2, t2, p, l);
		fp_sqr(t2, z2, p, l);
		fp_mul(t3, x1, t2, p, l);
		fp_mul(t4, z2, t2, p, l);
		fp_mul(t2, y1, t4, p, l);
		if (mpn_cmp(t3, t1, l) == 0) {
			if (mpn_cmp(t2, t0, l) == 0) {
				return ecp_dbl(R, N1, a, p, l);
			}
			mpn_zero(xr, l), mpn_zero(yr, l), mpn_zero(zr, l);
			xr[0] = yr[0] = 1;
			return R;
		}
		fp_sub(t4, t1, t3, p, l);
		fp_sub(t1, t0, t2, p, l);
		fp_sqr(t0, t4, p, l);
		fp_mul(t5, t4, t0, p, l);
		fp_mul(t6, t3, t0, p, l);
		fp_sub(xr, fp_sub(xr, fp_sqr(xr, t1, p, l), t5, p, l), fp_dbl(t0, t6, p, l), p, l);
		fp_sub(yr, fp_mul(yr, t1, fp_sub(t6, t6, xr, p, l), p, l), fp_mul(t0, t2, t5, p, l), p, l);
		fp_mul(zr, t4, fp_mul(t0, z1, z2, p, l), p, l);
		return R;
	};

	var _ecp_S = ecp_new(9);

	/*
	* Multiplies the elliptic-curve point N2 on the curve with parameter a by
	* scalar n1 in the finite field of order p, stores the result in R, and
	* returns R.
	*/
	self.ecp_mul = function (R, n1, N2, a, p, l) {
		var add = mpn_one_p(N2[2], l) ? ecp_add_aff : ecp_add;
		var active = false, swaps = 0, S = _ecp_S, T;
		for (var i = l; i > 0;) {
			var w = n1[--i];
			for (var j = 31; j > 0; --j) {
				if (active) {
					ecp_dbl(S, R, a, p, l);
					T = S, S = R, R = T, ++swaps;
				}
				if ((w <<= 1) < 0) {
					if (active) {
						add(S, R, N2, a, p, l);
						T = S, S = R, R = T, ++swaps;
					}
					else {
						ecp_copy(R, N2, l);
						active = true;
					}
				}
			}
		}
		if (swaps & 1) {
			return ecp_copy(S, R, l);
		}
		return R;
	};

	/*
	* Projects the elliptic-curve point N into affine coordinate space in the
	* finite field of order p, stores the projection in R, and returns R.
	*/
	self.ecp_proj = function (R, N, p, l) {
		var x = N[0], y = N[1], z = N[2];
		var xr = R[0], yr = R[1], zr = R[2];
		var t0 = _ecp_t0, t1 = _ecp_t1, t2 = _ecp_t2;
		fp_mul(t2, t0, fp_sqr(t1, fp_inv(t0, z, p, l), p, l), p, l);
		fp_mul(xr, x, t1, p, l);
		fp_mul(yr, y, t2, p, l);
		mpn_zero(zr, l), zr[0] = 1;
		return R;
	};

	/*
	* Derives the elliptic-curve public key on the curve with parameter a in the
	* finite field of order p from the given private key d using generator point
	* G, and stores the result in Q.
	*/
	self.ecp_pubkey = function (Q, p, a, G, d, l) {
		var R = ecp_new(l);
		ecp_proj(Q, ecp_mul(R, d, G, a, p, l), p, l);
	};

	/*
	* Signs a message z on the elliptic curve with paramater a in the finite field
	* of order p using the given private key d and generator point G having cyclic
	* order n, and stores the signature components in r and s.
	*/
	self.ecp_sign = function (r, s, p, a, G, n, d, z, l) {
		var R = ecp_new(l), S = ecp_new(l), k = mpn_new(l);
		for (;;) {
			for (var i = 0; i < l; ++i) {
				k[i] = Math.random() * 0x80000000 | 0;
			}
			var r0 = ecp_proj(R, ecp_mul(S, k, G, a, p, l), p, l)[0];
			if (mpn_cmp(r0, n, l) >= 0) {
				mpn_sub(r0, r0, n, l);
			}
			if (!mpn_zero_p(r0, l)) {
				var t0 = _ecp_t0, t1 = _ecp_t1;
				fp_mul(s, fp_inv(t0, k, n, l), fp_add(t1, z, fp_mul(t1, r0, d, n, l), n, l), n, l);
				if (!mpn_zero_p(s, l)) {
					mpn_copyi(r, r0, l);
					break;
				}
			}
		}
	};

	/*
	* Parameters of the secp224k1 elliptic curve, packed into multi-precision
	* integers suitable for use with the preceding functions.
	*/
	self.secp224k1_p = [ 0x7FFFE56D, 0x7FFFFFFD, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0x7F ];
	self.secp224k1_a = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
	self.secp224k1_G = [
		[ 0x36B7A45C, 0x1EFCCA1D, 0x11C1D6A4, 0x4D233F4F, 0x0FC28A16, 0x3E133BE6, 0x5156CCD3, 0x50 ],
		[ 0x556D61A5, 0x459497B6, 0x02C2F567, 0x3F18CFBE, 0x2CAFBD6F, 0x77468850, 0x0227FB5F, 0x3F ],
		[ 1, 0, 0, 0, 0, 0, 0, 0 ]
	];
	self.secp224k1_n = [ 0x769FB1F7, 0x15E152E2, 0x4BB18613, 0x000EE746, 0x00000000, 0x00000000, 0x00000000, 0x80 ];

	/*
	* Parameters of the secp256k1 elliptic curve, packed into multi-precision
	* integers suitable for use with the preceding functions.
	*/
	self.secp256k1_p = [ 0x7FFFFC2F, 0x7FFFFFFD, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0xFF ];
	self.secp256k1_a = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
	self.secp256k1_G = [
		[ 0x16F81798, 0x33E502B6, 0x3738A365, 0x14DFE6D9, 0x6870B070, 0x340C52B9, 0x772EEB15, 0x5F333F7C, 0x79 ],
		[ 0x7B10D4B8, 0x388FA11F, 0x1A155066, 0x68BDA245, 0x61108A8F, 0x349F7F81, 0x28F11957, 0x1D6D3B93, 0x48 ],
		[ 1, 0, 0, 0, 0, 0, 0, 0, 0 ]
	];
	self.secp256k1_n = [ 0x50364141, 0x7FA4BD19, 0x3D2280EE, 0x5576E735, 0x7FFFFFEB, 0x7FFFFFFF, 0x7FFFFFFF, 0x7FFFFFFF, 0xFF ];

})();
