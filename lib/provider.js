import { t as TypeScriptSdkAdapter } from "./sdk-adapter-BBJ0CRJg.mjs";
import { ECDH, createECDH, createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, randomUUID, sign, verify } from "crypto";
import * as nc from "node:crypto";
import { isIP } from "net";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import { dirname } from "path";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp$1(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp$1(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region node_modules/.pnpm/base-x@5.0.1/node_modules/base-x/src/esm/index.js
function base(ALPHABET) {
	if (ALPHABET.length >= 255) throw new TypeError("Alphabet too long");
	const BASE_MAP = /* @__PURE__ */ new Uint8Array(256);
	for (let j = 0; j < BASE_MAP.length; j++) BASE_MAP[j] = 255;
	for (let i = 0; i < ALPHABET.length; i++) {
		const x = ALPHABET.charAt(i);
		const xc = x.charCodeAt(0);
		if (BASE_MAP[xc] !== 255) throw new TypeError(x + " is ambiguous");
		BASE_MAP[xc] = i;
	}
	const BASE = ALPHABET.length;
	const LEADER = ALPHABET.charAt(0);
	const FACTOR = Math.log(BASE) / Math.log(256);
	const iFACTOR = Math.log(256) / Math.log(BASE);
	function encode(source) {
		if (source instanceof Uint8Array) {} else if (ArrayBuffer.isView(source)) source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
		else if (Array.isArray(source)) source = Uint8Array.from(source);
		if (!(source instanceof Uint8Array)) throw new TypeError("Expected Uint8Array");
		if (source.length === 0) return "";
		let zeroes = 0;
		let length = 0;
		let pbegin = 0;
		const pend = source.length;
		while (pbegin !== pend && source[pbegin] === 0) {
			pbegin++;
			zeroes++;
		}
		const size = (pend - pbegin) * iFACTOR + 1 >>> 0;
		const b58 = new Uint8Array(size);
		while (pbegin !== pend) {
			let carry = source[pbegin];
			let i = 0;
			for (let it1 = size - 1; (carry !== 0 || i < length) && it1 !== -1; it1--, i++) {
				carry += 256 * b58[it1] >>> 0;
				b58[it1] = carry % BASE >>> 0;
				carry = carry / BASE >>> 0;
			}
			if (carry !== 0) throw new Error("Non-zero carry");
			length = i;
			pbegin++;
		}
		let it2 = size - length;
		while (it2 !== size && b58[it2] === 0) it2++;
		let str = LEADER.repeat(zeroes);
		for (; it2 < size; ++it2) str += ALPHABET.charAt(b58[it2]);
		return str;
	}
	function decodeUnsafe(source) {
		if (typeof source !== "string") throw new TypeError("Expected String");
		if (source.length === 0) return /* @__PURE__ */ new Uint8Array();
		let psz = 0;
		let zeroes = 0;
		let length = 0;
		while (source[psz] === LEADER) {
			zeroes++;
			psz++;
		}
		const size = (source.length - psz) * FACTOR + 1 >>> 0;
		const b256 = new Uint8Array(size);
		while (psz < source.length) {
			const charCode = source.charCodeAt(psz);
			if (charCode > 255) return;
			let carry = BASE_MAP[charCode];
			if (carry === 255) return;
			let i = 0;
			for (let it3 = size - 1; (carry !== 0 || i < length) && it3 !== -1; it3--, i++) {
				carry += BASE * b256[it3] >>> 0;
				b256[it3] = carry % 256 >>> 0;
				carry = carry / 256 >>> 0;
			}
			if (carry !== 0) throw new Error("Non-zero carry");
			length = i;
			psz++;
		}
		let it4 = size - length;
		while (it4 !== size && b256[it4] === 0) it4++;
		const vch = new Uint8Array(zeroes + (size - it4));
		let j = zeroes;
		while (it4 !== size) vch[j++] = b256[it4++];
		return vch;
	}
	function decode(string) {
		const buffer = decodeUnsafe(string);
		if (buffer) return buffer;
		throw new Error("Non-base" + BASE + " character");
	}
	return {
		encode,
		decodeUnsafe,
		decode
	};
}
var esm_default = base("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
//#endregion
//#region node_modules/.pnpm/@noble+hashes@1.7.2/node_modules/@noble/hashes/esm/_assert.js
/** Is number an Uint8Array? Copied from utils for perf. */
function isBytes$1(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
/** Asserts something is Uint8Array. */
function abytes$1(b, ...lengths) {
	if (!isBytes$1(b)) throw new Error("Uint8Array expected");
	if (lengths.length > 0 && !lengths.includes(b.length)) throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
/** Asserts a hash instance has not been destroyed / finished */
function aexists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("Hash instance has been destroyed");
	if (checkFinished && instance.finished) throw new Error("Hash#digest() has already been called");
}
/** Asserts output is properly-sized byte array */
function aoutput(out, instance) {
	abytes$1(out);
	const min = instance.outputLen;
	if (out.length < min) throw new Error("digestInto() expects output buffer of length at least " + min);
}
//#endregion
//#region node_modules/.pnpm/@noble+hashes@1.7.2/node_modules/@noble/hashes/esm/cryptoNode.js
/**
* Internal webcrypto alias.
* We prefer WebCrypto aka globalThis.crypto, which exists in node.js 16+.
* Falls back to Node.js built-in crypto for Node.js <=v14.
* See utils.ts for details.
* @module
*/
const crypto$1 = nc && typeof nc === "object" && "webcrypto" in nc ? nc.webcrypto : nc && typeof nc === "object" && "randomBytes" in nc ? nc : void 0;
//#endregion
//#region node_modules/.pnpm/@noble+hashes@1.7.2/node_modules/@noble/hashes/esm/utils.js
/**
* Utilities for hex, bytes, CSPRNG.
* @module
*/
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function createView(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
typeof Uint8Array.from([]).toHex === "function" && Uint8Array.fromHex;
/**
* Convert JS string to byte array.
* @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
*/
function utf8ToBytes(str) {
	if (typeof str !== "string") throw new Error("utf8ToBytes expected string, got " + typeof str);
	return new Uint8Array(new TextEncoder().encode(str));
}
/**
* Normalizes (non-hex) string or Uint8Array to Uint8Array.
* Warning: when Uint8Array is passed, it would NOT get copied.
* Keep in mind for future mutable operations.
*/
function toBytes$1(data) {
	if (typeof data === "string") data = utf8ToBytes(data);
	abytes$1(data);
	return data;
}
/** For runtime check if class implements interface */
var Hash = class {
	clone() {
		return this._cloneInto();
	}
};
/** Wraps hash function, creating an interface on top of it */
function wrapConstructor(hashCons) {
	const hashC = (msg) => hashCons().update(toBytes$1(msg)).digest();
	const tmp = hashCons();
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.create = () => hashCons();
	return hashC;
}
/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
function randomBytes$1(bytesLength = 32) {
	if (crypto$1 && typeof crypto$1.getRandomValues === "function") return crypto$1.getRandomValues(new Uint8Array(bytesLength));
	if (crypto$1 && typeof crypto$1.randomBytes === "function") return Uint8Array.from(crypto$1.randomBytes(bytesLength));
	throw new Error("crypto.getRandomValues must be defined");
}
//#endregion
//#region node_modules/.pnpm/@noble+hashes@1.7.2/node_modules/@noble/hashes/esm/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
function setBigUint64(view, byteOffset, value, isLE) {
	if (typeof view.setBigUint64 === "function") return view.setBigUint64(byteOffset, value, isLE);
	const _32n = BigInt(32);
	const _u32_max = BigInt(4294967295);
	const wh = Number(value >> _32n & _u32_max);
	const wl = Number(value & _u32_max);
	const h = isLE ? 4 : 0;
	const l = isLE ? 0 : 4;
	view.setUint32(byteOffset + h, wh, isLE);
	view.setUint32(byteOffset + l, wl, isLE);
}
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
*/
var HashMD = class extends Hash {
	constructor(blockLen, outputLen, padOffset, isLE) {
		super();
		this.finished = false;
		this.length = 0;
		this.pos = 0;
		this.destroyed = false;
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView(this.buffer);
	}
	update(data) {
		aexists(this);
		const { view, buffer, blockLen } = this;
		data = toBytes$1(data);
		const len = data.length;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				continue;
			}
			buffer.set(data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
			}
		}
		this.length += data.length;
		this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		this.buffer.subarray(pos).fill(0);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			pos = 0;
		}
		for (let i = pos; i < blockLen; i++) buffer[i] = 0;
		setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
		this.process(view, 0);
		const oview = createView(out);
		const len = this.outputLen;
		if (len % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
		const outLen = len / 4;
		const state = this.get();
		if (outLen > state.length) throw new Error("_sha2: outputLen bigger than state");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneInto(to) {
		to || (to = new this.constructor());
		to.set(...this.get());
		const { blockLen, buffer, length, finished, destroyed, pos } = this;
		to.length = length;
		to.pos = pos;
		to.finished = finished;
		to.destroyed = destroyed;
		if (length % blockLen) to.buffer.set(buffer);
		return to;
	}
};
//#endregion
//#region node_modules/.pnpm/@noble+hashes@1.7.2/node_modules/@noble/hashes/esm/_u64.js
/**
* Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
* @todo re-check https://issues.chromium.org/issues/42212588
* @module
*/
const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
	if (le) return {
		h: Number(n & U32_MASK64),
		l: Number(n >> _32n & U32_MASK64)
	};
	return {
		h: Number(n >> _32n & U32_MASK64) | 0,
		l: Number(n & U32_MASK64) | 0
	};
}
function split(lst, le = false) {
	let Ah = new Uint32Array(lst.length);
	let Al = new Uint32Array(lst.length);
	for (let i = 0; i < lst.length; i++) {
		const { h, l } = fromBig(lst[i], le);
		[Ah[i], Al[i]] = [h, l];
	}
	return [Ah, Al];
}
const toBig = (h, l) => BigInt(h >>> 0) << _32n | BigInt(l >>> 0);
const shrSH = (h, _l, s) => h >>> s;
const shrSL = (h, l, s) => h << 32 - s | l >>> s;
const rotrSH = (h, l, s) => h >>> s | l << 32 - s;
const rotrSL = (h, l, s) => h << 32 - s | l >>> s;
const rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
const rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
const rotr32H = (_h, l) => l;
const rotr32L = (h, _l) => h;
const rotlSH = (h, l, s) => h << s | l >>> 32 - s;
const rotlSL = (h, l, s) => l << s | h >>> 32 - s;
const rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
const rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
function add(Ah, Al, Bh, Bl) {
	const l = (Al >>> 0) + (Bl >>> 0);
	return {
		h: Ah + Bh + (l / 2 ** 32 | 0) | 0,
		l: l | 0
	};
}
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
const u64 = {
	fromBig,
	split,
	toBig,
	shrSH,
	shrSL,
	rotrSH,
	rotrSL,
	rotrBH,
	rotrBL,
	rotr32H,
	rotr32L,
	rotlSH,
	rotlSL,
	rotlBH,
	rotlBL,
	add,
	add3L,
	add3H,
	add4L,
	add4H,
	add5H,
	add5L
};
//#endregion
//#region node_modules/.pnpm/@noble+hashes@1.7.2/node_modules/@noble/hashes/esm/sha512.js
/**
* SHA2-512 a.k.a. sha512 and sha384. It is slower than sha256 in js because u64 operations are slow.
*
* Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
* [the paper on truncated SHA512/256](https://eprint.iacr.org/2010/548.pdf).
* @module
*/
const [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => u64.split([
	"0x428a2f98d728ae22",
	"0x7137449123ef65cd",
	"0xb5c0fbcfec4d3b2f",
	"0xe9b5dba58189dbbc",
	"0x3956c25bf348b538",
	"0x59f111f1b605d019",
	"0x923f82a4af194f9b",
	"0xab1c5ed5da6d8118",
	"0xd807aa98a3030242",
	"0x12835b0145706fbe",
	"0x243185be4ee4b28c",
	"0x550c7dc3d5ffb4e2",
	"0x72be5d74f27b896f",
	"0x80deb1fe3b1696b1",
	"0x9bdc06a725c71235",
	"0xc19bf174cf692694",
	"0xe49b69c19ef14ad2",
	"0xefbe4786384f25e3",
	"0x0fc19dc68b8cd5b5",
	"0x240ca1cc77ac9c65",
	"0x2de92c6f592b0275",
	"0x4a7484aa6ea6e483",
	"0x5cb0a9dcbd41fbd4",
	"0x76f988da831153b5",
	"0x983e5152ee66dfab",
	"0xa831c66d2db43210",
	"0xb00327c898fb213f",
	"0xbf597fc7beef0ee4",
	"0xc6e00bf33da88fc2",
	"0xd5a79147930aa725",
	"0x06ca6351e003826f",
	"0x142929670a0e6e70",
	"0x27b70a8546d22ffc",
	"0x2e1b21385c26c926",
	"0x4d2c6dfc5ac42aed",
	"0x53380d139d95b3df",
	"0x650a73548baf63de",
	"0x766a0abb3c77b2a8",
	"0x81c2c92e47edaee6",
	"0x92722c851482353b",
	"0xa2bfe8a14cf10364",
	"0xa81a664bbc423001",
	"0xc24b8b70d0f89791",
	"0xc76c51a30654be30",
	"0xd192e819d6ef5218",
	"0xd69906245565a910",
	"0xf40e35855771202a",
	"0x106aa07032bbd1b8",
	"0x19a4c116b8d2d0c8",
	"0x1e376c085141ab53",
	"0x2748774cdf8eeb99",
	"0x34b0bcb5e19b48a8",
	"0x391c0cb3c5c95a63",
	"0x4ed8aa4ae3418acb",
	"0x5b9cca4f7763e373",
	"0x682e6ff3d6b2b8a3",
	"0x748f82ee5defb2fc",
	"0x78a5636f43172f60",
	"0x84c87814a1f0ab72",
	"0x8cc702081a6439ec",
	"0x90befffa23631e28",
	"0xa4506cebde82bde9",
	"0xbef9a3f7b2c67915",
	"0xc67178f2e372532b",
	"0xca273eceea26619c",
	"0xd186b8c721c0c207",
	"0xeada7dd6cde0eb1e",
	"0xf57d4f7fee6ed178",
	"0x06f067aa72176fba",
	"0x0a637dc5a2c898a6",
	"0x113f9804bef90dae",
	"0x1b710b35131c471b",
	"0x28db77f523047d84",
	"0x32caab7b40c72493",
	"0x3c9ebe0a15c9bebc",
	"0x431d67c49c100d4c",
	"0x4cc5d4becb3e42b6",
	"0x597f299cfc657e2a",
	"0x5fcb6fab3ad6faec",
	"0x6c44198c4a475817"
].map((n) => BigInt(n))))();
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA512 = class extends HashMD {
	constructor(outputLen = 64) {
		super(128, outputLen, 16, false);
		this.Ah = 1779033703;
		this.Al = -205731576;
		this.Bh = -1150833019;
		this.Bl = -2067093701;
		this.Ch = 1013904242;
		this.Cl = -23791573;
		this.Dh = -1521486534;
		this.Dl = 1595750129;
		this.Eh = 1359893119;
		this.El = -1377402159;
		this.Fh = -1694144372;
		this.Fl = 725511199;
		this.Gh = 528734635;
		this.Gl = -79577749;
		this.Hh = 1541459225;
		this.Hl = 327033209;
	}
	get() {
		const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		return [
			Ah,
			Al,
			Bh,
			Bl,
			Ch,
			Cl,
			Dh,
			Dl,
			Eh,
			El,
			Fh,
			Fl,
			Gh,
			Gl,
			Hh,
			Hl
		];
	}
	set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
		this.Ah = Ah | 0;
		this.Al = Al | 0;
		this.Bh = Bh | 0;
		this.Bl = Bl | 0;
		this.Ch = Ch | 0;
		this.Cl = Cl | 0;
		this.Dh = Dh | 0;
		this.Dl = Dl | 0;
		this.Eh = Eh | 0;
		this.El = El | 0;
		this.Fh = Fh | 0;
		this.Fl = Fl | 0;
		this.Gh = Gh | 0;
		this.Gl = Gl | 0;
		this.Hh = Hh | 0;
		this.Hl = Hl | 0;
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) {
			SHA512_W_H[i] = view.getUint32(offset);
			SHA512_W_L[i] = view.getUint32(offset += 4);
		}
		for (let i = 16; i < 80; i++) {
			const W15h = SHA512_W_H[i - 15] | 0;
			const W15l = SHA512_W_L[i - 15] | 0;
			const s0h = u64.rotrSH(W15h, W15l, 1) ^ u64.rotrSH(W15h, W15l, 8) ^ u64.shrSH(W15h, W15l, 7);
			const s0l = u64.rotrSL(W15h, W15l, 1) ^ u64.rotrSL(W15h, W15l, 8) ^ u64.shrSL(W15h, W15l, 7);
			const W2h = SHA512_W_H[i - 2] | 0;
			const W2l = SHA512_W_L[i - 2] | 0;
			const s1h = u64.rotrSH(W2h, W2l, 19) ^ u64.rotrBH(W2h, W2l, 61) ^ u64.shrSH(W2h, W2l, 6);
			const s1l = u64.rotrSL(W2h, W2l, 19) ^ u64.rotrBL(W2h, W2l, 61) ^ u64.shrSL(W2h, W2l, 6);
			const SUMl = u64.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
			const SUMh = u64.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
			SHA512_W_H[i] = SUMh | 0;
			SHA512_W_L[i] = SUMl | 0;
		}
		let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		for (let i = 0; i < 80; i++) {
			const sigma1h = u64.rotrSH(Eh, El, 14) ^ u64.rotrSH(Eh, El, 18) ^ u64.rotrBH(Eh, El, 41);
			const sigma1l = u64.rotrSL(Eh, El, 14) ^ u64.rotrSL(Eh, El, 18) ^ u64.rotrBL(Eh, El, 41);
			const CHIh = Eh & Fh ^ ~Eh & Gh;
			const CHIl = El & Fl ^ ~El & Gl;
			const T1ll = u64.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
			const T1h = u64.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
			const T1l = T1ll | 0;
			const sigma0h = u64.rotrSH(Ah, Al, 28) ^ u64.rotrBH(Ah, Al, 34) ^ u64.rotrBH(Ah, Al, 39);
			const sigma0l = u64.rotrSL(Ah, Al, 28) ^ u64.rotrBL(Ah, Al, 34) ^ u64.rotrBL(Ah, Al, 39);
			const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
			const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
			Hh = Gh | 0;
			Hl = Gl | 0;
			Gh = Fh | 0;
			Gl = Fl | 0;
			Fh = Eh | 0;
			Fl = El | 0;
			({h: Eh, l: El} = u64.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
			Dh = Ch | 0;
			Dl = Cl | 0;
			Ch = Bh | 0;
			Cl = Bl | 0;
			Bh = Ah | 0;
			Bl = Al | 0;
			const All = u64.add3L(T1l, sigma0l, MAJl);
			Ah = u64.add3H(All, T1h, sigma0h, MAJh);
			Al = All | 0;
		}
		({h: Ah, l: Al} = u64.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
		({h: Bh, l: Bl} = u64.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
		({h: Ch, l: Cl} = u64.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
		({h: Dh, l: Dl} = u64.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
		({h: Eh, l: El} = u64.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
		({h: Fh, l: Fl} = u64.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
		({h: Gh, l: Gl} = u64.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
		({h: Hh, l: Hl} = u64.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
		this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
	}
	roundClean() {
		SHA512_W_H.fill(0);
		SHA512_W_L.fill(0);
	}
	destroy() {
		this.buffer.fill(0);
		this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
};
/** SHA2-512 hash function. */
const sha512 = /* @__PURE__ */ wrapConstructor(() => new SHA512());
//#endregion
//#region node_modules/.pnpm/@noble+curves@1.8.2/node_modules/@noble/curves/esm/abstract/utils.js
/**
* Hex, bytes and number utilities.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$4 = /* @__PURE__ */ BigInt(0);
const _1n$5 = /* @__PURE__ */ BigInt(1);
function isBytes(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes(item) {
	if (!isBytes(item)) throw new Error("Uint8Array expected");
}
function abool(title, value) {
	if (typeof value !== "boolean") throw new Error(title + " boolean expected, got " + value);
}
function hexToNumber(hex) {
	if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
	return hex === "" ? _0n$4 : BigInt("0x" + hex);
}
const hasHexBuiltin = typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function";
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
* Convert byte array to hex string. Uses built-in function, when available.
* @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
*/
function bytesToHex(bytes) {
	abytes(bytes);
	if (hasHexBuiltin) return bytes.toHex();
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += hexes[bytes[i]];
	return hex;
}
const asciis = {
	_0: 48,
	_9: 57,
	A: 65,
	F: 70,
	a: 97,
	f: 102
};
function asciiToBase16(ch) {
	if (ch >= asciis._0 && ch <= asciis._9) return ch - asciis._0;
	if (ch >= asciis.A && ch <= asciis.F) return ch - (asciis.A - 10);
	if (ch >= asciis.a && ch <= asciis.f) return ch - (asciis.a - 10);
}
/**
* Convert hex string to byte array. Uses built-in function, when available.
* @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
*/
function hexToBytes(hex) {
	if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
	if (hasHexBuiltin) return Uint8Array.fromHex(hex);
	const hl = hex.length;
	const al = hl / 2;
	if (hl % 2) throw new Error("hex string expected, got unpadded hex of length " + hl);
	const array = new Uint8Array(al);
	for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
		const n1 = asciiToBase16(hex.charCodeAt(hi));
		const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
		if (n1 === void 0 || n2 === void 0) {
			const char = hex[hi] + hex[hi + 1];
			throw new Error("hex string expected, got non-hex character \"" + char + "\" at index " + hi);
		}
		array[ai] = n1 * 16 + n2;
	}
	return array;
}
function bytesToNumberBE(bytes) {
	return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
	abytes(bytes);
	return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
	return hexToBytes(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n, len) {
	return numberToBytesBE(n, len).reverse();
}
/**
* Takes hex string or Uint8Array, converts to Uint8Array.
* Validates output length.
* Will throw error for other types.
* @param title descriptive title for an error e.g. 'private key'
* @param hex hex string or Uint8Array
* @param expectedLength optional, will compare to result array's length
* @returns
*/
function ensureBytes(title, hex, expectedLength) {
	let res;
	if (typeof hex === "string") try {
		res = hexToBytes(hex);
	} catch (e) {
		throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
	}
	else if (isBytes(hex)) res = Uint8Array.from(hex);
	else throw new Error(title + " must be hex string or Uint8Array");
	const len = res.length;
	if (typeof expectedLength === "number" && len !== expectedLength) throw new Error(title + " of length " + expectedLength + " expected, got " + len);
	return res;
}
/**
* Copies several Uint8Arrays into one.
*/
function concatBytes(...arrays) {
	let sum = 0;
	for (let i = 0; i < arrays.length; i++) {
		const a = arrays[i];
		abytes(a);
		sum += a.length;
	}
	const res = new Uint8Array(sum);
	for (let i = 0, pad = 0; i < arrays.length; i++) {
		const a = arrays[i];
		res.set(a, pad);
		pad += a.length;
	}
	return res;
}
const isPosBig = (n) => typeof n === "bigint" && _0n$4 <= n;
function inRange(n, min, max) {
	return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
/**
* Asserts min <= n < max. NOTE: It's < max and not <= max.
* @example
* aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
*/
function aInRange(title, n, min, max) {
	if (!inRange(n, min, max)) throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
/**
* Calculates amount of bits in a bigint.
* Same as `n.toString(2).length`
*/
function bitLen(n) {
	let len;
	for (len = 0; n > _0n$4; n >>= _1n$5, len += 1);
	return len;
}
/**
* Calculate mask for N bits. Not using ** operator with bigints because of old engines.
* Same as BigInt(`0b${Array(i).fill('1').join('')}`)
*/
const bitMask = (n) => (_1n$5 << BigInt(n)) - _1n$5;
const validatorFns = {
	bigint: (val) => typeof val === "bigint",
	function: (val) => typeof val === "function",
	boolean: (val) => typeof val === "boolean",
	string: (val) => typeof val === "string",
	stringOrUint8Array: (val) => typeof val === "string" || isBytes(val),
	isSafeInteger: (val) => Number.isSafeInteger(val),
	array: (val) => Array.isArray(val),
	field: (val, object) => object.Fp.isValid(val),
	hash: (val) => typeof val === "function" && Number.isSafeInteger(val.outputLen)
};
function validateObject(object, validators, optValidators = {}) {
	const checkField = (fieldName, type, isOptional) => {
		const checkVal = validatorFns[type];
		if (typeof checkVal !== "function") throw new Error("invalid validator function");
		const val = object[fieldName];
		if (isOptional && val === void 0) return;
		if (!checkVal(val, object)) throw new Error("param " + String(fieldName) + " is invalid. Expected " + type + ", got " + val);
	};
	for (const [fieldName, type] of Object.entries(validators)) checkField(fieldName, type, false);
	for (const [fieldName, type] of Object.entries(optValidators)) checkField(fieldName, type, true);
	return object;
}
/**
* Memoizes (caches) computation result.
* Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
*/
function memoized(fn) {
	const map = /* @__PURE__ */ new WeakMap();
	return (arg, ...args) => {
		const val = map.get(arg);
		if (val !== void 0) return val;
		const computed = fn(arg, ...args);
		map.set(arg, computed);
		return computed;
	};
}
//#endregion
//#region node_modules/.pnpm/@noble+curves@1.8.2/node_modules/@noble/curves/esm/abstract/modular.js
/**
* Utils for modular division and finite fields.
* A finite field over 11 is integer number operations `mod 11`.
* There is no division: it is replaced by modular multiplicative inverse.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$3 = BigInt(0);
const _1n$4 = BigInt(1);
const _2n$2 = /* @__PURE__ */ BigInt(2);
const _3n$1 = /* @__PURE__ */ BigInt(3);
const _4n = /* @__PURE__ */ BigInt(4);
const _5n$1 = /* @__PURE__ */ BigInt(5);
const _8n$2 = /* @__PURE__ */ BigInt(8);
const _9n = /* @__PURE__ */ BigInt(9);
const _16n = /* @__PURE__ */ BigInt(16);
function mod(a, b) {
	const result = a % b;
	return result >= _0n$3 ? result : b + result;
}
/**
* Efficiently raise num to power and do modular division.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
* @todo use field version && remove
* @example
* pow(2n, 6n, 11n) // 64n % 11n == 9n
*/
function pow(num, power, modulo) {
	if (power < _0n$3) throw new Error("invalid exponent, negatives unsupported");
	if (modulo <= _0n$3) throw new Error("invalid modulus");
	if (modulo === _1n$4) return _0n$3;
	let res = _1n$4;
	while (power > _0n$3) {
		if (power & _1n$4) res = res * num % modulo;
		num = num * num % modulo;
		power >>= _1n$4;
	}
	return res;
}
/** Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)` */
function pow2(x, power, modulo) {
	let res = x;
	while (power-- > _0n$3) {
		res *= res;
		res %= modulo;
	}
	return res;
}
/**
* Inverses number over modulo.
* Implemented using [Euclidean GCD](https://brilliant.org/wiki/extended-euclidean-algorithm/).
*/
function invert(number, modulo) {
	if (number === _0n$3) throw new Error("invert: expected non-zero number");
	if (modulo <= _0n$3) throw new Error("invert: expected positive modulus, got " + modulo);
	let a = mod(number, modulo);
	let b = modulo;
	let x = _0n$3, y = _1n$4, u = _1n$4, v = _0n$3;
	while (a !== _0n$3) {
		const q = b / a;
		const r = b % a;
		const m = x - u * q;
		const n = y - v * q;
		b = a, a = r, x = u, y = v, u = m, v = n;
	}
	if (b !== _1n$4) throw new Error("invert: does not exist");
	return mod(x, modulo);
}
/**
* Tonelli-Shanks square root search algorithm.
* 1. https://eprint.iacr.org/2012/685.pdf (page 12)
* 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
* Will start an infinite loop if field order P is not prime.
* @param P field order
* @returns function that takes field Fp (created from P) and number n
*/
function tonelliShanks(P) {
	const legendreC = (P - _1n$4) / _2n$2;
	let Q, S, Z;
	for (Q = P - _1n$4, S = 0; Q % _2n$2 === _0n$3; Q /= _2n$2, S++);
	for (Z = _2n$2; Z < P && pow(Z, legendreC, P) !== P - _1n$4; Z++) if (Z > 1e3) throw new Error("Cannot find square root: likely non-prime P");
	if (S === 1) {
		const p1div4 = (P + _1n$4) / _4n;
		return function tonelliFast(Fp, n) {
			const root = Fp.pow(n, p1div4);
			if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
			return root;
		};
	}
	const Q1div2 = (Q + _1n$4) / _2n$2;
	return function tonelliSlow(Fp, n) {
		if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE)) throw new Error("Cannot find square root");
		let r = S;
		let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q);
		let x = Fp.pow(n, Q1div2);
		let b = Fp.pow(n, Q);
		while (!Fp.eql(b, Fp.ONE)) {
			if (Fp.eql(b, Fp.ZERO)) return Fp.ZERO;
			let m = 1;
			for (let t2 = Fp.sqr(b); m < r; m++) {
				if (Fp.eql(t2, Fp.ONE)) break;
				t2 = Fp.sqr(t2);
			}
			const ge = Fp.pow(g, _1n$4 << BigInt(r - m - 1));
			g = Fp.sqr(ge);
			x = Fp.mul(x, ge);
			b = Fp.mul(b, g);
			r = m;
		}
		return x;
	};
}
/**
* Square root for a finite field. It will try to check if optimizations are applicable and fall back to 4:
*
* 1. P ≡ 3 (mod 4)
* 2. P ≡ 5 (mod 8)
* 3. P ≡ 9 (mod 16)
* 4. Tonelli-Shanks algorithm
*
* Different algorithms can give different roots, it is up to user to decide which one they want.
* For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
*/
function FpSqrt(P) {
	if (P % _4n === _3n$1) {
		const p1div4 = (P + _1n$4) / _4n;
		return function sqrt3mod4(Fp, n) {
			const root = Fp.pow(n, p1div4);
			if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
			return root;
		};
	}
	if (P % _8n$2 === _5n$1) {
		const c1 = (P - _5n$1) / _8n$2;
		return function sqrt5mod8(Fp, n) {
			const n2 = Fp.mul(n, _2n$2);
			const v = Fp.pow(n2, c1);
			const nv = Fp.mul(n, v);
			const i = Fp.mul(Fp.mul(nv, _2n$2), v);
			const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
			if (!Fp.eql(Fp.sqr(root), n)) throw new Error("Cannot find square root");
			return root;
		};
	}
	if (P % _16n === _9n) {}
	return tonelliShanks(P);
}
const isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n$4) === _1n$4;
const FIELD_FIELDS = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
function validateField(field) {
	return validateObject(field, FIELD_FIELDS.reduce((map, val) => {
		map[val] = "function";
		return map;
	}, {
		ORDER: "bigint",
		MASK: "bigint",
		BYTES: "isSafeInteger",
		BITS: "isSafeInteger"
	}));
}
/**
* Same as `pow` but for Fp: non-constant-time.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
*/
function FpPow(f, num, power) {
	if (power < _0n$3) throw new Error("invalid exponent, negatives unsupported");
	if (power === _0n$3) return f.ONE;
	if (power === _1n$4) return num;
	let p = f.ONE;
	let d = num;
	while (power > _0n$3) {
		if (power & _1n$4) p = f.mul(p, d);
		d = f.sqr(d);
		power >>= _1n$4;
	}
	return p;
}
/**
* Efficiently invert an array of Field elements.
* `inv(0)` will return `undefined` here: make sure to throw an error.
*/
function FpInvertBatch(f, nums) {
	const tmp = new Array(nums.length);
	const lastMultiplied = nums.reduce((acc, num, i) => {
		if (f.is0(num)) return acc;
		tmp[i] = acc;
		return f.mul(acc, num);
	}, f.ONE);
	const inverted = f.inv(lastMultiplied);
	nums.reduceRight((acc, num, i) => {
		if (f.is0(num)) return acc;
		tmp[i] = f.mul(acc, tmp[i]);
		return f.mul(acc, num);
	}, inverted);
	return tmp;
}
function nLength(n, nBitLength) {
	const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
	return {
		nBitLength: _nBitLength,
		nByteLength: Math.ceil(_nBitLength / 8)
	};
}
/**
* Initializes a finite field over prime.
* Major performance optimizations:
* * a) denormalized operations like mulN instead of mul
* * b) same object shape: never add or remove keys
* * c) Object.freeze
* Fragile: always run a benchmark on a change.
* Security note: operations don't check 'isValid' for all elements for performance reasons,
* it is caller responsibility to check this.
* This is low-level code, please make sure you know what you're doing.
* @param ORDER prime positive bigint
* @param bitLen how many bits the field consumes
* @param isLE (def: false) if encoding / decoding should be in little-endian
* @param redef optional faster redefinitions of sqrt and other methods
*/
function Field(ORDER, bitLen, isLE = false, redef = {}) {
	if (ORDER <= _0n$3) throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
	const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
	if (BYTES > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
	let sqrtP;
	const f = Object.freeze({
		ORDER,
		isLE,
		BITS,
		BYTES,
		MASK: bitMask(BITS),
		ZERO: _0n$3,
		ONE: _1n$4,
		create: (num) => mod(num, ORDER),
		isValid: (num) => {
			if (typeof num !== "bigint") throw new Error("invalid field element: expected bigint, got " + typeof num);
			return _0n$3 <= num && num < ORDER;
		},
		is0: (num) => num === _0n$3,
		isOdd: (num) => (num & _1n$4) === _1n$4,
		neg: (num) => mod(-num, ORDER),
		eql: (lhs, rhs) => lhs === rhs,
		sqr: (num) => mod(num * num, ORDER),
		add: (lhs, rhs) => mod(lhs + rhs, ORDER),
		sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
		mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
		pow: (num, power) => FpPow(f, num, power),
		div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
		sqrN: (num) => num * num,
		addN: (lhs, rhs) => lhs + rhs,
		subN: (lhs, rhs) => lhs - rhs,
		mulN: (lhs, rhs) => lhs * rhs,
		inv: (num) => invert(num, ORDER),
		sqrt: redef.sqrt || ((n) => {
			if (!sqrtP) sqrtP = FpSqrt(ORDER);
			return sqrtP(f, n);
		}),
		invertBatch: (lst) => FpInvertBatch(f, lst),
		cmov: (a, b, c) => c ? b : a,
		toBytes: (num) => isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
		fromBytes: (bytes) => {
			if (bytes.length !== BYTES) throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
			return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
		}
	});
	return Object.freeze(f);
}
//#endregion
//#region node_modules/.pnpm/@noble+curves@1.8.2/node_modules/@noble/curves/esm/abstract/curve.js
/**
* Methods for elliptic curve multiplication by scalars.
* Contains wNAF, pippenger
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$2 = BigInt(0);
const _1n$3 = BigInt(1);
function constTimeNegate(condition, item) {
	const neg = item.negate();
	return condition ? neg : item;
}
function validateW(W, bits) {
	if (!Number.isSafeInteger(W) || W <= 0 || W > bits) throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, scalarBits) {
	validateW(W, scalarBits);
	const windows = Math.ceil(scalarBits / W) + 1;
	const windowSize = 2 ** (W - 1);
	const maxNumber = 2 ** W;
	return {
		windows,
		windowSize,
		mask: bitMask(W),
		maxNumber,
		shiftBy: BigInt(W)
	};
}
function calcOffsets(n, window, wOpts) {
	const { windowSize, mask, maxNumber, shiftBy } = wOpts;
	let wbits = Number(n & mask);
	let nextN = n >> shiftBy;
	if (wbits > windowSize) {
		wbits -= maxNumber;
		nextN += _1n$3;
	}
	const offsetStart = window * windowSize;
	const offset = offsetStart + Math.abs(wbits) - 1;
	const isZero = wbits === 0;
	const isNeg = wbits < 0;
	const isNegF = window % 2 !== 0;
	return {
		nextN,
		offset,
		isZero,
		isNeg,
		isNegF,
		offsetF: offsetStart
	};
}
function validateMSMPoints(points, c) {
	if (!Array.isArray(points)) throw new Error("array expected");
	points.forEach((p, i) => {
		if (!(p instanceof c)) throw new Error("invalid point at index " + i);
	});
}
function validateMSMScalars(scalars, field) {
	if (!Array.isArray(scalars)) throw new Error("array of scalars expected");
	scalars.forEach((s, i) => {
		if (!field.isValid(s)) throw new Error("invalid scalar at index " + i);
	});
}
const pointPrecomputes = /* @__PURE__ */ new WeakMap();
const pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getW(P) {
	return pointWindowSizes.get(P) || 1;
}
/**
* Elliptic curve multiplication of Point by scalar. Fragile.
* Scalars should always be less than curve order: this should be checked inside of a curve itself.
* Creates precomputation tables for fast multiplication:
* - private scalar is split by fixed size windows of W bits
* - every window point is collected from window's table & added to accumulator
* - since windows are different, same point inside tables won't be accessed more than once per calc
* - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
* - +1 window is neccessary for wNAF
* - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
*
* @todo Research returning 2d JS array of windows, instead of a single window.
* This would allow windows to be in different memory locations
*/
function wNAF(c, bits) {
	return {
		constTimeNegate,
		hasPrecomputes(elm) {
			return getW(elm) !== 1;
		},
		unsafeLadder(elm, n, p = c.ZERO) {
			let d = elm;
			while (n > _0n$2) {
				if (n & _1n$3) p = p.add(d);
				d = d.double();
				n >>= _1n$3;
			}
			return p;
		},
		/**
		* Creates a wNAF precomputation window. Used for caching.
		* Default window size is set by `utils.precompute()` and is equal to 8.
		* Number of precomputed points depends on the curve size:
		* 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
		* - 𝑊 is the window size
		* - 𝑛 is the bitlength of the curve order.
		* For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
		* @param elm Point instance
		* @param W window size
		* @returns precomputed point tables flattened to a single array
		*/
		precomputeWindow(elm, W) {
			const { windows, windowSize } = calcWOpts(W, bits);
			const points = [];
			let p = elm;
			let base = p;
			for (let window = 0; window < windows; window++) {
				base = p;
				points.push(base);
				for (let i = 1; i < windowSize; i++) {
					base = base.add(p);
					points.push(base);
				}
				p = base.double();
			}
			return points;
		},
		/**
		* Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
		* @param W window size
		* @param precomputes precomputed tables
		* @param n scalar (we don't check here, but should be less than curve order)
		* @returns real and fake (for const-time) points
		*/
		wNAF(W, precomputes, n) {
			let p = c.ZERO;
			let f = c.BASE;
			const wo = calcWOpts(W, bits);
			for (let window = 0; window < wo.windows; window++) {
				const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
				n = nextN;
				if (isZero) f = f.add(constTimeNegate(isNegF, precomputes[offsetF]));
				else p = p.add(constTimeNegate(isNeg, precomputes[offset]));
			}
			return {
				p,
				f
			};
		},
		/**
		* Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
		* @param W window size
		* @param precomputes precomputed tables
		* @param n scalar (we don't check here, but should be less than curve order)
		* @param acc accumulator point to add result of multiplication
		* @returns point
		*/
		wNAFUnsafe(W, precomputes, n, acc = c.ZERO) {
			const wo = calcWOpts(W, bits);
			for (let window = 0; window < wo.windows; window++) {
				if (n === _0n$2) break;
				const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
				n = nextN;
				if (isZero) continue;
				else {
					const item = precomputes[offset];
					acc = acc.add(isNeg ? item.negate() : item);
				}
			}
			return acc;
		},
		getPrecomputes(W, P, transform) {
			let comp = pointPrecomputes.get(P);
			if (!comp) {
				comp = this.precomputeWindow(P, W);
				if (W !== 1) pointPrecomputes.set(P, transform(comp));
			}
			return comp;
		},
		wNAFCached(P, n, transform) {
			const W = getW(P);
			return this.wNAF(W, this.getPrecomputes(W, P, transform), n);
		},
		wNAFCachedUnsafe(P, n, transform, prev) {
			const W = getW(P);
			if (W === 1) return this.unsafeLadder(P, n, prev);
			return this.wNAFUnsafe(W, this.getPrecomputes(W, P, transform), n, prev);
		},
		setWindowSize(P, W) {
			validateW(W, bits);
			pointWindowSizes.set(P, W);
			pointPrecomputes.delete(P);
		}
	};
}
/**
* Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
* 30x faster vs naive addition on L=4096, 10x faster than precomputes.
* For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
* Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
* @param c Curve Point constructor
* @param fieldN field over CURVE.N - important that it's not over CURVE.P
* @param points array of L curve points
* @param scalars array of L scalars (aka private keys / bigints)
*/
function pippenger(c, fieldN, points, scalars) {
	validateMSMPoints(points, c);
	validateMSMScalars(scalars, fieldN);
	if (points.length !== scalars.length) throw new Error("arrays of points and scalars must have equal length");
	const zero = c.ZERO;
	const wbits = bitLen(BigInt(points.length));
	const windowSize = wbits > 12 ? wbits - 3 : wbits > 4 ? wbits - 2 : wbits ? 2 : 1;
	const MASK = bitMask(windowSize);
	const buckets = new Array(Number(MASK) + 1).fill(zero);
	const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
	let sum = zero;
	for (let i = lastBits; i >= 0; i -= windowSize) {
		buckets.fill(zero);
		for (let j = 0; j < scalars.length; j++) {
			const scalar = scalars[j];
			const wbits = Number(scalar >> BigInt(i) & MASK);
			buckets[wbits] = buckets[wbits].add(points[j]);
		}
		let resI = zero;
		for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
			sumI = sumI.add(buckets[j]);
			resI = resI.add(sumI);
		}
		sum = sum.add(resI);
		if (i !== 0) for (let j = 0; j < windowSize; j++) sum = sum.double();
	}
	return sum;
}
function validateBasic(curve) {
	validateField(curve.Fp);
	validateObject(curve, {
		n: "bigint",
		h: "bigint",
		Gx: "field",
		Gy: "field"
	}, {
		nBitLength: "isSafeInteger",
		nByteLength: "isSafeInteger"
	});
	return Object.freeze({
		...nLength(curve.n, curve.nBitLength),
		...curve,
		p: curve.Fp.ORDER
	});
}
//#endregion
//#region node_modules/.pnpm/@noble+curves@1.8.2/node_modules/@noble/curves/esm/abstract/edwards.js
/**
* Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
* For design rationale of types / exports, see weierstrass module documentation.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$1 = BigInt(0);
const _1n$2 = BigInt(1);
const _2n$1 = BigInt(2);
const _8n$1 = BigInt(8);
const VERIFY_DEFAULT = { zip215: true };
function validateOpts$1(curve) {
	const opts = validateBasic(curve);
	validateObject(curve, {
		hash: "function",
		a: "bigint",
		d: "bigint",
		randomBytes: "function"
	}, {
		adjustScalarBytes: "function",
		domain: "function",
		uvRatio: "function",
		mapToCurve: "function"
	});
	return Object.freeze({ ...opts });
}
/**
* Creates Twisted Edwards curve with EdDSA signatures.
* @example
* import { Field } from '@noble/curves/abstract/modular';
* // Before that, define BigInt-s: a, d, p, n, Gx, Gy, h
* const curve = twistedEdwards({ a, d, Fp: Field(p), n, Gx, Gy, h })
*/
function twistedEdwards(curveDef) {
	const CURVE = validateOpts$1(curveDef);
	const { Fp, n: CURVE_ORDER, prehash, hash: cHash, randomBytes, nByteLength, h: cofactor } = CURVE;
	const MASK = _2n$1 << BigInt(nByteLength * 8) - _1n$2;
	const modP = Fp.create;
	const Fn = Field(CURVE.n, CURVE.nBitLength);
	const uvRatio = CURVE.uvRatio || ((u, v) => {
		try {
			return {
				isValid: true,
				value: Fp.sqrt(u * Fp.inv(v))
			};
		} catch (e) {
			return {
				isValid: false,
				value: _0n$1
			};
		}
	});
	const adjustScalarBytes = CURVE.adjustScalarBytes || ((bytes) => bytes);
	const domain = CURVE.domain || ((data, ctx, phflag) => {
		abool("phflag", phflag);
		if (ctx.length || phflag) throw new Error("Contexts/pre-hash are not supported");
		return data;
	});
	function aCoordinate(title, n, banZero = false) {
		const min = banZero ? _1n$2 : _0n$1;
		aInRange("coordinate " + title, n, min, MASK);
	}
	function aextpoint(other) {
		if (!(other instanceof Point)) throw new Error("ExtendedPoint expected");
	}
	const toAffineMemo = memoized((p, iz) => {
		const { ex: x, ey: y, ez: z } = p;
		const is0 = p.is0();
		if (iz == null) iz = is0 ? _8n$1 : Fp.inv(z);
		const ax = modP(x * iz);
		const ay = modP(y * iz);
		const zz = modP(z * iz);
		if (is0) return {
			x: _0n$1,
			y: _1n$2
		};
		if (zz !== _1n$2) throw new Error("invZ was invalid");
		return {
			x: ax,
			y: ay
		};
	});
	const assertValidMemo = memoized((p) => {
		const { a, d } = CURVE;
		if (p.is0()) throw new Error("bad point: ZERO");
		const { ex: X, ey: Y, ez: Z, et: T } = p;
		const X2 = modP(X * X);
		const Y2 = modP(Y * Y);
		const Z2 = modP(Z * Z);
		const Z4 = modP(Z2 * Z2);
		const aX2 = modP(X2 * a);
		if (modP(Z2 * modP(aX2 + Y2)) !== modP(Z4 + modP(d * modP(X2 * Y2)))) throw new Error("bad point: equation left != right (1)");
		if (modP(X * Y) !== modP(Z * T)) throw new Error("bad point: equation left != right (2)");
		return true;
	});
	class Point {
		constructor(ex, ey, ez, et) {
			aCoordinate("x", ex);
			aCoordinate("y", ey);
			aCoordinate("z", ez, true);
			aCoordinate("t", et);
			this.ex = ex;
			this.ey = ey;
			this.ez = ez;
			this.et = et;
			Object.freeze(this);
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		static fromAffine(p) {
			if (p instanceof Point) throw new Error("extended point not allowed");
			const { x, y } = p || {};
			aCoordinate("x", x);
			aCoordinate("y", y);
			return new Point(x, y, _1n$2, modP(x * y));
		}
		static normalizeZ(points) {
			const toInv = Fp.invertBatch(points.map((p) => p.ez));
			return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
		}
		static msm(points, scalars) {
			return pippenger(Point, Fn, points, scalars);
		}
		_setWindowSize(windowSize) {
			wnaf.setWindowSize(this, windowSize);
		}
		assertValidity() {
			assertValidMemo(this);
		}
		equals(other) {
			aextpoint(other);
			const { ex: X1, ey: Y1, ez: Z1 } = this;
			const { ex: X2, ey: Y2, ez: Z2 } = other;
			const X1Z2 = modP(X1 * Z2);
			const X2Z1 = modP(X2 * Z1);
			const Y1Z2 = modP(Y1 * Z2);
			const Y2Z1 = modP(Y2 * Z1);
			return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		negate() {
			return new Point(modP(-this.ex), this.ey, this.ez, modP(-this.et));
		}
		double() {
			const { a } = CURVE;
			const { ex: X1, ey: Y1, ez: Z1 } = this;
			const A = modP(X1 * X1);
			const B = modP(Y1 * Y1);
			const C = modP(_2n$1 * modP(Z1 * Z1));
			const D = modP(a * A);
			const x1y1 = X1 + Y1;
			const E = modP(modP(x1y1 * x1y1) - A - B);
			const G = D + B;
			const F = G - C;
			const H = D - B;
			const X3 = modP(E * F);
			const Y3 = modP(G * H);
			const T3 = modP(E * H);
			const Z3 = modP(F * G);
			return new Point(X3, Y3, Z3, T3);
		}
		add(other) {
			aextpoint(other);
			const { a, d } = CURVE;
			const { ex: X1, ey: Y1, ez: Z1, et: T1 } = this;
			const { ex: X2, ey: Y2, ez: Z2, et: T2 } = other;
			const A = modP(X1 * X2);
			const B = modP(Y1 * Y2);
			const C = modP(T1 * d * T2);
			const D = modP(Z1 * Z2);
			const E = modP((X1 + Y1) * (X2 + Y2) - A - B);
			const F = D - C;
			const G = D + C;
			const H = modP(B - a * A);
			const X3 = modP(E * F);
			const Y3 = modP(G * H);
			const T3 = modP(E * H);
			const Z3 = modP(F * G);
			return new Point(X3, Y3, Z3, T3);
		}
		subtract(other) {
			return this.add(other.negate());
		}
		wNAF(n) {
			return wnaf.wNAFCached(this, n, Point.normalizeZ);
		}
		multiply(scalar) {
			const n = scalar;
			aInRange("scalar", n, _1n$2, CURVE_ORDER);
			const { p, f } = this.wNAF(n);
			return Point.normalizeZ([p, f])[0];
		}
		multiplyUnsafe(scalar, acc = Point.ZERO) {
			const n = scalar;
			aInRange("scalar", n, _0n$1, CURVE_ORDER);
			if (n === _0n$1) return I;
			if (this.is0() || n === _1n$2) return this;
			return wnaf.wNAFCachedUnsafe(this, n, Point.normalizeZ, acc);
		}
		isSmallOrder() {
			return this.multiplyUnsafe(cofactor).is0();
		}
		isTorsionFree() {
			return wnaf.unsafeLadder(this, CURVE_ORDER).is0();
		}
		toAffine(iz) {
			return toAffineMemo(this, iz);
		}
		clearCofactor() {
			const { h: cofactor } = CURVE;
			if (cofactor === _1n$2) return this;
			return this.multiplyUnsafe(cofactor);
		}
		static fromHex(hex, zip215 = false) {
			const { d, a } = CURVE;
			const len = Fp.BYTES;
			hex = ensureBytes("pointHex", hex, len);
			abool("zip215", zip215);
			const normed = hex.slice();
			const lastByte = hex[len - 1];
			normed[len - 1] = lastByte & -129;
			const y = bytesToNumberLE(normed);
			const max = zip215 ? MASK : Fp.ORDER;
			aInRange("pointHex.y", y, _0n$1, max);
			const y2 = modP(y * y);
			const u = modP(y2 - _1n$2);
			const v = modP(d * y2 - a);
			let { isValid, value: x } = uvRatio(u, v);
			if (!isValid) throw new Error("Point.fromHex: invalid y coordinate");
			const isXOdd = (x & _1n$2) === _1n$2;
			const isLastByteOdd = (lastByte & 128) !== 0;
			if (!zip215 && x === _0n$1 && isLastByteOdd) throw new Error("Point.fromHex: x=0 and x_0=1");
			if (isLastByteOdd !== isXOdd) x = modP(-x);
			return Point.fromAffine({
				x,
				y
			});
		}
		static fromPrivateKey(privKey) {
			const { scalar } = getPrivateScalar(privKey);
			return G.multiply(scalar);
		}
		toRawBytes() {
			const { x, y } = this.toAffine();
			const bytes = numberToBytesLE(y, Fp.BYTES);
			bytes[bytes.length - 1] |= x & _1n$2 ? 128 : 0;
			return bytes;
		}
		toHex() {
			return bytesToHex(this.toRawBytes());
		}
	}
	Point.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n$2, modP(CURVE.Gx * CURVE.Gy));
	Point.ZERO = new Point(_0n$1, _1n$2, _1n$2, _0n$1);
	const { BASE: G, ZERO: I } = Point;
	const wnaf = wNAF(Point, nByteLength * 8);
	function modN(a) {
		return mod(a, CURVE_ORDER);
	}
	function modN_LE(hash) {
		return modN(bytesToNumberLE(hash));
	}
	function getPrivateScalar(key) {
		const len = Fp.BYTES;
		key = ensureBytes("private key", key, len);
		const hashed = ensureBytes("hashed private key", cHash(key), 2 * len);
		const head = adjustScalarBytes(hashed.slice(0, len));
		return {
			head,
			prefix: hashed.slice(len, 2 * len),
			scalar: modN_LE(head)
		};
	}
	function getExtendedPublicKey(key) {
		const { head, prefix, scalar } = getPrivateScalar(key);
		const point = G.multiply(scalar);
		return {
			head,
			prefix,
			scalar,
			point,
			pointBytes: point.toRawBytes()
		};
	}
	function getPublicKey(privKey) {
		return getExtendedPublicKey(privKey).pointBytes;
	}
	function hashDomainToScalar(context = /* @__PURE__ */ new Uint8Array(), ...msgs) {
		const msg = concatBytes(...msgs);
		return modN_LE(cHash(domain(msg, ensureBytes("context", context), !!prehash)));
	}
	/** Signs message with privateKey. RFC8032 5.1.6 */
	function sign(msg, privKey, options = {}) {
		msg = ensureBytes("message", msg);
		if (prehash) msg = prehash(msg);
		const { prefix, scalar, pointBytes } = getExtendedPublicKey(privKey);
		const r = hashDomainToScalar(options.context, prefix, msg);
		const R = G.multiply(r).toRawBytes();
		const s = modN(r + hashDomainToScalar(options.context, R, pointBytes, msg) * scalar);
		aInRange("signature.s", s, _0n$1, CURVE_ORDER);
		return ensureBytes("result", concatBytes(R, numberToBytesLE(s, Fp.BYTES)), Fp.BYTES * 2);
	}
	const verifyOpts = VERIFY_DEFAULT;
	/**
	* Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
	* An extended group equation is checked.
	*/
	function verify(sig, msg, publicKey, options = verifyOpts) {
		const { context, zip215 } = options;
		const len = Fp.BYTES;
		sig = ensureBytes("signature", sig, 2 * len);
		msg = ensureBytes("message", msg);
		publicKey = ensureBytes("publicKey", publicKey, len);
		if (zip215 !== void 0) abool("zip215", zip215);
		if (prehash) msg = prehash(msg);
		const s = bytesToNumberLE(sig.slice(len, 2 * len));
		let A, R, SB;
		try {
			A = Point.fromHex(publicKey, zip215);
			R = Point.fromHex(sig.slice(0, len), zip215);
			SB = G.multiplyUnsafe(s);
		} catch (error) {
			return false;
		}
		if (!zip215 && A.isSmallOrder()) return false;
		const k = hashDomainToScalar(context, R.toRawBytes(), A.toRawBytes(), msg);
		return R.add(A.multiplyUnsafe(k)).subtract(SB).clearCofactor().equals(Point.ZERO);
	}
	G._setWindowSize(8);
	return {
		CURVE,
		getPublicKey,
		sign,
		verify,
		ExtendedPoint: Point,
		utils: {
			getExtendedPublicKey,
			/** ed25519 priv keys are uniform 32b. No need to check for modulo bias, like in secp256k1. */
			randomPrivateKey: () => randomBytes(Fp.BYTES),
			/**
			* We're doing scalar multiplication (used in getPublicKey etc) with precomputed BASE_POINT
			* values. This slows down first getPublicKey() by milliseconds (see Speed section),
			* but allows to speed-up subsequent getPublicKey() calls up to 20x.
			* @param windowSize 2, 4, 8, 16
			*/
			precompute(windowSize = 8, point = Point.BASE) {
				point._setWindowSize(windowSize);
				point.multiply(BigInt(3));
				return point;
			}
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@noble+curves@1.8.2/node_modules/@noble/curves/esm/abstract/montgomery.js
/**
* Montgomery curve methods. It's not really whole montgomery curve,
* just bunch of very specific methods for X25519 / X448 from
* [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n = BigInt(0);
const _1n$1 = BigInt(1);
function validateOpts(curve) {
	validateObject(curve, { a: "bigint" }, {
		montgomeryBits: "isSafeInteger",
		nByteLength: "isSafeInteger",
		adjustScalarBytes: "function",
		domain: "function",
		powPminus2: "function",
		Gu: "bigint"
	});
	return Object.freeze({ ...curve });
}
function montgomery(curveDef) {
	const CURVE = validateOpts(curveDef);
	const { P } = CURVE;
	const modP = (n) => mod(n, P);
	const montgomeryBits = CURVE.montgomeryBits;
	const montgomeryBytes = Math.ceil(montgomeryBits / 8);
	const fieldLen = CURVE.nByteLength;
	const adjustScalarBytes = CURVE.adjustScalarBytes || ((bytes) => bytes);
	const powPminus2 = CURVE.powPminus2 || ((x) => pow(x, P - BigInt(2), P));
	function cswap(swap, x_2, x_3) {
		const dummy = modP(swap * (x_2 - x_3));
		x_2 = modP(x_2 - dummy);
		x_3 = modP(x_3 + dummy);
		return [x_2, x_3];
	}
	const a24 = (CURVE.a - BigInt(2)) / BigInt(4);
	/**
	*
	* @param pointU u coordinate (x) on Montgomery Curve 25519
	* @param scalar by which the point would be multiplied
	* @returns new Point on Montgomery curve
	*/
	function montgomeryLadder(u, scalar) {
		aInRange("u", u, _0n, P);
		aInRange("scalar", scalar, _0n, P);
		const k = scalar;
		const x_1 = u;
		let x_2 = _1n$1;
		let z_2 = _0n;
		let x_3 = u;
		let z_3 = _1n$1;
		let swap = _0n;
		let sw;
		for (let t = BigInt(montgomeryBits - 1); t >= _0n; t--) {
			const k_t = k >> t & _1n$1;
			swap ^= k_t;
			sw = cswap(swap, x_2, x_3);
			x_2 = sw[0];
			x_3 = sw[1];
			sw = cswap(swap, z_2, z_3);
			z_2 = sw[0];
			z_3 = sw[1];
			swap = k_t;
			const A = x_2 + z_2;
			const AA = modP(A * A);
			const B = x_2 - z_2;
			const BB = modP(B * B);
			const E = AA - BB;
			const C = x_3 + z_3;
			const D = x_3 - z_3;
			const DA = modP(D * A);
			const CB = modP(C * B);
			const dacb = DA + CB;
			const da_cb = DA - CB;
			x_3 = modP(dacb * dacb);
			z_3 = modP(x_1 * modP(da_cb * da_cb));
			x_2 = modP(AA * BB);
			z_2 = modP(E * (AA + modP(a24 * E)));
		}
		sw = cswap(swap, x_2, x_3);
		x_2 = sw[0];
		x_3 = sw[1];
		sw = cswap(swap, z_2, z_3);
		z_2 = sw[0];
		z_3 = sw[1];
		const z2 = powPminus2(z_2);
		return modP(x_2 * z2);
	}
	function encodeUCoordinate(u) {
		return numberToBytesLE(modP(u), montgomeryBytes);
	}
	function decodeUCoordinate(uEnc) {
		const u = ensureBytes("u coordinate", uEnc, montgomeryBytes);
		if (fieldLen === 32) u[31] &= 127;
		return bytesToNumberLE(u);
	}
	function decodeScalar(n) {
		const bytes = ensureBytes("scalar", n);
		const len = bytes.length;
		if (len !== montgomeryBytes && len !== fieldLen) {
			let valid = "" + montgomeryBytes + " or " + fieldLen;
			throw new Error("invalid scalar, expected " + valid + " bytes, got " + len);
		}
		return bytesToNumberLE(adjustScalarBytes(bytes));
	}
	function scalarMult(scalar, u) {
		const pu = montgomeryLadder(decodeUCoordinate(u), decodeScalar(scalar));
		if (pu === _0n) throw new Error("invalid private or public key received");
		return encodeUCoordinate(pu);
	}
	const GuBytes = encodeUCoordinate(CURVE.Gu);
	function scalarMultBase(scalar) {
		return scalarMult(scalar, GuBytes);
	}
	return {
		scalarMult,
		scalarMultBase,
		getSharedSecret: (privateKey, publicKey) => scalarMult(privateKey, publicKey),
		getPublicKey: (privateKey) => scalarMultBase(privateKey),
		utils: { randomPrivateKey: () => CURVE.randomBytes(CURVE.nByteLength) },
		GuBytes
	};
}
//#endregion
//#region node_modules/.pnpm/@noble+curves@1.8.2/node_modules/@noble/curves/esm/ed25519.js
/**
* ed25519 Twisted Edwards curve with following addons:
* - X25519 ECDH
* - Ristretto cofactor elimination
* - Elligator hash-to-group / point indistinguishability
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ED25519_P = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819949");
const ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
const _1n = BigInt(1);
const _2n = BigInt(2);
const _3n = BigInt(3);
const _5n = BigInt(5);
const _8n = BigInt(8);
function ed25519_pow_2_252_3(x) {
	const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
	const P = ED25519_P;
	const b2 = x * x % P * x % P;
	const b5 = pow2(pow2(b2, _2n, P) * b2 % P, _1n, P) * x % P;
	const b10 = pow2(b5, _5n, P) * b5 % P;
	const b20 = pow2(b10, _10n, P) * b10 % P;
	const b40 = pow2(b20, _20n, P) * b20 % P;
	const b80 = pow2(b40, _40n, P) * b40 % P;
	return {
		pow_p_5_8: pow2(pow2(pow2(pow2(b80, _80n, P) * b80 % P, _80n, P) * b80 % P, _10n, P) * b10 % P, _2n, P) * x % P,
		b2
	};
}
function adjustScalarBytes(bytes) {
	bytes[0] &= 248;
	bytes[31] &= 127;
	bytes[31] |= 64;
	return bytes;
}
function uvRatio(u, v) {
	const P = ED25519_P;
	const v3 = mod(v * v * v, P);
	const pow = ed25519_pow_2_252_3(u * mod(v3 * v3 * v, P)).pow_p_5_8;
	let x = mod(u * v3 * pow, P);
	const vx2 = mod(v * x * x, P);
	const root1 = x;
	const root2 = mod(x * ED25519_SQRT_M1, P);
	const useRoot1 = vx2 === u;
	const useRoot2 = vx2 === mod(-u, P);
	const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
	if (useRoot1) x = root1;
	if (useRoot2 || noRoot) x = root2;
	if (isNegativeLE(x, P)) x = mod(-x, P);
	return {
		isValid: useRoot1 || useRoot2,
		value: x
	};
}
const Fp = /* @__PURE__ */ (() => Field(ED25519_P, void 0, true))();
const ed25519Defaults = /* @__PURE__ */ (() => ({
	a: Fp.create(BigInt(-1)),
	d: BigInt("37095705934669439343138083508754565189542113879843219016388785533085940283555"),
	Fp,
	n: BigInt("7237005577332262213973186563042994240857116359379907606001950938285454250989"),
	h: _8n,
	Gx: BigInt("15112221349535400772501151409588531511454012693041857206046113283949847762202"),
	Gy: BigInt("46316835694926478169428394003475163141307993866256225615783033603165251855960"),
	hash: sha512,
	randomBytes: randomBytes$1,
	adjustScalarBytes,
	uvRatio
}))();
/**
* ed25519 curve with EdDSA signatures.
* @example
* import { ed25519 } from '@noble/curves/ed25519';
* const priv = ed25519.utils.randomPrivateKey();
* const pub = ed25519.getPublicKey(priv);
* const msg = new TextEncoder().encode('hello');
* const sig = ed25519.sign(msg, priv);
* ed25519.verify(sig, msg, pub); // Default mode: follows ZIP215
* ed25519.verify(sig, msg, pub, { zip215: false }); // RFC8032 / FIPS 186-5
*/
const ed25519 = /* @__PURE__ */ (() => twistedEdwards(ed25519Defaults))();
/**
* ECDH using curve25519 aka x25519.
* @example
* import { x25519 } from '@noble/curves/ed25519';
* const priv = 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4';
* const pub = 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c';
* x25519.getSharedSecret(priv, pub) === x25519.scalarMult(priv, pub); // aliases
* x25519.getPublicKey(priv) === x25519.scalarMultBase(priv);
* x25519.getPublicKey(x25519.utils.randomPrivateKey());
*/
const x25519 = /* @__PURE__ */ (() => montgomery({
	P: ED25519_P,
	a: BigInt(486662),
	montgomeryBits: 255,
	nByteLength: 32,
	Gu: BigInt(9),
	powPminus2: (x) => {
		const P = ED25519_P;
		const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
		return mod(pow2(pow_p_5_8, _3n, P) * b2, P);
	},
	adjustScalarBytes,
	randomBytes: randomBytes$1
}))();
//#endregion
//#region vendor/anp-typescript-sdk/dist/index.js
var import_canonicalize = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function serialize(object) {
		if (typeof object === "number" && isNaN(object)) throw new Error("NaN is not allowed");
		if (typeof object === "number" && !isFinite(object)) throw new Error("Infinity is not allowed");
		if (object === null || typeof object !== "object") return JSON.stringify(object);
		if (object.toJSON instanceof Function) return serialize(object.toJSON());
		if (Array.isArray(object)) return `[${object.reduce((t, cv, ci) => {
			return `${t}${ci === 0 ? "" : ","}${serialize(cv === void 0 || typeof cv === "symbol" ? null : cv)}`;
		}, "")}]`;
		return `{${Object.keys(object).sort().reduce((t, cv) => {
			if (object[cv] === void 0 || typeof object[cv] === "symbol") return t;
			return `${t}${t.length === 0 ? "" : ","}${serialize(cv)}:${serialize(object[cv])}`;
		}, "")}}`;
	};
})))(), 1);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
};
var ANPError = class extends Error {
	constructor(message, code, cause) {
		super(message, { cause });
		this.code = code;
		this.name = "ANPError";
	}
	code;
};
var CryptoError = class extends ANPError {
	constructor(message, cause) {
		super(message, "CRYPTO_ERROR", cause);
		this.name = "CryptoError";
	}
};
var AuthenticationError = class extends ANPError {
	constructor(message, cause) {
		super(message, "AUTHENTICATION_ERROR", cause);
		this.name = "AuthenticationError";
	}
};
var ProofError = class extends ANPError {
	constructor(message, cause) {
		super(message, "PROOF_ERROR", cause);
		this.name = "ProofError";
	}
};
function encodeBase64Url(value) {
	return Buffer.from(value).toString("base64url");
}
function decodeBase64Url(value) {
	return new Uint8Array(Buffer.from(value, "base64url"));
}
function encodeBase64(value) {
	return Buffer.from(value).toString("base64");
}
function decodeBase64(value) {
	return new Uint8Array(Buffer.from(value, "base64"));
}
var PEM_LINE_LENGTH = 64;
function encodePem(label, bytes) {
	const encoded = encodeBase64(bytes);
	const lines = [];
	for (let index = 0; index < encoded.length; index += PEM_LINE_LENGTH) lines.push(encoded.slice(index, index + PEM_LINE_LENGTH));
	return `-----BEGIN ${label}-----
${lines.join("\n")}
-----END ${label}-----
`;
}
function decodePem(input) {
	const lines = input.trim().split(/\r?\n/);
	if (lines.length < 3) throw new Error("Invalid PEM structure");
	const beginLine = lines[0];
	const endLine = lines.at(-1);
	if (!beginLine.startsWith("-----BEGIN ") || !beginLine.endsWith("-----")) throw new Error("Invalid PEM structure");
	const label = beginLine.slice(11, -5);
	if (endLine !== `-----END ${label}-----`) throw new Error("Invalid PEM structure");
	return {
		label,
		bytes: decodeBase64(lines.slice(1, -1).join(""))
	};
}
var PRIVATE_LABELS = {
	secp256k1: "ANP SECP256K1 PRIVATE KEY",
	secp256r1: "ANP SECP256R1 PRIVATE KEY",
	ed25519: "ANP ED25519 PRIVATE KEY",
	x25519: "ANP X25519 PRIVATE KEY"
};
var PUBLIC_LABELS = {
	secp256k1: "ANP SECP256K1 PUBLIC KEY",
	secp256r1: "ANP SECP256R1 PUBLIC KEY",
	ed25519: "ANP ED25519 PUBLIC KEY",
	x25519: "ANP X25519 PUBLIC KEY"
};
var EC_CURVES = {
	secp256k1: "secp256k1",
	secp256r1: "prime256v1"
};
function sha256(value) {
	return new Uint8Array(createHash("sha256").update(value).digest());
}
function normalizePrivateKeyMaterial(input) {
	return typeof input === "string" ? privateKeyFromPem(input) : input;
}
function normalizePublicKeyMaterial(input) {
	return typeof input === "string" ? publicKeyFromPem(input) : input;
}
function generatePrivateKeyMaterial(type) {
	switch (type) {
		case "secp256k1": {
			const { privateKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
			return {
				type,
				bytes: requireBase64UrlBytes(privateKey.export({ format: "jwk" }).d, "Missing secp256k1 private key")
			};
		}
		case "secp256r1": {
			const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
			return {
				type,
				bytes: requireBase64UrlBytes(privateKey.export({ format: "jwk" }).d, "Missing secp256r1 private key")
			};
		}
		case "ed25519": {
			const { privateKey } = generateKeyPairSync("ed25519");
			return {
				type,
				bytes: requireBase64UrlBytes(privateKey.export({ format: "jwk" }).d, "Missing ed25519 private key")
			};
		}
		case "x25519": {
			const { privateKey } = generateKeyPairSync("x25519");
			return {
				type,
				bytes: requireBase64UrlBytes(privateKey.export({ format: "jwk" }).d, "Missing x25519 private key")
			};
		}
		default: throw new CryptoError(`Unsupported key type: ${String(type)}`);
	}
}
function derivePublicKey(privateKey) {
	switch (privateKey.type) {
		case "secp256k1":
		case "secp256r1": {
			const ecdh = createECDH(EC_CURVES[privateKey.type]);
			ecdh.setPrivateKey(Buffer.from(privateKey.bytes));
			return {
				type: privateKey.type,
				bytes: new Uint8Array(ecdh.getPublicKey(void 0, "compressed"))
			};
		}
		case "ed25519": return {
			type: "ed25519",
			bytes: ed25519.getPublicKey(privateKey.bytes)
		};
		case "x25519": return {
			type: "x25519",
			bytes: x25519.getPublicKey(privateKey.bytes)
		};
		default: throw new CryptoError(`Unsupported key type: ${String(privateKey.type)}`);
	}
}
function generateKeyPairPem(type) {
	const privateKey = generatePrivateKeyMaterial(type);
	const publicKey = derivePublicKey(privateKey);
	return {
		privateKey,
		publicKey,
		pair: {
			privateKeyPem: privateKeyToPem(privateKey),
			publicKeyPem: publicKeyToPem(publicKey)
		}
	};
}
function privateKeyToPem(privateKey) {
	return encodePem(PRIVATE_LABELS[privateKey.type], privateKey.bytes);
}
function publicKeyToPem(publicKey) {
	return encodePem(PUBLIC_LABELS[publicKey.type], publicKey.bytes);
}
function privateKeyFromPem(input) {
	const decoded = decodePem(input);
	return {
		type: keyTypeFromLabel(decoded.label, true),
		bytes: decoded.bytes
	};
}
function publicKeyFromPem(input) {
	const decoded = decodePem(input);
	return {
		type: keyTypeFromLabel(decoded.label, false),
		bytes: decoded.bytes
	};
}
function signMessage(privateKey, message) {
	const keyObject = toPrivateKeyObject(privateKey);
	switch (privateKey.type) {
		case "secp256k1":
		case "secp256r1": return new Uint8Array(sign("sha256", Buffer.from(message), {
			key: keyObject,
			dsaEncoding: "ieee-p1363"
		}));
		case "ed25519": return new Uint8Array(sign(null, Buffer.from(message), keyObject));
		case "x25519": throw new CryptoError("X25519 keys cannot be used for signing");
		default: throw new CryptoError(`Unsupported key type: ${String(privateKey.type)}`);
	}
}
function verifyMessage(publicKey, message, signature) {
	const keyObject = toPublicKeyObject(publicKey);
	switch (publicKey.type) {
		case "secp256k1":
		case "secp256r1": return verify("sha256", Buffer.from(message), {
			key: keyObject,
			dsaEncoding: "ieee-p1363"
		}, Buffer.from(signature));
		case "ed25519": return verify(null, Buffer.from(message), keyObject, Buffer.from(signature));
		case "x25519": throw new CryptoError("X25519 keys cannot be used for signature verification");
		default: throw new CryptoError(`Unsupported key type: ${String(publicKey.type)}`);
	}
}
function publicKeyToJwk(publicKey) {
	switch (publicKey.type) {
		case "secp256k1":
		case "secp256r1": {
			const uncompressed = new Uint8Array(ECDH.convertKey(Buffer.from(publicKey.bytes), EC_CURVES[publicKey.type], void 0, void 0, "uncompressed"));
			if (uncompressed.length !== 65 || uncompressed[0] !== 4) throw new AuthenticationError("Invalid EC public key");
			return {
				kty: "EC",
				crv: publicKey.type === "secp256k1" ? "secp256k1" : "P-256",
				x: encodeBase64Url(uncompressed.slice(1, 33)),
				y: encodeBase64Url(uncompressed.slice(33, 65))
			};
		}
		case "ed25519": return {
			kty: "OKP",
			crv: "Ed25519",
			x: encodeBase64Url(publicKey.bytes)
		};
		case "x25519": return {
			kty: "OKP",
			crv: "X25519",
			x: encodeBase64Url(publicKey.bytes)
		};
		default: throw new AuthenticationError("Unsupported public key type");
	}
}
function computeJwkThumbprint(jwk) {
	const ordered = Object.keys(jwk).sort().reduce((result, key) => {
		const value = jwk[key];
		if (typeof value === "string") result[key] = value;
		return result;
	}, {});
	return encodeBase64Url(sha256(new TextEncoder().encode(JSON.stringify(ordered))));
}
function ed25519PublicKeyToMultibase(publicKey) {
	return `z${esm_default.encode(Buffer.concat([Buffer.from([237, 1]), Buffer.from(publicKey)]))}`;
}
function x25519PublicKeyToMultibase(publicKey) {
	return `z${esm_default.encode(Buffer.concat([Buffer.from([236, 1]), Buffer.from(publicKey)]))}`;
}
function parseEd25519Multibase(value) {
	const bytes = esm_default.decode(stripMultibasePrefix(value));
	const normalized = bytes.length === 34 && bytes[0] === 237 && bytes[1] === 1 ? bytes.slice(2) : bytes;
	if (normalized.length !== 32) throw new AuthenticationError("Invalid Ed25519 multibase value");
	return {
		type: "ed25519",
		bytes: new Uint8Array(normalized)
	};
}
function parseX25519Multibase(value) {
	const bytes = esm_default.decode(stripMultibasePrefix(value));
	const normalized = bytes.length === 34 && bytes[0] === 236 && bytes[1] === 1 ? bytes.slice(2) : bytes;
	if (normalized.length !== 32) throw new AuthenticationError("Invalid X25519 multibase value");
	return {
		type: "x25519",
		bytes: new Uint8Array(normalized)
	};
}
function publicKeyFromJwk(jwk) {
	if (jwk.kty === "EC" && jwk.x && jwk.y) {
		const curve = jwk.crv;
		if (curve !== "secp256k1" && curve !== "P-256") throw new AuthenticationError(`Unsupported EC curve: ${curve}`);
		const keySize = 32;
		const uncompressed = Buffer.concat([
			Buffer.from([4]),
			leftPadCoordinate(decodeBase64Url(jwk.x), keySize),
			leftPadCoordinate(decodeBase64Url(jwk.y), keySize)
		]);
		const bytes = new Uint8Array(ECDH.convertKey(uncompressed, curve === "secp256k1" ? "secp256k1" : "prime256v1", void 0, void 0, "compressed"));
		return {
			type: curve === "secp256k1" ? "secp256k1" : "secp256r1",
			bytes
		};
	}
	if (jwk.kty === "OKP" && jwk.x) {
		if (jwk.crv === "Ed25519") return {
			type: "ed25519",
			bytes: decodeBase64Url(jwk.x)
		};
		if (jwk.crv === "X25519") return {
			type: "x25519",
			bytes: decodeBase64Url(jwk.x)
		};
	}
	throw new AuthenticationError("Unsupported JWK key material");
}
function leftPadCoordinate(value, size) {
	if (value.length > size) throw new AuthenticationError("Invalid EC public key coordinate length");
	if (value.length === size) return Buffer.from(value);
	return Buffer.concat([Buffer.alloc(size - value.length), Buffer.from(value)]);
}
function toPrivateKeyObject(privateKey) {
	switch (privateKey.type) {
		case "secp256k1":
		case "secp256r1": {
			const ecdh = createECDH(EC_CURVES[privateKey.type]);
			ecdh.setPrivateKey(Buffer.from(privateKey.bytes));
			const publicKey = new Uint8Array(ecdh.getPublicKey(void 0, "uncompressed"));
			return createPrivateKey({
				key: {
					kty: "EC",
					crv: privateKey.type === "secp256k1" ? "secp256k1" : "P-256",
					d: encodeBase64Url(privateKey.bytes),
					x: encodeBase64Url(publicKey.slice(1, 33)),
					y: encodeBase64Url(publicKey.slice(33, 65))
				},
				format: "jwk"
			});
		}
		case "ed25519": {
			const publicKey = ed25519.getPublicKey(privateKey.bytes);
			return createPrivateKey({
				key: {
					kty: "OKP",
					crv: "Ed25519",
					d: encodeBase64Url(privateKey.bytes),
					x: encodeBase64Url(publicKey)
				},
				format: "jwk"
			});
		}
		case "x25519": {
			const publicKey = x25519.getPublicKey(privateKey.bytes);
			return createPrivateKey({
				key: {
					kty: "OKP",
					crv: "X25519",
					d: encodeBase64Url(privateKey.bytes),
					x: encodeBase64Url(publicKey)
				},
				format: "jwk"
			});
		}
		default: throw new CryptoError(`Unsupported key type: ${String(privateKey.type)}`);
	}
}
function toPublicKeyObject(publicKey) {
	return createPublicKey({
		key: publicKeyToJwk(publicKey),
		format: "jwk"
	});
}
function keyTypeFromLabel(label, isPrivate) {
	const source = isPrivate ? PRIVATE_LABELS : PUBLIC_LABELS;
	for (const [type, candidate] of Object.entries(source)) if (candidate === label) return type;
	throw new AuthenticationError(`Unsupported PEM label: ${label}`);
}
function requireBase64UrlBytes(value, message) {
	if (!value) throw new AuthenticationError(message);
	return decodeBase64Url(value);
}
function stripMultibasePrefix(value) {
	return value.startsWith("z") ? value.slice(1) : value;
}
function extractPublicKey(method) {
	switch (method.type) {
		case "EcdsaSecp256k1VerificationKey2019": return extractEcPublicKey(method, "secp256k1");
		case "EcdsaSecp256r1VerificationKey2019": return extractEcPublicKey(method, "P-256");
		case "Ed25519VerificationKey2018":
		case "Ed25519VerificationKey2020":
		case "Multikey": return extractEd25519PublicKey(method);
		case "X25519KeyAgreementKey2019": return extractX25519PublicKey(method);
		case "JsonWebKey2020":
			if (!method.publicKeyJwk) throw new AuthenticationError("Missing key material");
			return publicKeyFromJwk(method.publicKeyJwk);
		default: throw new AuthenticationError(`Unsupported verification method type: ${method.type}`);
	}
}
function extractEcPublicKey(method, expectedCurve) {
	if (method.publicKeyJwk) {
		const publicKey = publicKeyFromJwk(method.publicKeyJwk);
		if ((publicKey.type === "secp256k1" ? "secp256k1" : "P-256") !== expectedCurve) throw new AuthenticationError("Invalid JWK parameters");
		return publicKey;
	}
	if (method.publicKeyMultibase) return {
		type: expectedCurve === "secp256k1" ? "secp256k1" : "secp256r1",
		bytes: new Uint8Array(esm_default.decode(stripMultibasePrefix2(method.publicKeyMultibase)))
	};
	throw new AuthenticationError("Missing key material");
}
function extractEd25519PublicKey(method) {
	if (method.publicKeyJwk) return publicKeyFromJwk(method.publicKeyJwk);
	if (method.publicKeyMultibase) return parseEd25519Multibase(method.publicKeyMultibase);
	if (method.publicKeyBase58) {
		const bytes = esm_default.decode(method.publicKeyBase58);
		if (bytes.length !== 32) throw new AuthenticationError("Invalid Ed25519 publicKeyBase58");
		return {
			type: "ed25519",
			bytes: new Uint8Array(bytes)
		};
	}
	throw new AuthenticationError("Missing key material");
}
function extractX25519PublicKey(method) {
	if (!method.publicKeyMultibase) throw new AuthenticationError("Missing key material");
	return parseX25519Multibase(method.publicKeyMultibase);
}
function stripMultibasePrefix2(value) {
	return value.startsWith("z") ? value.slice(1) : value;
}
function canonicalizeJson(value) {
	const output = (0, import_canonicalize.default)(value);
	if (output === void 0) throw new Error("Failed to canonicalize JSON value");
	return new TextEncoder().encode(output);
}
function cloneJson(value) {
	return structuredClone(value);
}
var PROOF_TYPE_SECP256K1 = "EcdsaSecp256k1Signature2019";
var PROOF_TYPE_ED25519 = "Ed25519Signature2020";
var PROOF_TYPE_DATA_INTEGRITY = "DataIntegrityProof";
var CRYPTOSUITE_EDDSA_JCS_2022 = "eddsa-jcs-2022";
var CRYPTOSUITE_DIDWBA_SECP256K1_2025 = "didwba-jcs-ecdsa-secp256k1-2025";
function generateW3cProof(document, privateKeyInput, verificationMethod, options = {}) {
	const privateKey = normalizePrivateKeyMaterial(privateKeyInput);
	const proofType = options.proofType ?? inferProofType(privateKey.type);
	validateProofCompatibility(privateKey.type, proofType, options.cryptosuite);
	const proof2 = {
		type: proofType,
		created: options.created ?? (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
		verificationMethod,
		proofPurpose: options.proofPurpose ?? "assertionMethod",
		proofValue: ""
	};
	if (proofType === "DataIntegrityProof") proof2.cryptosuite = options.cryptosuite ?? inferCryptosuite(privateKey.type);
	if (options.domain) proof2.domain = options.domain;
	if (options.challenge) proof2.challenge = options.challenge;
	const signingDocument = cloneJson(document);
	delete signingDocument.proof;
	proof2.proofValue = encodeBase64Url(signMessage(privateKey, computeSigningInput(signingDocument, omitProofValue(proof2))));
	return {
		...cloneJson(document),
		proof: proof2
	};
}
function verifyW3cProof(document, publicKeyInput, options = {}) {
	try {
		verifyW3cProofDetailed(document, publicKeyInput, options);
		return true;
	} catch {
		return false;
	}
}
function verifyW3cProofDetailed(document, publicKeyInput, options = {}) {
	const publicKey = normalizePublicKeyMaterial(publicKeyInput);
	const proof2 = document.proof;
	if (!proof2 || typeof proof2 !== "object") throw new ProofError("Missing proof object");
	const proofObject = proof2;
	const proofType = requireStringField(proofObject, "type");
	const proofValue = requireStringField(proofObject, "proofValue");
	const proofPurpose = requireStringField(proofObject, "proofPurpose");
	requireStringField(proofObject, "verificationMethod");
	requireStringField(proofObject, "created");
	validatePublicKeyCompatibility(publicKey.type, proofType, proofObject.cryptosuite);
	if (options.expectedPurpose && options.expectedPurpose !== proofPurpose) throw new ProofError("Verification failed: proofPurpose mismatch");
	if (options.expectedDomain && proofObject.domain !== options.expectedDomain) throw new ProofError("Verification failed: domain mismatch");
	if (options.expectedChallenge && proofObject.challenge !== options.expectedChallenge) throw new ProofError("Verification failed: challenge mismatch");
	const signingDocument = cloneJson(document);
	delete signingDocument.proof;
	if (!verifyMessage(publicKey, computeSigningInput(signingDocument, omitProofValue(proofObject)), decodeBase64Url(proofValue))) throw new ProofError("Verification failed");
}
function inferProofType(keyType) {
	switch (keyType) {
		case "secp256k1": return PROOF_TYPE_SECP256K1;
		case "ed25519": return PROOF_TYPE_ED25519;
		default: return PROOF_TYPE_DATA_INTEGRITY;
	}
}
function inferCryptosuite(keyType) {
	switch (keyType) {
		case "ed25519": return CRYPTOSUITE_EDDSA_JCS_2022;
		case "secp256k1": return CRYPTOSUITE_DIDWBA_SECP256K1_2025;
		default: throw new ProofError(`Unsupported cryptosuite for key type: ${keyType}`);
	}
}
function validateProofCompatibility(keyType, proofType, cryptosuite) {
	if (proofType === "EcdsaSecp256k1Signature2019" && keyType !== "secp256k1") throw new ProofError("Key type mismatch for secp256k1 proof generation");
	if (proofType === "Ed25519Signature2020" && keyType !== "ed25519") throw new ProofError("Key type mismatch for Ed25519 proof generation");
	if (proofType === "DataIntegrityProof" && cryptosuite) validateCryptosuite(keyType, cryptosuite);
}
function validatePublicKeyCompatibility(keyType, proofType, cryptosuite) {
	if (proofType === "EcdsaSecp256k1Signature2019" && keyType !== "secp256k1") throw new ProofError("Invalid public key for proof verification");
	if (proofType === "Ed25519Signature2020" && keyType !== "ed25519") throw new ProofError("Invalid public key for proof verification");
	if (proofType === "DataIntegrityProof" && cryptosuite) validateCryptosuite(keyType, cryptosuite);
}
function validateCryptosuite(keyType, cryptosuite) {
	if (cryptosuite === "eddsa-jcs-2022" && keyType !== "ed25519") throw new ProofError("Unsupported cryptosuite for non-Ed25519 key");
	if (cryptosuite === "didwba-jcs-ecdsa-secp256k1-2025" && keyType !== "secp256k1") throw new ProofError("Unsupported cryptosuite for non-secp256k1 key");
	if (cryptosuite !== "eddsa-jcs-2022" && cryptosuite !== "didwba-jcs-ecdsa-secp256k1-2025") throw new ProofError(`Unsupported cryptosuite: ${cryptosuite}`);
}
function computeSigningInput(document, proofOptions) {
	const documentHash = sha256(canonicalizeJson(document));
	const proofHash = sha256(canonicalizeJson(proofOptions));
	const combined = new Uint8Array(documentHash.length + proofHash.length);
	combined.set(proofHash, 0);
	combined.set(documentHash, proofHash.length);
	return combined;
}
function omitProofValue(proof2) {
	const clone = { ...proof2 };
	delete clone.proofValue;
	return clone;
}
function requireStringField(proof2, key) {
	const value = proof2[key];
	if (typeof value !== "string" || value.length === 0) throw new ProofError(`Missing proof field: ${String(key)}`);
	return value;
}
var VM_KEY_AUTH = "key-1";
var VM_KEY_E2EE_SIGNING = "key-2";
var VM_KEY_E2EE_AGREEMENT = "key-3";
var ANP_MESSAGE_SERVICE_TYPE = "ANPMessageService";
function buildAnpMessageService(didOrServiceRef, serviceEndpoint, options = {}) {
	const fragment = options.fragment ?? "message";
	const service = {
		id: didOrServiceRef.startsWith("#") || didOrServiceRef.startsWith("did:") ? didOrServiceRef.startsWith("#") ? didOrServiceRef : `${didOrServiceRef}#${fragment}` : `${didOrServiceRef}#${fragment}`,
		type: ANP_MESSAGE_SERVICE_TYPE,
		serviceEndpoint
	};
	if (options.serviceDid) service.serviceDid = options.serviceDid;
	if (options.profiles?.length) service.profiles = [...options.profiles];
	if (options.securityProfiles?.length) service.securityProfiles = [...options.securityProfiles];
	if (options.accepts?.length) service.accepts = [...options.accepts];
	if (options.priority !== void 0) service.priority = options.priority;
	if (options.authSchemes?.length) service.authSchemes = [...options.authSchemes];
	return service;
}
function createDidWbaDocument(hostname, options = {}) {
	if (!hostname.trim()) throw new AuthenticationError("Hostname cannot be empty");
	if (isIP(hostname) !== 0) throw new AuthenticationError("Hostname cannot be an IP address");
	const didProfile = options.didProfile ?? "e1";
	const didBase = buildDidBase(hostname, options.port);
	const pathSegments = [...options.pathSegments ?? []];
	const contexts = ["https://www.w3.org/ns/did/v1"];
	const verificationMethods = [];
	const authentication2 = [];
	const assertionMethod = [];
	const keyAgreement = [];
	const keys = {};
	const authKey = generateKeyPairPem(didProfile === "e1" ? "ed25519" : "secp256k1");
	const authPublicKey = authKey.publicKey;
	let did = didBase;
	if (didProfile === "e1" && pathSegments.length > 0) pathSegments.push(`e1_${computeMultikeyFingerprint(authPublicKey)}`);
	if (didProfile === "k1" && pathSegments.length > 0) pathSegments.push(`k1_${computeJwkFingerprint(authPublicKey)}`);
	did = joinDid(didBase, pathSegments);
	const authVerificationMethodId = `${did}#${VM_KEY_AUTH}`;
	const authVerificationMethod = buildAuthVerificationMethod(did, didProfile, authPublicKey, contexts);
	verificationMethods.push(authVerificationMethod);
	authentication2.push(authVerificationMethodId);
	if (didProfile === "e1" || didProfile === "k1") assertionMethod.push(authVerificationMethodId);
	keys[VM_KEY_AUTH] = authKey.pair;
	if (options.enableE2ee !== false) {
		contexts.push("https://w3id.org/security/suites/x25519-2019/v1");
		const signingKey = generateKeyPairPem("secp256r1");
		const agreementKey = generateKeyPairPem("x25519");
		verificationMethods.push({
			id: `${did}#${VM_KEY_E2EE_SIGNING}`,
			type: "EcdsaSecp256r1VerificationKey2019",
			controller: did,
			publicKeyJwk: publicKeyToJwk(signingKey.publicKey)
		});
		verificationMethods.push({
			id: `${did}#${VM_KEY_E2EE_AGREEMENT}`,
			type: "X25519KeyAgreementKey2019",
			controller: did,
			publicKeyMultibase: x25519PublicKeyToMultibase(agreementKey.publicKey.bytes)
		});
		keyAgreement.push(`${did}#${VM_KEY_E2EE_AGREEMENT}`);
		keys[VM_KEY_E2EE_SIGNING] = signingKey.pair;
		keys[VM_KEY_E2EE_AGREEMENT] = agreementKey.pair;
	}
	const document = {
		"@context": contexts,
		id: did,
		verificationMethod: verificationMethods,
		authentication: authentication2
	};
	if (assertionMethod.length > 0) document.assertionMethod = assertionMethod;
	if (keyAgreement.length > 0) document.keyAgreement = keyAgreement;
	const services = buildServiceEntries(did, options.agentDescriptionUrl, options.services);
	if (services.length > 0) document.service = services;
	const proofOptions = {
		proofPurpose: options.proofPurpose ?? "assertionMethod",
		proofType: didProfile === "plain_legacy" ? PROOF_TYPE_SECP256K1 : PROOF_TYPE_DATA_INTEGRITY,
		cryptosuite: didProfile === "e1" ? CRYPTOSUITE_EDDSA_JCS_2022 : didProfile === "k1" ? CRYPTOSUITE_DIDWBA_SECP256K1_2025 : void 0,
		created: options.created,
		domain: options.domain,
		challenge: options.challenge
	};
	return {
		didDocument: generateW3cProof(document, authKey.privateKey, options.verificationMethod ?? authVerificationMethodId, proofOptions),
		keys
	};
}
function computeJwkFingerprint(publicKeyInput) {
	const publicKey = normalizePublicKeyMaterial(publicKeyInput);
	if (publicKey.type !== "secp256k1") throw new AuthenticationError("Invalid DID document");
	return computeJwkThumbprint(publicKeyToJwk(publicKey));
}
function computeMultikeyFingerprint(publicKeyInput) {
	const publicKey = normalizePublicKeyMaterial(publicKeyInput);
	if (publicKey.type !== "ed25519") throw new AuthenticationError("Invalid DID document");
	return computeJwkThumbprint(publicKeyToJwk(publicKey));
}
function verifyDidKeyBinding(did, bindingMaterial) {
	const lastSegment = did.split(":").at(-1) ?? "";
	const publicKey = toPublicKeyMaterial(bindingMaterial);
	if (lastSegment.startsWith("k1_")) return publicKey.type === "secp256k1" && computeJwkFingerprint(publicKey) === lastSegment.slice(3);
	if (lastSegment.startsWith("e1_")) return publicKey.type === "ed25519" && computeMultikeyFingerprint(publicKey) === lastSegment.slice(3);
	return true;
}
function validateDidDocumentBinding(didDocument, verifyProof = true) {
	const lastSegment = didDocument.id.split(":").at(-1) ?? "";
	if (lastSegment.startsWith("e1_")) return validateE1Binding(didDocument, lastSegment.slice(3));
	if (lastSegment.startsWith("k1_")) {
		if (verifyProof) return validateK1Binding(didDocument, lastSegment.slice(3));
		return didDocument.verificationMethod.some((method) => isAuthenticationAuthorized(didDocument, method.id) && verifyDidKeyBinding(didDocument.id, method));
	}
	return true;
}
function findVerificationMethod(didDocument, verificationMethodId) {
	const directMethod = didDocument.verificationMethod.find((method) => method.id === verificationMethodId);
	if (directMethod) return directMethod;
	for (const entry of didDocument.authentication) if (typeof entry !== "string" && entry.id === verificationMethodId) return entry;
	for (const entry of didDocument.assertionMethod ?? []) if (typeof entry !== "string" && entry.id === verificationMethodId) return entry;
}
function isAuthenticationAuthorized(didDocument, verificationMethodId) {
	return isVerificationMethodAuthorized(didDocument.authentication, verificationMethodId);
}
function isAssertionMethodAuthorized(didDocument, verificationMethodId) {
	return isVerificationMethodAuthorized(didDocument.assertionMethod ?? [], verificationMethodId);
}
function validateE1Binding(didDocument, expectedFingerprint) {
	const proof2 = didDocument.proof;
	if (!proof2) return false;
	if (proof2.type !== "DataIntegrityProof" || proof2.cryptosuite !== "eddsa-jcs-2022") return false;
	if (!isAssertionMethodAuthorized(didDocument, proof2.verificationMethod)) return false;
	const method = findVerificationMethod(didDocument, proof2.verificationMethod);
	if (!method) return false;
	const publicKey = extractPublicKey(method);
	return publicKey.type === "ed25519" && verifyW3cProof(didDocument, publicKey, { expectedPurpose: "assertionMethod" }) && computeMultikeyFingerprint(publicKey) === expectedFingerprint;
}
function validateK1Binding(didDocument, expectedFingerprint) {
	const proof2 = didDocument.proof;
	if (!proof2) return false;
	if (!isAssertionMethodAuthorized(didDocument, proof2.verificationMethod)) return false;
	const method = findVerificationMethod(didDocument, proof2.verificationMethod);
	if (!method) return false;
	const publicKey = extractPublicKey(method);
	return publicKey.type === "secp256k1" && verifyW3cProof(didDocument, publicKey, { expectedPurpose: "assertionMethod" }) && computeJwkFingerprint(publicKey) === expectedFingerprint;
}
function buildAuthVerificationMethod(did, didProfile, authPublicKey, contexts) {
	if (didProfile === "e1") {
		contexts.push("https://w3id.org/security/data-integrity/v2");
		contexts.push("https://w3id.org/security/multikey/v1");
		return {
			id: `${did}#${VM_KEY_AUTH}`,
			type: "Multikey",
			controller: did,
			publicKeyMultibase: ed25519PublicKeyToMultibase(authPublicKey.bytes)
		};
	}
	contexts.push("https://w3id.org/security/suites/jws-2020/v1");
	contexts.push("https://w3id.org/security/suites/secp256k1-2019/v1");
	if (didProfile === "k1") contexts.push("https://w3id.org/security/data-integrity/v2");
	return {
		id: `${did}#${VM_KEY_AUTH}`,
		type: "EcdsaSecp256k1VerificationKey2019",
		controller: did,
		publicKeyJwk: publicKeyToJwk(authPublicKey)
	};
}
function buildServiceEntries(did, agentDescriptionUrl, services) {
	const output = [];
	if (agentDescriptionUrl) output.push({
		id: `${did}#ad`,
		type: "AgentDescription",
		serviceEndpoint: agentDescriptionUrl
	});
	for (const service of services ?? []) {
		const copy = cloneJson(service);
		if (typeof copy.id === "string" && copy.id.startsWith("#")) copy.id = `${did}${copy.id}`;
		output.push(copy);
	}
	return output;
}
function buildDidBase(hostname, port) {
	return port === void 0 ? `did:wba:${hostname}` : `did:wba:${hostname}%3A${port}`;
}
function joinDid(base, pathSegments) {
	return pathSegments.length === 0 ? base : `${base}:${pathSegments.join(":")}`;
}
function toPublicKeyMaterial(bindingMaterial) {
	if (typeof bindingMaterial === "string") return normalizePublicKeyMaterial(bindingMaterial);
	if ("bytes" in bindingMaterial) return bindingMaterial;
	return extractPublicKey(bindingMaterial);
}
function isVerificationMethodAuthorized(entries, verificationMethodId) {
	return entries.some((entry) => typeof entry === "string" ? entry === verificationMethodId : entry.id === verificationMethodId);
}
function buildContentDigest(body) {
	return `sha-256=:${encodeBase64(sha256(toBytes(body)))}:`;
}
function generateHttpSignatureHeaders(didDocument, requestUrl, requestMethod, privateKeyInput, headers = {}, body, options = {}) {
	const keyid = options.keyid ?? selectDefaultKeyid(didDocument);
	const coveredComponents = options.coveredComponents ?? [
		"@method",
		"@target-uri",
		"@authority"
	];
	const headersToSign = { ...headers };
	const bodyBytes = body ? toBytes(body) : /* @__PURE__ */ new Uint8Array(0);
	const covered = [...coveredComponents];
	if (bodyBytes.length > 0) {
		headersToSign["Content-Digest"] ??= buildContentDigest(bodyBytes);
		headersToSign["Content-Length"] ??= String(bodyBytes.length);
		if (!covered.some((component) => component.toLowerCase() === "content-digest")) covered.push("content-digest");
	}
	const created = options.created ?? Math.floor(Date.now() / 1e3);
	const expires = options.expires ?? created + 300;
	const nonce = options.nonce ?? encodeBase64Url(randomBytes(16));
	const signatureBase = buildSignatureBase(covered, requestMethod, requestUrl, headersToSign, created, expires, nonce, keyid);
	const signature = signMessage(normalizePrivateKeyMaterial(privateKeyInput), new TextEncoder().encode(signatureBase));
	const result = {
		"Signature-Input": `sig1=${serializeSignatureParams(covered, created, expires, nonce, keyid)}`,
		Signature: `sig1=:${Buffer.from(signature).toString("base64")}:`
	};
	if (headersToSign["Content-Digest"]) result["Content-Digest"] = headersToSign["Content-Digest"];
	return result;
}
function buildSignatureBase(components, method, url, headers, created, expires, nonce, keyid) {
	const lines = components.map((component) => `"${component}": ${componentValue(component, method, url, headers)}`);
	lines.push(`"@signature-params": ${serializeSignatureParams(components, created, expires, nonce, keyid)}`);
	return lines.join("\n");
}
function componentValue(component, method, url, headers) {
	switch (component) {
		case "@method": return method.toUpperCase();
		case "@target-uri": return url;
		case "@authority": {
			const parsed = new URL(url);
			return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
		}
		default: {
			const value = getHeaderCaseInsensitive(headers, component);
			if (!value) throw new AuthenticationError("Invalid signature input");
			return value;
		}
	}
}
function serializeSignatureParams(components, created, expires, nonce, keyid) {
	const quotedComponents = components.map((component) => `"${component}"`).join(" ");
	const parts = [`created=${created}`];
	if (expires !== void 0) parts.push(`expires=${expires}`);
	if (nonce) parts.push(`nonce="${nonce}"`);
	parts.push(`keyid="${keyid}"`);
	return `(${quotedComponents});${parts.join(";")}`;
}
function selectDefaultKeyid(didDocument) {
	const first = didDocument.authentication[0];
	if (typeof first === "string") return first;
	if (first?.id) return first.id;
	throw new AuthenticationError("Verification method not found");
}
function getHeaderCaseInsensitive(headers, name) {
	const target = name.toLowerCase();
	return Object.entries(headers).find(([key]) => key.toLowerCase() === target)?.[1];
}
function toBytes(value) {
	return typeof value === "string" ? new TextEncoder().encode(value) : value;
}
__export({}, {
	IM_PROOF_DEFAULT_COMPONENTS: () => IM_PROOF_DEFAULT_COMPONENTS,
	IM_PROOF_RELATION_ASSERTION_METHOD: () => IM_PROOF_RELATION_ASSERTION_METHOD,
	IM_PROOF_RELATION_AUTHENTICATION: () => IM_PROOF_RELATION_AUTHENTICATION,
	buildImContentDigest: () => buildImContentDigest,
	buildImSignatureInput: () => buildImSignatureInput,
	decodeImSignature: () => decodeImSignature,
	encodeImSignature: () => encodeImSignature,
	generateImProof: () => generateImProof,
	parseImSignatureInput: () => parseImSignatureInput,
	verifyImContentDigest: () => verifyImContentDigest,
	verifyImProof: () => verifyImProof
});
var IM_PROOF_DEFAULT_COMPONENTS = [
	"@method",
	"@target-uri",
	"content-digest"
];
var IM_PROOF_RELATION_AUTHENTICATION = "authentication";
var IM_PROOF_RELATION_ASSERTION_METHOD = "assertionMethod";
function buildImContentDigest(payload) {
	return buildContentDigest(payload);
}
function verifyImContentDigest(payload, contentDigest) {
	return buildImContentDigest(payload) === contentDigest.trim();
}
function buildImSignatureInput(keyid, options = {}) {
	const label = options.label ?? "sig1";
	const components = options.components ?? [...IM_PROOF_DEFAULT_COMPONENTS];
	if (components.length === 0) throw new ProofError("signatureInput must include covered components");
	const created = options.created ?? Math.floor(Date.now() / 1e3);
	const nonce = options.nonce ?? encodeBase64Url(randomBytes(16));
	const quotedComponents = components.map((component) => `"${component}"`).join(" ");
	const params = [`created=${created}`];
	if (options.expires !== void 0) params.push(`expires=${options.expires}`);
	params.push(`nonce="${nonce}"`);
	params.push(`keyid="${keyid}"`);
	return `${label}=(${quotedComponents});${params.join(";")}`;
}
function parseImSignatureInput(value) {
	const separator = value.indexOf("=");
	if (separator < 0) throw new ProofError("invalid proof.signatureInput format");
	const label = value.slice(0, separator).trim();
	const remainder = value.slice(separator + 1).trim();
	const openIndex = remainder.indexOf("(");
	const closeIndex = remainder.indexOf(")");
	if (openIndex < 0 || closeIndex < 0 || closeIndex <= openIndex) throw new ProofError("invalid proof.signatureInput format");
	const components = remainder.slice(openIndex + 1, closeIndex).split(/\s+/).map((component) => component.replaceAll("\"", "")).filter(Boolean);
	if (components.length === 0) throw new ProofError("proof.signatureInput must include covered components");
	const params = {};
	const paramsRaw = remainder.slice(closeIndex + 1).replace(/^;/, "");
	for (const part of paramsRaw.split(";")) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const [name, rawValue] = trimmed.split("=", 2);
		if (!name || rawValue === void 0) throw new ProofError("invalid proof.signatureInput format");
		params[name.trim()] = rawValue.trim().replace(/^"|"$/g, "");
	}
	if (!params.keyid) throw new ProofError("proof.signatureInput must include keyid");
	return {
		label,
		components,
		signatureParams: remainder,
		keyid: params.keyid,
		nonce: params.nonce,
		created: params.created ? Number(params.created) : void 0,
		expires: params.expires ? Number(params.expires) : void 0
	};
}
function encodeImSignature(signatureBytes, label = "sig1") {
	return `${label}=:${encodeBase64(signatureBytes)}:`;
}
function decodeImSignature(signature) {
	const trimmed = signature.trim();
	const labeled = trimmed.match(/^\s*([a-zA-Z0-9_-]+)=:(.+):\s*$/);
	const unlabeled = trimmed.match(/^\s*:(.+):\s*$/);
	const label = labeled?.[1];
	const encoded = labeled?.[2] ?? unlabeled?.[1];
	if (!encoded) throw new ProofError("invalid proof.signature encoding");
	try {
		return {
			label,
			signatureBytes: decodeBase64(encoded)
		};
	} catch {
		try {
			return {
				label,
				signatureBytes: decodeBase64Url(encoded)
			};
		} catch {
			throw new ProofError("invalid proof.signature encoding");
		}
	}
}
function generateImProof(payload, signatureBase, privateKeyInput, keyid, options = {}) {
	const payloadBytes = toBytes2(payload);
	const signatureInput = buildImSignatureInput(keyid, options);
	const signatureBytes = signMessage(normalizePrivateKeyMaterial(privateKeyInput), toBytes2(signatureBase));
	return {
		contentDigest: buildImContentDigest(payloadBytes),
		signatureInput,
		signature: encodeImSignature(signatureBytes, options.label ?? "sig1")
	};
}
function verifyImProof(proof2, payload, signatureBase, verificationTarget, expectedSignerDid) {
	if (!verifyImContentDigest(payload, proof2.contentDigest)) throw new ProofError("proof contentDigest does not match request payload");
	const parsed = parseImSignatureInput(proof2.signatureInput);
	if (expectedSignerDid && !keyidBelongsToExpectedDid(parsed.keyid, expectedSignerDid)) throw new ProofError("proof keyid must belong to expected signer DID");
	if (verificationTarget.didDocument) {
		const verificationRelationship = verificationTarget.verificationRelationship ?? "authentication";
		if (!isVerificationMethodAuthorized2(verificationTarget.didDocument, parsed.keyid, verificationRelationship)) throw new ProofError(`verification method is not authorized for ${verificationRelationship}`);
	}
	const verificationMethod = verificationTarget.verificationMethod ?? resolveVerificationMethod(verificationTarget.didDocument, parsed.keyid);
	const publicKey = extractPublicKey(verificationMethod);
	const { signatureBytes } = decodeImSignature(proof2.signature);
	if (!verifyMessage(publicKey, toBytes2(signatureBase), signatureBytes)) throw new ProofError("signature verification failed");
	return {
		parsedSignatureInput: parsed,
		verificationMethod
	};
}
function resolveVerificationMethod(didDocument, verificationMethodId) {
	if (!didDocument) throw new ProofError("didDocument or verificationMethod is required");
	const method = findVerificationMethod(didDocument, verificationMethodId);
	if (!method) throw new ProofError("verification method not found in DID document");
	return method;
}
function toBytes2(value) {
	return typeof value === "string" ? new TextEncoder().encode(value) : value;
}
function keyidBelongsToExpectedDid(keyid, expectedSignerDid) {
	return keyid.split("#", 1)[0] === expectedSignerDid;
}
function isVerificationMethodAuthorized2(didDocument, verificationMethodId, verificationRelationship) {
	if (verificationRelationship === "authentication") return isAuthenticationAuthorized(didDocument, verificationMethodId);
	if (verificationRelationship === "assertionMethod") return isAssertionMethodAuthorized(didDocument, verificationMethodId);
	throw new ProofError(`unsupported verification relationship: ${verificationRelationship}`);
}
function validateLocalPart(localPart) {
	const normalized = localPart.toLowerCase();
	if (!normalized || normalized.length > 63) return false;
	if (normalized.startsWith("-") || normalized.endsWith("-") || normalized.includes("--")) return false;
	return /^[a-z0-9-]+$/.test(normalized);
}
var AwikiImError = class extends Error {
	/**
	* Create a normalized AWiki IM error.
	*
	* @param code Stable category for callers.
	* @param message Public diagnostic message.
	* @param options Optional transport status and underlying cause.
	*/
	constructor(code, message, status, options) {
		super(message, options?.cause === void 0 ? void 0 : { cause: options.cause });
		this.code = code;
		this.status = status;
		this.name = "AwikiImError";
	}
	code;
	status;
};
function normalizeAwikiImError(error) {
	if (error instanceof AwikiImError) return error;
	if (error instanceof TypeError) return new AwikiImError("network", "AWiki service is unavailable", void 0, { cause: error });
	return new AwikiImError("remote", "AWiki operation failed", void 0, { cause: error });
}
function awikiImRemoteError(input) {
	const code = classifyRemoteError(input);
	return new AwikiImError(code, publicMessage(code), input.status);
}
function classifyRemoteError(input) {
	const serviceCode = input.serviceCode?.toLowerCase() ?? "";
	const combined = `${serviceCode} ${input.message?.toLowerCase() ?? ""}`;
	if (input.rpcCode === 1003) return "invalid-request";
	if (input.rpcCode === 1403 || serviceCode === "anp.forbidden") return "forbidden";
	if (input.rpcCode === 1404 || serviceCode === "anp.target_not_found" || serviceCode === "target_not_found") return "not-found";
	if (input.rpcCode === 1409 || serviceCode === "anp.idempotency_conflict" || serviceCode === "idempotency_conflict") return "conflict";
	if (combined.includes("otp_rate_limited") || input.status === 429 || input.rpcCode === -32005) return "rate-limited";
	if (combined.includes("invalid_otp") || combined.includes("otp_invalid")) return "invalid-otp";
	if (combined.includes("otp_expired") || combined.includes("challenge_expired")) return "challenge-expired";
	if (combined.includes("handle_unavailable") || combined.includes("handle_exists") || combined.includes("handle already")) return "handle-unavailable";
	if (combined.includes("already_registered") || combined.includes("did already")) return "already-registered";
	if (input.status === 404 || input.rpcCode === -32002) return "not-found";
	if (input.status === 401 || input.status === 403 || input.rpcCode === -32001) return "forbidden";
	if (input.status === 409 || input.rpcCode === -32003) return "conflict";
	if (input.rpcCode === -32600 || input.rpcCode === -32602 || input.rpcCode === -32004) return combined.includes("otp") ? "invalid-otp" : "invalid-request";
	if (input.status !== void 0 && input.status >= 400 && input.status < 500) return "invalid-request";
	return "remote";
}
function publicMessage(code) {
	switch (code) {
		case "not-registered": return "AWiki identity is not registered";
		case "already-registered": return "AWiki identity is already registered";
		case "invalid-request": return "AWiki rejected the request";
		case "invalid-otp": return "AWiki verification code is invalid";
		case "challenge-expired": return "AWiki registration challenge has expired";
		case "handle-unavailable": return "AWiki handle is unavailable";
		case "not-found": return "AWiki resource was not found";
		case "forbidden": return "AWiki operation is not permitted";
		case "conflict": return "AWiki operation conflicts with existing state";
		case "rate-limited": return "AWiki request was rate limited";
		case "network": return "AWiki service is unavailable";
		case "remote": return "AWiki service returned an error";
	}
}
var STATE_VERSION = 2;
var DEFAULT_PAGE_LIMIT = 50;
var MAX_PAGE_LIMIT = 100;
function emptyState() {
	return {
		version: STATE_VERSION,
		conversations: {},
		attachments: {},
		sendOperations: {}
	};
}
function conversationKey(id) {
	return id;
}
var HANDLE_RPC_PATH = "/user-service/v1/handle/rpc";
var DID_AUTH_RPC_PATH = "/user-service/v1/did-auth/rpc";
var DID_PROFILE_RPC_PATH = "/user-service/v1/did/profile/rpc";
var MESSAGE_RPC_PATH = "/im/rpc";
var MAX_RPC_RESPONSE_BYTES = 1048576;
var MAX_DID_DOCUMENT_BYTES = 524288;
var REQUEST_TIMEOUT_MS = 3e4;
var AwikiImTransport = class {
	constructor(fetchImpl, options) {
		this.fetchImpl = fetchImpl;
		this.options = options;
		this.allowedAttachmentOrigins = new Set(options.allowedAttachmentOrigins.map((value) => normalizeAllowedOrigin(value, options.allowInsecureLoopback)));
	}
	fetchImpl;
	options;
	controllers = /* @__PURE__ */ new Set();
	allowedAttachmentOrigins;
	disposed = false;
	/** Execute an unsigned or bearer-authenticated JSON-RPC request. */
	async rpc(baseUrl, path, method, params, accessToken) {
		const url = joinServiceUrl(baseUrl, path, this.options.allowInsecureLoopback);
		const request = encodeJsonRpc(method, params);
		const body = request.body;
		const headers = { "Content-Type": "application/json" };
		if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
		return this.executeRpc(url, body, headers, request.id);
	}
	/** Execute a DID HTTP-Signature-authenticated JSON-RPC request. */
	async signedRpc(baseUrl, path, method, params, authentication2) {
		const url = joinServiceUrl(baseUrl, path, this.options.allowInsecureLoopback);
		const request = encodeJsonRpc(method, params);
		const body = request.body;
		const baseHeaders = { "Content-Type": "application/json" };
		let headers = {
			...baseHeaders,
			...generateHttpSignatureHeaders(authentication2.didDocument, url, "POST", authentication2.signingPrivateKeyPem, baseHeaders, body, { keyid: authentication2.signingKeyId })
		};
		const result = await this.withResponse(url, {
			method: "POST",
			headers,
			body,
			redirect: "error"
		}, async (response) => {
			if (response.status !== 401) return {
				kind: "result",
				value: await decodeRpcResponse(response, request.id)
			};
			const nonce = parseAuthenticationParameter(response.headers.get("www-authenticate") ?? "", "nonce");
			await response.body?.cancel();
			return {
				kind: "challenge",
				nonce
			};
		});
		if (result.kind === "challenge" && result.nonce) {
			headers = {
				...baseHeaders,
				...generateHttpSignatureHeaders(authentication2.didDocument, url, "POST", authentication2.signingPrivateKeyPem, baseHeaders, body, {
					keyid: authentication2.signingKeyId,
					nonce: result.nonce
				})
			};
			return this.withResponse(url, {
				method: "POST",
				headers,
				body,
				redirect: "error"
			}, (response) => decodeRpcResponse(response, request.id));
		}
		if (result.kind === "challenge") throw awikiImRemoteError({ status: 401 });
		return result.value;
	}
	/** Upload one object without following redirects. */
	async putBytes(url, headers, bytes) {
		this.validateAttachmentUrl(url);
		await this.withResponse(url, {
			method: "PUT",
			headers: { ...headers },
			body: Buffer.from(bytes),
			redirect: "error"
		}, async (response) => {
			if (!response.ok) {
				await response.body?.cancel();
				throw awikiImRemoteError({ status: response.status });
			}
			await response.body?.cancel();
		});
	}
	/** Read one public JSON document without following redirects. */
	async getJson(url) {
		this.validateAttachmentUrl(url);
		return this.withResponse(url, {
			method: "GET",
			headers: { Accept: "application/json" },
			redirect: "error"
		}, async (response) => {
			if (!response.ok) {
				await response.body?.cancel();
				throw awikiImRemoteError({ status: response.status });
			}
			const value = parseJson(await readCappedBody(response, MAX_DID_DOCUMENT_BYTES));
			if (!isRecord2(value)) throw new AwikiImError("remote", "AWiki service returned an invalid response");
			return value;
		});
	}
	/** Download one object without following redirects. */
	async getBytes(url, bearerToken, expectedSize) {
		if (!Number.isSafeInteger(expectedSize) || expectedSize < 0 || expectedSize > this.options.attachmentMaxBytes) throw new AwikiImError("invalid-request", "AWiki attachment size is invalid");
		this.validateAttachmentUrl(url);
		return this.withResponse(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${bearerToken}` },
			redirect: "error"
		}, async (response) => {
			if (!response.ok) {
				await response.body?.cancel();
				throw awikiImRemoteError({ status: response.status });
			}
			const declaredLength = contentLength(response.headers);
			if (declaredLength !== void 0 && declaredLength !== expectedSize) {
				await response.body?.cancel();
				throw new AwikiImError("remote", "AWiki attachment verification failed");
			}
			return readCappedBody(response, expectedSize);
		});
	}
	/** Validate an untrusted DID, service, upload, or object URL against the operator allowlist. */
	validateAttachmentUrl(value) {
		const url = validateServiceBaseUrl(value, this.options.allowInsecureLoopback);
		if (!this.allowedAttachmentOrigins.has(url.origin)) throw new AwikiImError("forbidden", "AWiki attachment origin is not permitted");
		return url;
	}
	/** Abort every owned request and reject future work. */
	dispose() {
		this.disposed = true;
		for (const controller of this.controllers) controller.abort();
		this.controllers.clear();
	}
	async executeRpc(url, body, headers, requestId) {
		return this.withResponse(url, {
			method: "POST",
			headers,
			body,
			redirect: "error"
		}, (response) => decodeRpcResponse(response, requestId));
	}
	async withResponse(input, init, consume) {
		if (this.disposed) throw new AwikiImError("remote", "AWiki IM client has been disposed");
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		this.controllers.add(controller);
		try {
			return await consume(await this.fetchImpl(input, {
				...init,
				signal: controller.signal
			}));
		} catch (error) {
			if (this.disposed) throw new AwikiImError("remote", "AWiki IM client has been disposed");
			throw normalizeAwikiImError(error);
		} finally {
			clearTimeout(timeout);
			this.controllers.delete(controller);
		}
	}
};
function buildOriginAuthentication(input) {
	const target = input.meta.target;
	if (!isRecord2(target)) throw new AwikiImError("invalid-request", "AWiki message target is invalid");
	const kind = requiredString(target.kind, "target kind");
	const did = requiredString(target.did, "target DID");
	if (kind !== "agent" && kind !== "group" && kind !== "service") throw new AwikiImError("invalid-request", "AWiki message target is invalid");
	const canonicalRequest = canonicalizeJson({
		method: input.method,
		meta: input.meta,
		body: input.body
	});
	const signatureInput = buildImSignatureInput(input.signingKeyId, {
		label: "sig1",
		components: [
			"@method",
			"@target-uri",
			"content-digest"
		]
	});
	const contentDigest = buildImContentDigest(canonicalRequest);
	const targetUri = `anp://${kind}/${encodeRfc3986(did)}`;
	const signatureParams = signatureInput.slice(signatureInput.indexOf("=") + 1);
	const signatureBase = [
		`"@method": ${input.method}`,
		`"@target-uri": ${targetUri}`,
		`"content-digest": ${contentDigest}`,
		`"@signature-params": ${signatureParams}`
	].join("\n");
	return {
		scheme: "anp-rfc9421-origin-proof-v1",
		origin_proof: {
			contentDigest,
			signatureInput,
			signature: encodeImSignature(signMessage(normalizePrivateKeyMaterial(input.signingPrivateKeyPem), new TextEncoder().encode(signatureBase)), "sig1")
		}
	};
}
function joinServiceUrl(baseUrl, path, allowInsecureLoopback = false) {
	const base = validateServiceBaseUrl(baseUrl, allowInsecureLoopback);
	return new URL(`/${path.replace(/^\/+/, "")}`, base).toString();
}
function validateServiceBaseUrl(value, allowInsecureLoopback = false) {
	let url;
	try {
		url = new URL(value);
	} catch (error) {
		throw new AwikiImError("invalid-request", "AWiki service URL is invalid", void 0, { cause: error });
	}
	if (url.username || url.password || url.protocol !== "https:" && !(allowInsecureLoopback && url.protocol === "http:" && isLoopback(url.hostname))) throw new AwikiImError("invalid-request", "AWiki service URL is invalid");
	return url;
}
function operationId(prefix) {
	return `${prefix}-${randomUUID()}`;
}
function randomChallenge() {
	return randomBytes(16).toString("hex");
}
function encodeJsonRpc(method, params) {
	const id = randomUUID();
	return {
		id,
		body: JSON.stringify({
			jsonrpc: "2.0",
			id,
			method,
			params
		})
	};
}
async function decodeRpcResponse(response, expectedId) {
	let decoded;
	try {
		decoded = parseJson(await readCappedBody(response, MAX_RPC_RESPONSE_BYTES));
	} catch (error) {
		if (!response.ok) throw awikiImRemoteError({ status: response.status });
		throw new AwikiImError("remote", "AWiki service returned an invalid response", response.status, { cause: error });
	}
	if (!isRecord2(decoded)) throw new AwikiImError("remote", "AWiki service returned an invalid response", response.status);
	const hasResult = Object.hasOwn(decoded, "result") && decoded.result !== null;
	const hasError = Object.hasOwn(decoded, "error") && decoded.error !== null;
	if (decoded.jsonrpc !== "2.0" || decoded.id !== expectedId || hasResult === hasError) throw new AwikiImError("remote", "AWiki JSON-RPC response envelope is invalid", response.status);
	if (hasError && !isRecord2(decoded.error)) throw new AwikiImError("remote", "AWiki JSON-RPC response envelope is invalid", response.status);
	const rpcError = hasError ? decoded.error : void 0;
	if (!response.ok || rpcError !== void 0) throw awikiImRemoteError({
		status: response.status,
		rpcCode: numberValue(rpcError?.code),
		serviceCode: serviceErrorCode(rpcError?.data),
		message: stringValue(rpcError?.message)
	});
	if (!isRecord2(decoded.result)) throw new AwikiImError("remote", "AWiki service returned an invalid response", response.status);
	return {
		value: decoded.result,
		accessToken: responseAccessToken(response.headers) ?? stringValue(decoded.result.access_token)
	};
}
function responseAccessToken(headers) {
	return parseAuthenticationParameter(headers.get("authentication-info") ?? "", "access_token");
}
function parseAuthenticationParameter(value, key) {
	const match = value.match(new RegExp(`(?:^|[,\\s])${key}=(?:"([^"]+)"|([^,\\s]+))`, "i"));
	return (match?.[1] ?? match?.[2])?.trim() || void 0;
}
function serviceErrorCode(data) {
	if (!isRecord2(data)) return;
	for (const key of [
		"awiki_code",
		"anp_code",
		"code"
	]) {
		const value = stringValue(data[key]);
		if (value) return value;
	}
}
function numberValue(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function stringValue(value) {
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function requiredString(value, label) {
	const result = stringValue(value);
	if (!result) throw new AwikiImError("invalid-request", `AWiki ${label} is required`);
	return result;
}
function normalizeAllowedOrigin(value, allowInsecureLoopback) {
	const url = validateServiceBaseUrl(value, allowInsecureLoopback);
	if (url.pathname !== "/" || url.search || url.hash) throw new AwikiImError("invalid-request", "AWiki attachment origin is invalid");
	return url.origin;
}
function isLoopback(hostname) {
	return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
async function readCappedBody(response, maximumBytes) {
	const declaredLength = contentLength(response.headers);
	if (declaredLength !== void 0 && declaredLength > maximumBytes) {
		await response.body?.cancel();
		throw new AwikiImError("remote", "AWiki response exceeds the permitted size");
	}
	if (!response.body) return /* @__PURE__ */ new Uint8Array();
	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		let part = await reader.read();
		while (!part.done) {
			total += part.value.byteLength;
			if (total > maximumBytes) {
				await reader.cancel();
				throw new AwikiImError("remote", "AWiki response exceeds the permitted size");
			}
			chunks.push(part.value);
			part = await reader.read();
		}
	} finally {
		reader.releaseLock();
	}
	const output = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return output;
}
function contentLength(headers) {
	const raw = headers.get("content-length");
	if (raw === null) return;
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < 0) throw new AwikiImError("remote", "AWiki response has an invalid Content-Length");
	return value;
}
function parseJson(bytes) {
	try {
		return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
	} catch (error) {
		throw new AwikiImError("remote", "AWiki service returned an invalid response", void 0, { cause: error });
	}
}
function encodeRfc3986(value) {
	return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}
function isRecord2(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
function parseHandle(value) {
	const trimmed = value.trim().replace(/^@+/u, "").replace(/^wba:\/\//u, "");
	const separator = trimmed.indexOf(".");
	if (separator <= 0 || separator === trimmed.length - 1) return;
	const local = trimmed.slice(0, separator);
	const domain = trimmed.slice(separator + 1);
	if (!local || !domain) return;
	return {
		local,
		domain,
		handle: `${local}.${domain}`
	};
}
function handleCandidateFromDid(did) {
	if (!did.startsWith("did:wba:")) return;
	const parts = did.split(":");
	if (parts.length < 4) return;
	const domain = parts[2];
	const path = parts.slice(3);
	const local = path[0] === "user" ? path[1] : path[0];
	if (!domain || !local || /^(?:e1_|k1_)/u.test(local)) return;
	return `${local}.${domain}`;
}
async function lookupDisplayName(transport, handle, expectedDid) {
	const parsed = parseHandle(handle);
	if (!parsed) return;
	try {
		const document = await transport.getJson(`https://${parsed.domain}/.well-known/handle/${encodeURIComponent(parsed.local)}`);
		if (stringValue2(document.handle)?.toLowerCase() !== parsed.handle.toLowerCase()) return;
		if (expectedDid && stringValue2(document.did) !== expectedDid) return;
		const profile = isRecord3(document.profile) ? document.profile : void 0;
		const displayName = stringValue2(document.display_name) ?? stringValue2(profile?.display_name);
		if (!displayName) return;
		if (profile) {
			const subjectDid = stringValue2(profile.subject_did);
			const profileHandle = stringValue2(profile.handle);
			if (subjectDid && expectedDid && subjectDid !== expectedDid) return;
			if (profileHandle && profileHandle.toLowerCase() !== parsed.handle.toLowerCase()) return;
		}
		return displayName;
	} catch {
		return;
	}
}
function stringValue2(value) {
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isRecord3(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
var MAX_REFRESH_PAGES = 1e3;
var AwikiMessagingRuntime = class {
	constructor(options) {
		this.options = options;
	}
	options;
	sendTail = Promise.resolve();
	inboxRefreshed = false;
	unreadMessageIds = /* @__PURE__ */ new Map();
	groupUnreadMessageIds = /* @__PURE__ */ new Map();
	groupMessageWindows = /* @__PURE__ */ new Map();
	/** Refresh conversation records and return one local page. */
	async listConversations(request = {}) {
		this.options.identity.requireSecrets();
		const limit = pageLimit(request.limit);
		await this.refreshConversations();
		await this.hydrateGroupMessagePreviews();
		await this.hydrateDirectDisplayNames();
		const conversations = Object.values(this.options.store.snapshot().conversations).map((record) => {
			const key = conversationKey(record.conversation.id);
			const unreadCount = (/* @__PURE__ */ new Set([...this.unreadMessageIds.get(key) ?? [], ...this.groupUnreadMessageIds.get(key) ?? []])).size;
			return {
				...record.conversation,
				unreadCount
			};
		}).sort(compareConversationRecency);
		const offset = decodeOffsetCursor(request.cursor);
		const items = conversations.slice(offset, offset + limit);
		const nextOffset = offset + items.length;
		return {
			items,
			hasMore: nextOffset < conversations.length,
			...nextOffset < conversations.length ? { nextCursor: encodeOffsetCursor(nextOffset) } : {}
		};
	}
	/** Read and normalize one direct/group history page using the service's offset support. */
	async getHistory(request) {
		const record = this.options.store.snapshot().conversations[conversationKey(request.conversationId)];
		if (!record) throw new AwikiImError("not-found", "AWiki conversation was not found");
		const identity = this.options.identity.requireSecrets();
		const limit = pageLimit(request.limit);
		const kind = record.conversation.kind;
		const skip = decodeHistoryCursor(request.cursor, kind, request.conversationId);
		const result = kind === "direct" ? await this.authenticatedRpc("direct.get_history", {
			meta: localMeta(identity.public.did, "anp.direct.local.v1"),
			body: compactRecord({
				user_did: identity.public.did,
				peer_did: requiredConversationValue(record.peerDid),
				limit,
				skip: skip || void 0
			})
		}) : await this.authenticatedRpc("group.list_messages", {
			meta: groupLocalMeta(identity.public.did, requiredConversationValue(record.groupDid)),
			body: compactRecord({
				group_did: requiredConversationValue(record.groupDid),
				limit,
				skip: skip || void 0
			})
		});
		const wires = arrayValue(result.messages);
		validateHistoryWires(wires, record, identity.public.did);
		const mapped = wires.map((wire) => isRecord4(wire) ? this.mapWireMessage(wire, record.conversation, identity.public.did) : null).filter((message) => message !== null);
		const hydrated = await this.hydrateGroupSenderDisplayNames(mapped);
		await this.persistMappedMessages(hydrated);
		const items = hydrated.map((entry) => entry.message).sort(compareMessageTime);
		const consumed = wires.length;
		if (result.has_more === true && consumed === 0) throw new AwikiImError("remote", "AWiki history pagination did not advance");
		const hasMore = result.has_more === true;
		return {
			items,
			hasMore,
			...hasMore ? { nextCursor: encodeHistoryCursor(kind, request.conversationId, skip + consumed) } : {}
		};
	}
	/** Mark every currently unread inbox message in one conversation as read. */
	async markConversationRead(conversationId) {
		const key = conversationKey(conversationId);
		if (!this.options.store.snapshot().conversations[key]) throw new AwikiImError("not-found", "AWiki conversation was not found");
		if (!this.inboxRefreshed) await this.refreshInbox();
		const messageIds = this.unreadMessageIds.get(key) ?? [];
		const localGroupMessageIds = this.groupUnreadMessageIds.get(key) ?? [];
		if (messageIds.length === 0 && localGroupMessageIds.length === 0) return 0;
		let updatedCount = 0;
		if (messageIds.length > 0) {
			const identity = this.options.identity.requireSecrets();
			updatedCount = integerValue((await this.authenticatedRpc("inbox.mark_read", {
				meta: localMeta(identity.public.did, "anp.inbox.local.v1"),
				body: {
					user_did: identity.public.did,
					message_ids: [...messageIds]
				}
			})).updated_count) ?? -1;
			if (updatedCount < 0 || updatedCount > messageIds.length) throw new AwikiImError("remote", "AWiki mark-read acknowledgement is invalid");
		}
		this.unreadMessageIds.delete(key);
		this.groupUnreadMessageIds.delete(key);
		const locallyCleared = localGroupMessageIds.filter((id) => !messageIds.includes(id)).length;
		return updatedCount + locallyCleared;
	}
	/** Resolve and send one idempotent text message. */
	async sendText(request) {
		return this.exclusiveSend(async () => {
			const text = request.text.trim();
			if (!text) throw new AwikiImError("invalid-request", "AWiki message text is required");
			const key = sendOperationKey(request.idempotencyKey);
			const fingerprint = sendFingerprint({
				kind: "text",
				target: request.target,
				text
			});
			const existing = this.options.store.snapshot().sendOperations[key];
			if (existing) {
				assertOperationFingerprint(existing.kind, existing.fingerprint, "text", fingerprint);
				if (existing.kind !== "text") throw new AwikiImError("conflict", "AWiki idempotency key is already in use");
				if (existing.stage === "completed" && existing.result) return structuredClone(existing.result);
				return this.resumeTextSend(key, existing);
			}
			const target = await this.resolveTarget(request.target);
			const stable = stableIdentifiers(request.idempotencyKey);
			const operation = {
				kind: "text",
				fingerprint,
				target,
				createdAt: (/* @__PURE__ */ new Date()).toISOString(),
				operationId: stable.operationId,
				messageId: stable.messageId,
				text,
				stage: "prepared"
			};
			await this.options.store.mutate((state) => {
				if (state.sendOperations[key]) throw new AwikiImError("conflict", "AWiki idempotency key is already in use");
				state.sendOperations[key] = operation;
			});
			return this.resumeTextSend(key, operation);
		});
	}
	/** Serialize persistent send state machines across text and attachment operations. */
	async exclusiveSend(operation) {
		let release = () => void 0;
		const previous = this.sendTail;
		this.sendTail = new Promise((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await operation();
		} finally {
			release();
		}
	}
	/** Resolve a direct Handle/DID or an existing group conversation. */
	async resolveTarget(target) {
		if (target.kind === "direct") {
			const peer = target.peer.trim();
			if (!peer) throw new AwikiImError("invalid-request", "AWiki direct target is required");
			const resolved = peer.startsWith("did:") ? { did: peer } : await this.resolveHandle(peer.replace(/^wba:\/\//, ""));
			const handle = resolved.handle ?? handleCandidateFromDid(resolved.did);
			const displayName = resolved.displayName ?? (handle ? await lookupDisplayName(this.options.transport, handle, resolved.did) : void 0);
			const conversationId = directConversationId(resolved.did);
			await this.upsertConversation({
				conversation: directConversation({
					id: conversationId,
					peerDid: resolved.did,
					peerHandle: handle,
					displayName
				}),
				peerDid: resolved.did
			}, true);
			return {
				kind: "direct",
				did: resolved.did,
				...handle ? { handle } : {},
				...displayName ? { displayName } : {},
				conversationId
			};
		}
		const group = target.group.trim();
		if (!group) throw new AwikiImError("invalid-request", "AWiki group target is required");
		let record = this.groupConversation(group);
		if (!record) {
			await this.refreshGroups();
			record = this.groupConversation(group);
		}
		if (!record?.groupDid) throw new AwikiImError("not-found", "AWiki group conversation was not found");
		return {
			kind: "group",
			did: record.groupDid,
			conversationId: record.conversation.id
		};
	}
	/** Submit one already-encoded Direct/Group message and persist its projection. */
	async sendPayload(target, contentType, body, wire, content, attachmentReference) {
		const identity = this.options.identity.requireSecrets();
		const method = target.kind === "direct" ? "direct.send" : "group.send";
		const meta = {
			profile: target.kind === "direct" ? "anp.direct.base.v1" : "anp.group.base.v1",
			security_profile: "transport-protected",
			sender_did: identity.public.did,
			target: {
				kind: target.kind === "direct" ? "agent" : "group",
				did: target.did
			},
			operation_id: wire.operationId,
			message_id: wire.messageId,
			created_at: wire.createdAt,
			content_type: contentType
		};
		const auth = buildOriginAuthentication({
			method,
			meta,
			body,
			signingPrivateKeyPem: identity.signingPrivateKeyPem,
			signingKeyId: identity.signingKeyId
		});
		const result = await this.authenticatedRpc(method, {
			meta,
			auth,
			body
		});
		validateSendResult(result, wire, target);
		const messageId = wire.messageId;
		const sentAt = timestampValue(result.accepted_at) ?? Date.now();
		const message = {
			id: messageId,
			conversationId: target.conversationId,
			conversationKind: target.kind,
			senderDid: identity.public.did,
			senderHandle: identity.public.handle,
			sentAt,
			outgoing: true,
			content
		};
		const conversation = this.options.store.snapshot().conversations[conversationKey(target.conversationId)];
		await this.options.store.mutate((state) => {
			if (conversation) state.conversations[conversationKey(target.conversationId)] = {
				...conversation,
				conversation: {
					...conversation.conversation,
					lastMessageAt: sentAt,
					lastMessagePreview: messagePreview(content)
				}
			};
			if (attachmentReference) {
				const persistedReference = {
					...attachmentReference,
					messageId
				};
				state.attachments[attachmentReferenceKey(persistedReference)] = persistedReference;
			}
		});
		return message;
	}
	async resumeTextSend(key, operation) {
		const message = await this.sendPayload(operation.target, "text/plain", { text: operation.text }, {
			operationId: operation.operationId,
			messageId: operation.messageId,
			createdAt: operation.createdAt
		}, {
			kind: "text",
			text: operation.text
		});
		await this.options.store.mutate((state) => {
			const current = state.sendOperations[key];
			if (!current || current.kind !== "text" || current.fingerprint !== operation.fingerprint) throw new AwikiImError("conflict", "AWiki send operation state changed");
			state.sendOperations[key] = {
				...current,
				stage: "completed",
				result: message
			};
		});
		return message;
	}
	/** Execute a Message Service RPC, refreshing the bearer once on 401/403. */
	async authenticatedRpc(method, params) {
		let identity = this.options.identity.requireSecrets();
		try {
			const result = await this.options.transport.rpc(this.options.messageServiceUrl, MESSAGE_RPC_PATH, method, params, identity.accessToken);
			await this.persistReturnedToken(result.accessToken);
			return result.value;
		} catch (error) {
			const normalized = normalizeAwikiImError(error);
			if (normalized.code !== "forbidden") throw normalized;
			const accessToken = await this.options.identity.refreshAccessToken();
			identity = this.options.identity.requireSecrets();
			const result = await this.options.transport.rpc(this.options.messageServiceUrl, MESSAGE_RPC_PATH, method, params, accessToken || identity.accessToken);
			await this.persistReturnedToken(result.accessToken);
			return result.value;
		}
	}
	async refreshConversations() {
		await this.refreshGroups();
		await this.refreshInbox();
	}
	async refreshInbox() {
		const identity = this.options.identity.requireSecrets();
		const unread = /* @__PURE__ */ new Map();
		const seen = /* @__PURE__ */ new Set();
		let skip = 0;
		for (let page = 0; page < MAX_REFRESH_PAGES; page += 1) {
			const result = await this.authenticatedRpc("inbox.get", {
				meta: localMeta(identity.public.did, "anp.inbox.local.v1"),
				body: compactRecord({
					user_did: identity.public.did,
					limit: MAX_PAGE_LIMIT,
					skip: skip || void 0
				})
			});
			const wires = arrayValue(result.messages);
			const mapped = wires.map((wire) => isRecord4(wire) ? this.mapWireMessage(wire, void 0, identity.public.did) : null).filter((message) => message !== null);
			for (const entry of mapped) {
				const message = entry.message;
				if (message.outgoing || seen.has(message.id)) continue;
				seen.add(message.id);
				const key = conversationKey(message.conversationId);
				unread.set(key, [...unread.get(key) ?? [], message.id]);
			}
			await this.persistMappedMessages(mapped);
			if (result.has_more !== true) {
				this.unreadMessageIds = unread;
				this.inboxRefreshed = true;
				return;
			}
			if (wires.length === 0) throw new AwikiImError("remote", "AWiki inbox pagination did not advance");
			skip += wires.length;
		}
		throw new AwikiImError("remote", "AWiki inbox pagination exceeded the safety limit");
	}
	async refreshGroups() {
		const identity = this.options.identity.requireSecrets();
		let cursor;
		for (let page = 0; page < MAX_REFRESH_PAGES; page += 1) {
			const result = await this.authenticatedRpc("group.list", {
				meta: groupLocalMeta(identity.public.did),
				body: compactRecord({
					limit: MAX_PAGE_LIMIT,
					cursor
				})
			});
			const groups = arrayValue(result.groups).map(groupConversationFromWire).filter((group) => group !== null);
			if (groups.length > 0) await this.options.store.mutate((state) => {
				for (const group of groups) state.conversations[conversationKey(group.conversation.id)] = mergeConversation(state.conversations[conversationKey(group.conversation.id)], group);
			});
			const nextCursor = cursorValue(result.next_cursor);
			if (result.has_more === true && !nextCursor) throw new AwikiImError("remote", "AWiki group pagination omitted its cursor");
			if (!nextCursor) return;
			if (nextCursor === cursor) throw new AwikiImError("remote", "AWiki group pagination did not advance");
			cursor = nextCursor;
		}
		throw new AwikiImError("remote", "AWiki group pagination exceeded the safety limit");
	}
	async resolveHandle(peer) {
		const result = await this.options.transport.rpc(this.options.userServiceUrl, HANDLE_RPC_PATH, "lookup", { handle: peer });
		const did = requiredWireString(result.value.did, "resolved DID");
		const handle = stringValue3(result.value.full_handle) ?? stringValue3(result.value.handle);
		const profile = isRecord4(result.value.profile) ? result.value.profile : void 0;
		const displayName = stringValue3(result.value.display_name) ?? stringValue3(profile?.display_name) ?? (handle ? await lookupDisplayName(this.options.transport, handle, did) : void 0);
		return {
			did,
			...handle ? { handle } : {},
			...displayName ? { displayName } : {}
		};
	}
	/** Fill missing direct `displayName` values from WNS without blocking on failure. */
	async hydrateDirectDisplayNames() {
		const pending = Object.values(this.options.store.snapshot().conversations).filter((record) => record.conversation.kind === "direct" && record.conversation.displayName === void 0);
		if (pending.length === 0) return;
		const updates = (await Promise.all(pending.map(async (record) => {
			if (record.conversation.kind !== "direct") return null;
			const handle = record.conversation.peerHandle ?? handleCandidateFromDid(record.conversation.peerDid);
			if (!handle) return null;
			const displayName = await lookupDisplayName(this.options.transport, handle, record.conversation.peerDid);
			if (!displayName) return null;
			return {
				conversation: directConversation({
					id: record.conversation.id,
					peerDid: record.conversation.peerDid,
					peerHandle: handle,
					displayName,
					lastMessageAt: record.conversation.lastMessageAt,
					lastMessagePreview: record.conversation.lastMessagePreview
				}),
				peerDid: record.peerDid ?? record.conversation.peerDid
			};
		}))).filter((value) => value !== null);
		if (updates.length === 0) return;
		await this.options.store.mutate((state) => {
			for (const update of updates) {
				const key = conversationKey(update.conversation.id);
				state.conversations[key] = mergeConversation(state.conversations[key], update);
			}
		});
	}
	/** Refresh Group previews and supplement unread state when Legacy inbox omits Group messages. */
	async hydrateGroupMessagePreviews() {
		const identity = this.options.identity.requireSecrets();
		const pending = Object.values(this.options.store.snapshot().conversations).filter((record) => record.conversation.kind === "group");
		await Promise.all(pending.map(async (record) => {
			const key = conversationKey(record.conversation.id);
			const previousWindow = this.groupMessageWindows.get(key);
			const previousLastMessageAt = record.conversation.lastMessageAt;
			const wires = arrayValue((await this.authenticatedRpc("group.list_messages", {
				meta: groupLocalMeta(identity.public.did, requiredConversationValue(record.groupDid)),
				body: {
					group_did: requiredConversationValue(record.groupDid),
					limit: MAX_PAGE_LIMIT
				}
			})).messages);
			validateHistoryWires(wires, record, identity.public.did);
			const mapped = wires.map((wire) => isRecord4(wire) ? this.mapWireMessage(wire, record.conversation, identity.public.did) : null).filter((message) => message !== null);
			const currentWindow = new Set(mapped.map((entry) => entry.message.id));
			const locallyUnread = new Set(this.groupUnreadMessageIds.get(key) ?? []);
			for (const entry of mapped) {
				const message = entry.message;
				const observedAfterPersistedSummary = previousLastMessageAt !== void 0 && message.sentAt > previousLastMessageAt;
				const observedAfterEqualTimestamp = previousWindow !== void 0 && previousLastMessageAt !== void 0 && message.sentAt === previousLastMessageAt && !previousWindow.has(message.id);
				if (!message.outgoing && (observedAfterPersistedSummary || observedAfterEqualTimestamp)) locallyUnread.add(message.id);
			}
			this.groupMessageWindows.set(key, currentWindow);
			if (locallyUnread.size > 0) this.groupUnreadMessageIds.set(key, [...locallyUnread]);
			await this.persistMappedMessages(mapped);
		}));
	}
	/** Fill missing incoming group sender names from WNS without blocking history on failure. */
	async hydrateGroupSenderDisplayNames(mapped) {
		const pending = /* @__PURE__ */ new Map();
		for (const entry of mapped) {
			const message = entry.message;
			if (message.conversationKind !== "group" || message.outgoing || message.senderDisplayName !== void 0) continue;
			const handle = message.senderHandle ?? handleCandidateFromDid(message.senderDid);
			if (handle) pending.set(message.senderDid, handle);
		}
		if (pending.size === 0) return mapped;
		const displayNames = new Map((await Promise.all([...pending].map(async ([did, handle]) => {
			const displayName = await lookupDisplayName(this.options.transport, handle, did);
			return displayName ? [did, displayName] : null;
		}))).filter((value) => value !== null));
		if (displayNames.size === 0) return mapped;
		return mapped.map((entry) => {
			const senderDisplayName = displayNames.get(entry.message.senderDid);
			return senderDisplayName ? {
				...entry,
				message: {
					...entry.message,
					senderDisplayName
				}
			} : entry;
		});
	}
	mapWireMessage(wire, fallbackConversation, ownerDid) {
		const messageId = stringValue3(wire.message_id) ?? stringValue3(wire.id) ?? stringValue3(wire.client_msg_id);
		const senderDid = stringValue3(wire.sender_did);
		if (!messageId || !senderDid) return null;
		const receiverDid = stringValue3(wire.receiver_did);
		const groupDid = stringValue3(wire.group_did) ?? (fallbackConversation?.kind === "group" ? fallbackConversation.groupDid : void 0);
		const kind = groupDid ? "group" : "direct";
		const peerDid = kind === "direct" ? senderDid !== ownerDid ? senderDid : receiverDid : void 0;
		if (kind === "direct" && !peerDid) return null;
		const conversationId = fallbackConversation?.id ?? (kind === "group" ? groupConversationId(groupDid) : directConversationId(peerDid));
		const sentAt = timestampValue(wire.sent_at) ?? timestampValue(wire.accepted_at) ?? timestampValue(wire.created_at) ?? 0;
		const contentType = stringValue3(wire.content_type) ?? "text/plain";
		const attachment = parseAttachmentMessage(wire.content, contentType, this.options.attachmentMaxBytes);
		const content = attachment ? {
			kind: "attachment",
			attachment: attachment.attachment,
			...attachment.caption ? { caption: attachment.caption } : {}
		} : {
			kind: "text",
			text: textContent(wire)
		};
		const peerHandle = stringValue3(wire.peer_full_handle) ?? (senderDid !== ownerDid ? stringValue3(wire.sender_handle) : void 0);
		const senderDisplayName = stringValue3(wire.sender_display_name) ?? stringValue3(wire.display_name);
		const peerDisplayName = kind === "direct" ? stringValue3(wire.peer_display_name) ?? (senderDid !== ownerDid ? senderDisplayName : void 0) ?? (fallbackConversation?.kind === "direct" ? fallbackConversation.displayName : void 0) : void 0;
		const conversation = kind === "group" ? {
			kind: "group",
			id: conversationId,
			groupDid,
			title: stringValue3(wire.group_name) ?? (fallbackConversation?.kind === "group" ? fallbackConversation.title : groupDid),
			...sentAt ? { lastMessageAt: sentAt } : {},
			...sentAt ? { lastMessagePreview: messagePreview(content) } : {}
		} : directConversation({
			id: conversationId,
			peerDid,
			peerHandle,
			displayName: peerDisplayName,
			lastMessageAt: sentAt || void 0,
			lastMessagePreview: sentAt ? messagePreview(content) : void 0,
			fallbackTitle: fallbackConversation?.kind === "direct" ? fallbackConversation.title : void 0
		});
		const message = {
			id: messageId,
			conversationId,
			conversationKind: kind,
			senderDid,
			...stringValue3(wire.sender_handle) ? { senderHandle: stringValue3(wire.sender_handle) } : {},
			...senderDisplayName ? { senderDisplayName } : {},
			sentAt,
			outgoing: senderDid === ownerDid,
			content
		};
		const attachmentReference = attachment ? {
			attachment: attachment.attachment,
			objectUri: attachment.objectUri,
			senderDid,
			messageId,
			...kind === "group" ? { groupDid } : { messageTargetDid: receiverDid ?? peerDid },
			messageServiceDid: this.options.identity.requireSecrets().messageServiceDid
		} : void 0;
		return {
			message,
			conversation: {
				conversation,
				...peerDid ? { peerDid } : {},
				...groupDid ? { groupDid } : {}
			},
			attachmentReference
		};
	}
	async persistMappedMessages(mapped) {
		if (mapped.length === 0) return;
		await this.options.store.mutate((state) => {
			for (const entry of mapped) {
				const key = conversationKey(entry.conversation.conversation.id);
				state.conversations[key] = mergeConversation(state.conversations[key], entry.conversation);
				if (entry.attachmentReference) state.attachments[attachmentReferenceKey(entry.attachmentReference)] = entry.attachmentReference;
			}
		});
	}
	async upsertConversation(record, replaceDirectProfile = false) {
		await this.options.store.mutate((state) => {
			const key = conversationKey(record.conversation.id);
			state.conversations[key] = mergeConversation(state.conversations[key], record, replaceDirectProfile);
		});
	}
	groupConversation(value) {
		return Object.values(this.options.store.snapshot().conversations).find((record) => record.conversation.kind === "group" && (record.conversation.id === value || record.groupDid === value));
	}
	async persistReturnedToken(token) {
		if (!token || token === this.options.store.snapshot().identity?.accessToken) return;
		await this.options.store.mutate((state) => {
			if (state.identity) state.identity = {
				...state.identity,
				accessToken: token
			};
		});
	}
};
function validateHistoryWires(wires, conversation, ownerDid) {
	for (const wire of wires) {
		if (!isRecord4(wire)) throw new AwikiImError("remote", "AWiki history response contains an invalid message");
		if (conversation.conversation.kind === "group") {
			if (stringValue3(wire.group_did) !== conversation.groupDid) throw new AwikiImError("remote", "AWiki history message does not belong to the group");
			continue;
		}
		const senderDid = stringValue3(wire.sender_did);
		const receiverDid = stringValue3(wire.receiver_did);
		const peerDid = conversation.peerDid;
		if (!peerDid || !senderDid || !receiverDid || !(senderDid === ownerDid && receiverDid === peerDid || senderDid === peerDid && receiverDid === ownerDid)) throw new AwikiImError("remote", "AWiki history message does not belong to the direct peer");
	}
}
function validateSendResult(result, wire, target) {
	if (result.accepted !== true || result.operation_id !== wire.operationId || result.message_id !== wire.messageId || (target.kind === "direct" ? result.target_did !== target.did : result.group_did !== target.did)) throw new AwikiImError("remote", "AWiki send acknowledgement is invalid");
}
function localMeta(senderDid, profile) {
	return {
		profile,
		security_profile: "transport-protected",
		sender_did: senderDid,
		operation_id: operationId("op"),
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function groupLocalMeta(senderDid, groupDid) {
	return {
		profile: "anp.group.local.v1",
		security_profile: "transport-protected",
		sender_did: senderDid,
		...groupDid ? { target: {
			kind: "group",
			did: groupDid
		} } : {}
	};
}
function groupConversationFromWire(value) {
	if (!isRecord4(value)) return null;
	const groupDid = stringValue3(value.group_did) ?? stringValue3(value.did) ?? stringValue3(value.id);
	if (!groupDid) return null;
	const profile = isRecord4(value.profile) ? value.profile : void 0;
	const title = stringValue3(value.title) ?? stringValue3(value.name) ?? stringValue3(value.display_name) ?? stringValue3(profile?.display_name) ?? groupDid;
	const lastMessageAt = timestampValue(value.last_message_at);
	const lastMessagePreview = stringValue3(value.last_message_preview);
	return {
		conversation: {
			kind: "group",
			id: groupConversationId(groupDid),
			groupDid,
			title,
			...lastMessageAt ? { lastMessageAt } : {},
			...lastMessagePreview ? { lastMessagePreview } : {}
		},
		groupDid
	};
}
function parseAttachmentMessage(rawContent, contentType, maximumBytes) {
	if (contentType !== "application/anp-attachment-manifest+json") return null;
	const decoded = typeof rawContent === "string" ? parseJsonRecord(rawContent) : isRecord4(rawContent) ? rawContent : void 0;
	if (!decoded) throw new AwikiImError("remote", "AWiki attachment manifest is invalid");
	const attachments = arrayValue(decoded.attachments);
	if (attachments.length !== 1 || !isRecord4(attachments[0])) throw new AwikiImError("remote", "AWiki attachment manifest is invalid");
	const selected = attachments[0];
	const digest = isRecord4(selected.digest) ? selected.digest : void 0;
	const access = isRecord4(selected.access_info) ? selected.access_info : void 0;
	const encryption = isRecord4(selected.encryption_info) ? selected.encryption_info : void 0;
	const id = stringValue3(selected.attachment_id);
	const mimeType = stringValue3(selected.mime_type);
	const size = integerValue(selected.size);
	const digestB64u = stringValue3(digest?.value_b64u);
	const objectUri = stringValue3(access?.object_uri);
	if (!id || !mimeType || size === void 0 || size > maximumBytes || !digestB64u || !objectUri || digest?.alg !== "sha-256" || encryption?.mode !== "none" || decoded.primary_attachment_id !== void 0 && decoded.primary_attachment_id !== id) throw new AwikiImError("remote", "AWiki attachment manifest is invalid");
	return {
		attachment: {
			id,
			fileName: stringValue3(selected.filename) ?? id,
			mimeType,
			size,
			sha256: Buffer.from(digestB64u, "base64url").toString("hex")
		},
		objectUri,
		...stringValue3(decoded.caption) ? { caption: stringValue3(decoded.caption) } : {}
	};
}
function textContent(wire) {
	const content = wire.content;
	if (typeof content === "string") return content;
	if (isRecord4(content) && typeof content.text === "string") return content.text;
	if (isRecord4(wire.body) && typeof wire.body.text === "string") return wire.body.text;
	return "";
}
function messagePreview(content) {
	if (content.kind === "text") return content.text.trim() || "消息";
	return `[${content.attachment.mimeType.startsWith("image/") ? "图片" : "附件"}] ${content.attachment.fileName}`;
}
function stableIdentifiers(idempotencyKey) {
	const key = idempotencyKey.trim();
	if (!key || key.length > 256) throw new AwikiImError("invalid-request", "AWiki idempotency key is invalid");
	const digest = createHash("sha256").update(key).digest("hex").slice(0, 32);
	return {
		operationId: `op-${digest}`,
		messageId: `msg-${digest}`
	};
}
function sendOperationKey(idempotencyKey) {
	const key = idempotencyKey.trim();
	if (!key || key.length > 256) throw new AwikiImError("invalid-request", "AWiki idempotency key is invalid");
	return createHash("sha256").update(`send-operation:${key}`).digest("hex");
}
function sendFingerprint(value) {
	return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}
function assertOperationFingerprint(actualKind, actualFingerprint, expectedKind, expectedFingerprint) {
	if (actualKind !== expectedKind || actualFingerprint !== expectedFingerprint) throw new AwikiImError("conflict", "AWiki idempotency key is already in use");
}
function attachmentReferenceKey(reference) {
	return [
		reference.senderDid,
		reference.messageId,
		reference.attachment.id
	].map((value) => Buffer.from(value).toString("base64url")).join(".");
}
function directConversationId(peerDid) {
	return `direct:${Buffer.from(peerDid).toString("base64url")}`;
}
function groupConversationId(groupDid) {
	return `group:${Buffer.from(groupDid).toString("base64url")}`;
}
function mergeConversation(current, next, replaceDirectProfile = false) {
	if (!current) return next;
	const currentTime = current.conversation.lastMessageAt ?? 0;
	const nextTime = next.conversation.lastMessageAt ?? 0;
	const lastMessageAt = Math.max(currentTime, nextTime);
	const lastMessagePreview = nextTime > currentTime ? next.conversation.lastMessagePreview : currentTime > nextTime ? current.conversation.lastMessagePreview : next.conversation.lastMessagePreview ?? current.conversation.lastMessagePreview;
	if (current.conversation.kind === "direct" && next.conversation.kind === "direct") {
		const peerHandle = replaceDirectProfile ? next.conversation.peerHandle ?? current.conversation.peerHandle : current.conversation.peerHandle ?? next.conversation.peerHandle;
		const displayName = replaceDirectProfile ? next.conversation.displayName ?? current.conversation.displayName : current.conversation.displayName ?? next.conversation.displayName;
		return {
			...current,
			...next,
			conversation: directConversation({
				id: next.conversation.id,
				peerDid: next.conversation.peerDid,
				peerHandle,
				displayName,
				lastMessageAt: lastMessageAt || void 0,
				lastMessagePreview,
				fallbackTitle: preferredLabel(displayName, peerHandle, current.conversation.title, next.conversation.title, next.conversation.peerDid)
			})
		};
	}
	const { lastMessagePreview: _currentPreview, ...currentConversation } = current.conversation;
	const { lastMessagePreview: _nextPreview, ...nextConversation } = next.conversation;
	return {
		...current,
		...next,
		conversation: {
			...currentConversation,
			...nextConversation,
			...lastMessageAt > 0 ? { lastMessageAt } : {},
			...lastMessagePreview !== void 0 ? { lastMessagePreview } : {}
		}
	};
}
function directConversation(args) {
	const title = preferredLabel(args.displayName, args.peerHandle, args.fallbackTitle, args.peerDid);
	return {
		kind: "direct",
		id: args.id,
		peerDid: args.peerDid,
		title,
		...args.peerHandle ? { peerHandle: args.peerHandle } : {},
		...args.displayName ? { displayName: args.displayName } : {},
		...args.lastMessageAt ? { lastMessageAt: args.lastMessageAt } : {},
		...args.lastMessagePreview !== void 0 ? { lastMessagePreview: args.lastMessagePreview } : {}
	};
}
function preferredLabel(...candidates) {
	const values = candidates.filter((value) => !!value && value.trim() !== "");
	return values.find((value) => !value.startsWith("did:")) ?? values[0] ?? "";
}
function compareConversationRecency(left, right) {
	return (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0) || left.title.localeCompare(right.title);
}
function compareMessageTime(left, right) {
	return left.sentAt - right.sentAt || left.id.localeCompare(right.id);
}
function pageLimit(value) {
	if (value === void 0) return DEFAULT_PAGE_LIMIT;
	if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PAGE_LIMIT) throw new AwikiImError("invalid-request", "AWiki page limit is invalid");
	return value;
}
function encodeOffsetCursor(offset) {
	return Buffer.from(JSON.stringify({
		v: 1,
		offset
	})).toString("base64url");
}
function decodeOffsetCursor(cursor) {
	if (!cursor) return 0;
	try {
		const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
		if (isRecord4(decoded) && decoded.v === 1 && typeof decoded.offset === "number" && Number.isSafeInteger(decoded.offset) && decoded.offset >= 0) return decoded.offset;
	} catch {}
	throw new AwikiImError("invalid-request", "AWiki page cursor is invalid");
}
function encodeHistoryCursor(kind, conversationId, skip) {
	return Buffer.from(JSON.stringify({
		v: 1,
		kind,
		conversationId,
		skip
	}), "utf8").toString("base64url");
}
function decodeHistoryCursor(cursor, expectedKind, expectedConversationId) {
	if (!cursor) return 0;
	try {
		const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
		if (isRecord4(decoded) && decoded.v === 1 && decoded.kind === expectedKind && decoded.conversationId === expectedConversationId && typeof decoded.skip === "number" && Number.isSafeInteger(decoded.skip) && decoded.skip >= 0) return decoded.skip;
	} catch {}
	throw new AwikiImError("invalid-request", "AWiki history cursor is invalid");
}
function compactRecord(record) {
	return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== void 0));
}
function requiredConversationValue(value) {
	if (!value) throw new AwikiImError("not-found", "AWiki conversation was not found");
	return value;
}
function requiredWireString(value, label) {
	const result = stringValue3(value);
	if (!result) throw new AwikiImError("remote", `AWiki response is missing ${label}`);
	return result;
}
function cursorValue(value) {
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return stringValue3(value);
}
function timestampValue(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value > 1e10 ? value : value * 1e3;
	if (typeof value === "string" && value.trim()) {
		const numeric = Number(value);
		if (Number.isFinite(numeric)) return numeric > 1e10 ? numeric : numeric * 1e3;
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? void 0 : parsed;
	}
}
function integerValue(value) {
	const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : void 0;
}
function stringValue3(value) {
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function arrayValue(value) {
	return Array.isArray(value) ? value : [];
}
function parseJsonRecord(value) {
	try {
		const decoded = JSON.parse(value);
		return isRecord4(decoded) ? decoded : void 0;
	} catch {
		return;
	}
}
function isRecord4(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
var ATTACHMENT_PROFILE = "anp.attachment.v1";
var ATTACHMENT_CONTENT_TYPE = "application/anp-attachment-manifest+json";
var AwikiAttachmentRuntime = class {
	constructor(options) {
		this.options = options;
	}
	options;
	/** Upload, commit, and send one attachment manifest. */
	async sendAttachment(request) {
		return this.options.messaging.exclusiveSend(async () => {
			validateUpload(request.attachment, this.options.attachmentMaxBytes);
			const prepared = prepareAttachment(request.attachment.bytes);
			const caption = request.caption?.trim() || void 0;
			const fingerprint = sendFingerprint({
				kind: "attachment",
				target: request.target,
				fileName: request.attachment.fileName,
				mimeType: request.attachment.mimeType,
				size: request.attachment.bytes.byteLength,
				digest: prepared.digestHex,
				caption
			});
			const key = sendOperationKey(request.idempotencyKey);
			const existing = this.options.store.snapshot().sendOperations[key];
			if (existing) {
				assertOperationFingerprint(existing.kind, existing.fingerprint, "attachment", fingerprint);
				if (existing.kind !== "attachment") throw new AwikiImError("conflict", "AWiki idempotency key is already in use");
				if (existing.stage === "completed" && existing.result) return structuredClone(existing.result);
				return this.resumeAttachmentSend(key, existing, request.attachment.bytes);
			}
			const target = await this.options.messaging.resolveTarget(request.target);
			const identifiers = attachmentIdentifiers(request.idempotencyKey);
			const now = (/* @__PURE__ */ new Date()).toISOString();
			const operation = {
				kind: "attachment",
				fingerprint,
				target,
				attachment: {
					id: identifiers.attachmentId,
					fileName: request.attachment.fileName,
					mimeType: request.attachment.mimeType,
					size: request.attachment.bytes.byteLength,
					sha256: prepared.digestHex
				},
				digestB64u: prepared.digestB64u,
				...caption ? { caption } : {},
				createOperationId: identifiers.createOperationId,
				commitOperationId: identifiers.commitOperationId,
				messageOperationId: identifiers.messageOperationId,
				messageId: identifiers.messageId,
				createCreatedAt: now,
				commitCreatedAt: now,
				messageCreatedAt: now,
				stage: "prepared"
			};
			await this.options.store.mutate((state) => {
				if (state.sendOperations[key]) throw new AwikiImError("conflict", "AWiki idempotency key is already in use");
				state.sendOperations[key] = operation;
			});
			return this.resumeAttachmentSend(key, operation, request.attachment.bytes);
		});
	}
	async resumeAttachmentSend(key, initial, bytes) {
		const identity = this.options.identity.requireSecrets();
		let operation = initial;
		if (operation.stage === "prepared") {
			const slot2 = parseSlot(await this.options.messaging.authenticatedRpc("attachment.create_slot", {
				meta: attachmentMeta(identity.public.did, identity.messageServiceDid, operation.createOperationId, operation.createCreatedAt),
				body: {
					attachment_id: operation.attachment.id,
					expected_size: String(operation.attachment.size),
					expected_digest: {
						alg: "sha-256",
						value_b64u: operation.digestB64u
					},
					mime_type: operation.attachment.mimeType,
					filename: operation.attachment.fileName,
					intended_message_security_profile: "transport-protected",
					intended_target: {
						kind: operation.target.kind === "direct" ? "agent" : "group",
						did: operation.target.did
					},
					object_encryption_mode: "none"
				}
			}), operation.attachment.id);
			this.options.transport.validateAttachmentUrl(slot2.uploadUri);
			this.options.transport.validateAttachmentUrl(slot2.objectUri);
			operation = await this.advanceOperation(key, operation, {
				stage: "slot-created",
				slot: slot2
			});
		}
		const slot = requiredSlot(operation);
		if (operation.stage === "slot-created") {
			await this.options.transport.putBytes(slot.uploadUri, slot.uploadHeaders, bytes);
			operation = await this.advanceOperation(key, operation, { stage: "uploaded" });
		}
		if (operation.stage === "uploaded") {
			const commit = await this.options.messaging.authenticatedRpc("attachment.commit_object", {
				meta: attachmentMeta(identity.public.did, identity.messageServiceDid, operation.commitOperationId, operation.commitCreatedAt),
				body: {
					attachment_id: operation.attachment.id,
					slot_id: slot.slotId,
					commit_token: slot.commitToken,
					size: String(operation.attachment.size),
					digest: {
						alg: "sha-256",
						value_b64u: operation.digestB64u
					},
					object_encryption_mode: "none"
				}
			});
			if (commit.committed !== true || commit.attachment_id !== operation.attachment.id || commit.object_uri !== slot.objectUri) throw new AwikiImError("remote", "AWiki attachment commit acknowledgement is invalid");
			operation = await this.advanceOperation(key, operation, { stage: "committed" });
		}
		if (operation.stage !== "committed") {
			if (operation.stage === "completed" && operation.result) return operation.result;
			throw new AwikiImError("remote", "AWiki attachment send state is invalid");
		}
		const manifest = {
			attachments: [{
				attachment_id: operation.attachment.id,
				filename: operation.attachment.fileName,
				mime_type: operation.attachment.mimeType,
				size: String(operation.attachment.size),
				digest: {
					alg: "sha-256",
					value_b64u: operation.digestB64u
				},
				access_info: { object_uri: slot.objectUri },
				encryption_info: { mode: "none" }
			}],
			...operation.caption ? { caption: operation.caption } : {},
			primary_attachment_id: operation.attachment.id
		};
		const reference = {
			attachment: operation.attachment,
			objectUri: slot.objectUri,
			senderDid: identity.public.did,
			...operation.target.kind === "group" ? { groupDid: operation.target.did } : { messageTargetDid: operation.target.did },
			messageServiceDid: identity.messageServiceDid
		};
		const message = await this.options.messaging.sendPayload(operation.target, ATTACHMENT_CONTENT_TYPE, { payload: manifest }, {
			operationId: operation.messageOperationId,
			messageId: operation.messageId,
			createdAt: operation.messageCreatedAt
		}, {
			kind: "attachment",
			attachment: operation.attachment,
			...operation.caption ? { caption: operation.caption } : {}
		}, reference);
		await this.advanceOperation(key, operation, {
			stage: "completed",
			result: message
		});
		return message;
	}
	async advanceOperation(key, expected, patch) {
		let updated;
		await this.options.store.mutate((state) => {
			const current = state.sendOperations[key];
			if (!current || current.kind !== "attachment" || current.fingerprint !== expected.fingerprint || current.stage !== expected.stage) throw new AwikiImError("conflict", "AWiki attachment send operation state changed");
			updated = {
				...current,
				...patch
			};
			state.sendOperations[key] = updated;
		});
		if (!updated) throw new AwikiImError("remote", "AWiki attachment send state was not persisted");
		return updated;
	}
	/** Issue a ticket, download the object, and verify exact size and SHA-256. */
	async downloadAttachment(request) {
		const identity = this.options.identity.requireSecrets();
		const references = Object.values(this.options.store.snapshot().attachments).filter((candidate) => candidate.attachment.id === request.attachmentId && candidate.messageId === request.messageId);
		if (references.length === 0) throw new AwikiImError("not-found", "AWiki attachment was not found");
		if (references.length > 1) throw new AwikiImError("conflict", "AWiki attachment message reference is ambiguous");
		const reference = references[0];
		if (!reference) throw new AwikiImError("not-found", "AWiki attachment was not found");
		this.options.transport.validateAttachmentUrl(reference.objectUri);
		const operation = operationId("op");
		const messageServiceDid = await this.resolveAttachmentServiceDid(reference.senderDid);
		const ticket = await this.options.messaging.authenticatedRpc("attachment.get_download_ticket", {
			meta: attachmentMeta(identity.public.did, messageServiceDid, operation, (/* @__PURE__ */ new Date()).toISOString()),
			body: {
				attachment_id: reference.attachment.id,
				object_uri: reference.objectUri,
				requester_did: identity.public.did,
				message_security_profile: "transport-protected",
				message_id: reference.messageId,
				one_time: true,
				...reference.groupDid ? { group_did: reference.groupDid } : { message_target_did: requiredDirectTarget(reference) }
			}
		});
		validateTicketBinding(ticket.ticket_binding, reference, identity.public.did);
		const ticketValue = requiredString2(ticket.download_ticket_b64u, "download ticket");
		const bytes = await this.options.transport.getBytes(reference.objectUri, ticketValue, reference.attachment.size);
		const digestHex = createHash("sha256").update(bytes).digest("hex");
		if (bytes.byteLength !== reference.attachment.size || digestHex !== reference.attachment.sha256) throw new AwikiImError("remote", "AWiki attachment verification failed");
		return {
			attachment: reference.attachment,
			bytes
		};
	}
	async resolveAttachmentServiceDid(senderDid) {
		const identity = this.options.identity.requireSecrets();
		const document = senderDid === identity.public.did ? identity.didDocument : await this.options.transport.getJson(didResolutionUrl(senderDid));
		if (document.id !== senderDid) throw new AwikiImError("remote", "AWiki service returned an invalid response");
		if (!isValidAttachmentDidDocument(document)) throw new AwikiImError("remote", "AWiki attachment sender DID document is invalid");
		const selected = arrayValue2(document.service).filter(isRecord5).filter((service) => service.type === "ANPMessageService" && arrayValue2(service.profiles).includes(ATTACHMENT_PROFILE) && arrayValue2(service.securityProfiles ?? service.security_profiles).includes("transport-protected") && typeof service.serviceDid === "string" && service.serviceDid.trim() && typeof service.serviceEndpoint === "string" && service.serviceEndpoint.trim()).map((service, index) => ({
			service,
			index,
			priority: priorityValue(service.priority)
		})).sort((left, right) => {
			if (left.priority !== void 0 && right.priority !== void 0) return left.priority - right.priority || left.index - right.index;
			if (left.priority !== void 0) return -1;
			if (right.priority !== void 0) return 1;
			return left.index - right.index;
		})[0]?.service;
		if (!selected) throw new AwikiImError("remote", "AWiki attachment service was not found");
		this.options.transport.validateAttachmentUrl(requiredString2(selected.serviceEndpoint, "attachment service endpoint"));
		return requiredString2(selected.serviceDid, "attachment service DID");
	}
};
function requiredSlot(operation) {
	if (!operation.slot) throw new AwikiImError("remote", "AWiki attachment slot state is missing");
	return operation.slot;
}
function parseSlot(result, expectedAttachmentId) {
	const attachmentId = requiredString2(result.attachment_id, "attachment ID");
	if (attachmentId !== expectedAttachmentId) throw new AwikiImError("remote", "AWiki service returned an invalid response");
	return {
		attachmentId,
		slotId: requiredString2(result.slot_id, "attachment slot ID"),
		uploadUri: requiredString2(result.upload_uri, "attachment upload URI"),
		uploadHeaders: stringRecord(result.upload_headers, "attachment upload headers"),
		objectUri: requiredString2(result.object_uri, "attachment object URI"),
		commitToken: requiredString2(result.commit_token, "attachment commit token")
	};
}
function attachmentMeta(senderDid, serviceDid, operation, createdAt) {
	return {
		profile: ATTACHMENT_PROFILE,
		security_profile: "transport-protected",
		sender_did: senderDid,
		target: {
			kind: "service",
			did: serviceDid
		},
		operation_id: operation,
		created_at: createdAt
	};
}
function attachmentIdentifiers(idempotencyKey) {
	const key = idempotencyKey.trim();
	if (!key || key.length > 256) throw new AwikiImError("invalid-request", "AWiki idempotency key is invalid");
	return {
		attachmentId: `att-${digestPrefix(`attachment:${key}`)}`,
		createOperationId: `op-${digestPrefix(`create:${key}`)}`,
		commitOperationId: `op-${digestPrefix(`commit:${key}`)}`,
		messageOperationId: `op-${digestPrefix(`message:${key}`)}`,
		messageId: `msg-${digestPrefix(`message:${key}`)}`
	};
}
function digestPrefix(value) {
	return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
function prepareAttachment(bytes) {
	const digest = createHash("sha256").update(bytes).digest();
	return {
		digestHex: digest.toString("hex"),
		digestB64u: digest.toString("base64url")
	};
}
function validateUpload(upload, maximumBytes) {
	if (!upload.fileName.trim() || upload.fileName.includes("/") || upload.fileName.includes("\\")) throw new AwikiImError("invalid-request", "AWiki attachment file name is invalid");
	if (!/^[\w.+-]+\/[\w.+-]+$/.test(upload.mimeType.trim())) throw new AwikiImError("invalid-request", "AWiki attachment MIME type is invalid");
	if (!(upload.bytes instanceof Uint8Array)) throw new AwikiImError("invalid-request", "AWiki attachment bytes are invalid");
	if (upload.bytes.byteLength > maximumBytes) throw new AwikiImError("invalid-request", "AWiki attachment exceeds the configured limit");
}
function validateTicketBinding(value, reference, requesterDid) {
	if (!isRecord5(value)) throw new AwikiImError("remote", "AWiki service returned an invalid response");
	const expected = {
		attachment_id: reference.attachment.id,
		object_uri: reference.objectUri,
		requester_did: requesterDid,
		message_id: reference.messageId,
		message_security_profile: "transport-protected"
	};
	if (Object.entries(expected).some(([key, expectedValue]) => value[key] !== expectedValue) || (reference.groupDid ? value.group_did !== reference.groupDid : value.message_target_did !== reference.messageTargetDid)) throw new AwikiImError("remote", "AWiki service returned an invalid response");
}
function requiredDirectTarget(reference) {
	if (!reference.messageTargetDid) throw new AwikiImError("not-found", "AWiki attachment message context was not found");
	return reference.messageTargetDid;
}
function didResolutionUrl(did) {
	if (!did.startsWith("did:wba:")) throw new AwikiImError("remote", "AWiki attachment sender DID is invalid");
	const parts = did.split(":");
	const authority = parts[2];
	if (!authority) throw new AwikiImError("remote", "AWiki attachment sender DID is invalid");
	const host = decodeURIComponent(authority);
	const path = parts.slice(3).map((segment) => encodeURIComponent(segment)).join("/");
	return path ? `https://${host}/${path}/did.json` : `https://${host}/.well-known/did.json`;
}
function requiredString2(value, label) {
	if (typeof value !== "string" || !value.trim()) throw new AwikiImError("remote", `AWiki response is missing ${label}`);
	return value.trim();
}
function stringRecord(value, label) {
	if (!isRecord5(value)) throw new AwikiImError("remote", `AWiki response is missing ${label}`);
	const output = {};
	for (const [key, headerValue] of Object.entries(value)) {
		if (typeof headerValue !== "string" || !key.trim()) throw new AwikiImError("remote", `AWiki response is missing ${label}`);
		output[key] = headerValue;
	}
	return output;
}
function isRecord5(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
function arrayValue2(value) {
	return Array.isArray(value) ? value : [];
}
function priorityValue(value) {
	const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return Number.isFinite(parsed) ? Math.trunc(parsed) : void 0;
}
function isValidAttachmentDidDocument(document) {
	try {
		return validateDidDocumentBinding(document, true);
	} catch {
		return false;
	}
}
var AwikiIdentityRuntime = class {
	constructor(options) {
		this.options = options;
	}
	options;
	registrationTail = Promise.resolve();
	profileTail = Promise.resolve();
	displayNameResolved = false;
	/** Return the public identity projection. */
	getIdentity() {
		return this.options.store.snapshot().identity?.public ?? null;
	}
	/** Fill a missing WNS display name once; failures leave the identity unchanged. */
	async hydrateDisplayName() {
		const current = this.getIdentity();
		if (!current || current.displayName !== void 0 || this.displayNameResolved) return;
		this.displayNameResolved = true;
		const displayName = await lookupDisplayName(this.options.transport, current.handle, current.did);
		if (!displayName) return;
		await this.options.store.mutate((state) => {
			if (state.identity) state.identity = {
				...state.identity,
				public: {
					...state.identity.public,
					displayName
				}
			};
		});
	}
	/** Reject persisted identity material that belongs to a different configured deployment. */
	validateConfiguredIdentity() {
		const snapshot = this.options.store.snapshot();
		const material = snapshot.identity ?? snapshot.pendingRegistration;
		if (material && material.messageServiceDid !== this.options.messageServiceDid) throw new AwikiImError("conflict", "AWiki state belongs to a different Message Service");
		const handle = snapshot.identity?.public.handle ?? snapshot.pendingRegistration?.handle;
		if (handle && !handle.endsWith(`.${this.options.userServiceDomain}`)) throw new AwikiImError("conflict", "AWiki state belongs to a different User Service domain");
	}
	/** Send the phone-only registration OTP supported by the frozen MVP API. */
	async sendRegistrationOtp(request) {
		if (this.getIdentity()) throw new AwikiImError("already-registered", "AWiki identity is already registered");
		const phone = normalizePhone(request.phone);
		const handle = normalizeRegistrationHandle(request.handle, this.options.userServiceDomain);
		const result = await this.options.transport.rpc(this.options.userServiceUrl, HANDLE_RPC_PATH, "send_otp", { phone });
		const retryAfterSeconds = requiredWireNumber(result.value.retry_after_seconds, "retry_after_seconds");
		const retryAt = requiredWireString2(result.value.retry_at, "retry_at");
		const registrationOtp = {
			handle: handle.full,
			phone,
			retryAt
		};
		await this.options.store.mutate((state) => {
			state.registrationOtp = registrationOtp;
		});
		return {
			retryAfterSeconds,
			retryAt
		};
	}
	/** Register and persist the one deployment identity. */
	async registerIdentity(request) {
		return this.exclusiveRegistration(async () => {
			if (this.getIdentity()) throw new AwikiImError("already-registered", "AWiki identity is already registered");
			const registrationOtp = this.options.store.snapshot().registrationOtp;
			const phone = normalizePhone(request.phone);
			const otp = normalizeOtp(request.otp);
			const handle = normalizeRegistrationHandle(request.handle, this.options.userServiceDomain);
			if (!registrationOtp || registrationOtp.phone !== phone || registrationOtp.handle !== handle.full) throw new AwikiImError("invalid-request", "AWiki registration OTP target does not match");
			let pending = this.options.store.snapshot().pendingRegistration;
			if (pending) {
				if (pending.handle !== handle.full || pending.phone !== phone) throw new AwikiImError("conflict", "AWiki registration is already pending");
				pending = refreshPendingProof(pending, handle.domain);
			} else pending = createPendingRegistration(phone, handle, this.options.messageServicePublicUrl, this.options.messageServiceDid);
			await this.options.store.mutate((state) => {
				state.pendingRegistration = pending;
			});
			try {
				const result = await this.options.transport.rpc(this.options.userServiceUrl, DID_AUTH_RPC_PATH, "register", {
					did_document: pending.didDocument,
					handle: handle.local,
					phone,
					otp_code: otp
				});
				return this.commitRegistration(pending, result.value, result.accessToken);
			} catch (error) {
				const normalized = normalizeAwikiImError(error);
				if (normalized.code === "conflict") {
					const reconciled = await this.tryReconcilePending(pending);
					if (reconciled) return reconciled;
				}
				throw normalized;
			}
		});
	}
	/** Update the public WNS display name and keep the local projection in sync. */
	async updateDisplayName(value) {
		return this.exclusiveProfileUpdate(async () => {
			const displayName = value.trim();
			const length = [...displayName].length;
			if (length === 0 || length > 50) throw new AwikiImError("invalid-request", "AWiki display name must contain between 1 and 50 characters");
			let identity = this.requireSecrets();
			let result;
			try {
				result = await this.options.transport.rpc(this.options.userServiceUrl, DID_PROFILE_RPC_PATH, "update_me", { nick_name: displayName }, identity.accessToken);
			} catch (error) {
				const normalized = normalizeAwikiImError(error);
				if (normalized.code !== "forbidden") throw normalized;
				const accessToken = await this.refreshAccessToken();
				identity = this.requireSecrets();
				result = await this.options.transport.rpc(this.options.userServiceUrl, DID_PROFILE_RPC_PATH, "update_me", { nick_name: displayName }, accessToken);
			}
			const returnedName = requiredWireString2(result.value.display_name, "display_name");
			if (returnedName !== displayName) throw new AwikiImError("remote", "AWiki service returned an invalid response");
			await this.options.store.mutate((state) => {
				if (state.identity) state.identity = {
					...state.identity,
					...result.accessToken === void 0 ? {} : { accessToken: result.accessToken },
					public: {
						...state.identity.public,
						displayName: returnedName
					}
				};
			});
			this.displayNameResolved = true;
			return this.getIdentity() ?? identity.public;
		});
	}
	/** Require secret identity material for a message operation. */
	requireSecrets() {
		const identity = this.options.store.snapshot().identity;
		if (!identity) throw new AwikiImError("not-registered", "AWiki identity is not registered");
		return identity;
	}
	/** Refresh an expired bearer by authenticating the persisted DID. */
	async refreshAccessToken() {
		const identity = this.requireSecrets();
		const result = await this.options.transport.signedRpc(this.options.userServiceUrl, DID_AUTH_RPC_PATH, "get_me", {}, {
			didDocument: identity.didDocument,
			signingPrivateKeyPem: identity.signingPrivateKeyPem,
			signingKeyId: identity.signingKeyId
		});
		const token = result.accessToken ?? requiredWireString2(result.value.access_token, "access token");
		await this.options.store.mutate((state) => {
			if (state.identity) state.identity = {
				...state.identity,
				accessToken: token
			};
		});
		return token;
	}
	async commitRegistration(pending, result, headerToken) {
		const state = requiredWireString2(result.state, "registration state");
		if (state === "join_required") throw new AwikiImError("already-registered", "AWiki identity is already registered");
		if (state !== "registered") throw new AwikiImError("remote", "AWiki service returned an invalid response");
		const did = requiredWireString2(result.did, "registered DID");
		if (did !== pending.didDocument.id) throw new AwikiImError("remote", "AWiki service returned an invalid response");
		const fullHandle = stringValue4(result.full_handle) ?? pending.handle;
		if (fullHandle !== pending.handle) throw new AwikiImError("remote", "AWiki service returned an invalid response");
		const accessToken = headerToken ?? requiredWireString2(result.access_token, "access token");
		return this.persistRegisteredIdentity(pending, did, fullHandle, accessToken);
	}
	async tryReconcilePending(pending) {
		try {
			const result = await this.options.transport.signedRpc(this.options.userServiceUrl, DID_AUTH_RPC_PATH, "get_me", {}, {
				didDocument: pending.didDocument,
				signingPrivateKeyPem: pending.signingPrivateKeyPem,
				signingKeyId: pending.signingKeyId
			});
			const did = requiredWireString2(result.value.did, "registered DID");
			if (did !== pending.didDocument.id) return null;
			const token = result.accessToken ?? requiredWireString2(result.value.access_token, "access token");
			return this.persistRegisteredIdentity(pending, did, pending.handle, token);
		} catch {
			return null;
		}
	}
	async persistRegisteredIdentity(pending, did, handle, accessToken) {
		const publicIdentity = {
			did,
			handle,
			registeredAt: Date.now()
		};
		await this.options.store.mutate((state) => {
			state.identity = {
				public: publicIdentity,
				didDocument: pending.didDocument,
				rootPrivateKeyPem: pending.rootPrivateKeyPem,
				signingPrivateKeyPem: pending.signingPrivateKeyPem,
				signingKeyId: pending.signingKeyId,
				accessToken,
				messageServiceDid: pending.messageServiceDid
			};
			delete state.registrationOtp;
			delete state.pendingRegistration;
		});
		await this.hydrateDisplayName();
		return this.getIdentity() ?? publicIdentity;
	}
	async exclusiveRegistration(operation) {
		let release = () => void 0;
		const previous = this.registrationTail;
		this.registrationTail = new Promise((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await operation();
		} finally {
			release();
		}
	}
	async exclusiveProfileUpdate(operation) {
		let release = () => void 0;
		const previous = this.profileTail;
		this.profileTail = new Promise((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await operation();
		} finally {
			release();
		}
	}
};
function createPendingRegistration(phone, handle, messageServicePublicUrl, messageServiceDid) {
	const services = [buildAnpMessageService("#message", new URL("/anp-im/rpc", messageServicePublicUrl).toString(), {
		serviceDid: messageServiceDid,
		profiles: [
			"anp.core.binding.v1",
			"anp.direct.base.v1",
			"anp.group.base.v1",
			"anp.attachment.v1"
		],
		securityProfiles: ["transport-protected"]
	}), {
		id: "#handle",
		type: "ANPHandleService",
		serviceEndpoint: `https://${handle.domain}/.well-known/handle/${handle.local}`
	}];
	const bundle = createDidWbaDocument(handle.domain, {
		pathSegments: [handle.local],
		services,
		domain: handle.domain,
		challenge: randomChallenge(),
		didProfile: "e1",
		enableE2ee: false
	});
	const signingKey = bundle.keys["key-1"];
	if (!signingKey) throw new AwikiImError("remote", "AWiki identity generation failed");
	return {
		handle: handle.full,
		phone,
		didDocument: bundle.didDocument,
		rootPrivateKeyPem: signingKey.privateKeyPem,
		signingPrivateKeyPem: signingKey.privateKeyPem,
		signingKeyId: `${bundle.didDocument.id}#key-1`,
		messageServiceDid
	};
}
function refreshPendingProof(pending, domain) {
	const unsigned = structuredClone(pending.didDocument);
	delete unsigned.proof;
	const didDocument = generateW3cProof(unsigned, pending.rootPrivateKeyPem, `${unsigned.id}#key-1`, {
		proofPurpose: "assertionMethod",
		proofType: PROOF_TYPE_DATA_INTEGRITY,
		cryptosuite: CRYPTOSUITE_EDDSA_JCS_2022,
		domain,
		challenge: randomChallenge()
	});
	return {
		...pending,
		didDocument
	};
}
function normalizeRegistrationHandle(input, userServiceDomain) {
	const value = input.trim().toLowerCase().replace(/^wba:\/\//, "");
	const configuredDomain = userServiceDomain.toLowerCase();
	const dot = value.indexOf(".");
	const local = dot < 0 ? value : value.slice(0, dot);
	const domain = dot < 0 ? configuredDomain : value.slice(dot + 1);
	if (!validateLocalPart(local) || !domain.includes(".") || domain !== configuredDomain) throw new AwikiImError("invalid-request", "AWiki handle is invalid");
	return {
		local,
		domain,
		full: `${local}.${domain}`
	};
}
function normalizePhone(value) {
	const phone = value.trim().replace(/[\s()-]/g, "");
	if (!/^\+?[0-9]{6,20}$/.test(phone)) throw new AwikiImError("invalid-request", "AWiki phone number is invalid");
	return phone;
}
function normalizeOtp(value) {
	const otp = value.trim();
	if (!/^[0-9]{4,12}$/.test(otp)) throw new AwikiImError("invalid-otp", "AWiki verification code is invalid");
	return otp;
}
function requiredWireString2(value, label) {
	const result = stringValue4(value);
	if (!result) throw new AwikiImError("remote", `AWiki response is missing ${label}`);
	return result;
}
function requiredWireNumber(value, label) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new AwikiImError("remote", `AWiki response is missing ${label}`);
	return value;
}
function stringValue4(value) {
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
var AwikiImStateStore = class {
	constructor(path) {
		this.path = path;
	}
	path;
	state = emptyState();
	mutationTail = Promise.resolve();
	/** Load and minimally validate state from disk. */
	async load() {
		if (!this.path.trim()) throw new AwikiImError("invalid-request", "AWiki statePath is required");
		try {
			const decoded = JSON.parse(await readFile(this.path, "utf8"));
			if (!isPersistedState(decoded)) throw new AwikiImError("invalid-request", "AWiki identity state is invalid");
			this.state = decoded;
		} catch (error) {
			if (isMissingFile(error)) {
				this.state = emptyState();
				return;
			}
			if (error instanceof AwikiImError) throw error;
			throw new AwikiImError("invalid-request", "AWiki identity state cannot be read", void 0, { cause: error });
		}
	}
	/** Return the current in-memory state. Callers must not mutate it directly. */
	snapshot() {
		return this.state;
	}
	/** Serialize one mutation and persist its complete result atomically. */
	async mutate(mutator) {
		const operation = this.mutationTail.then(async () => {
			const next = structuredClone(this.state);
			mutator(next);
			await this.persist(next);
			this.state = next;
		});
		this.mutationTail = operation.catch(() => void 0);
		await operation;
	}
	async persist(state) {
		const parent = dirname(this.path);
		await mkdir(parent, {
			recursive: true,
			mode: 448
		});
		const temporaryPath = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
		try {
			await writeFile(temporaryPath, `${JSON.stringify(state)}
`, {
				encoding: "utf8",
				mode: 384,
				flag: "wx"
			});
			await rename(temporaryPath, this.path);
			await chmod(this.path, 384);
		} catch (error) {
			await unlink(temporaryPath).catch((unlinkError) => {
				if (!isMissingFile(unlinkError)) throw unlinkError;
			});
			throw new AwikiImError("remote", "AWiki identity state cannot be persisted", void 0, { cause: error });
		}
	}
};
function isPersistedState(value) {
	if (!value || typeof value !== "object") return false;
	const record = value;
	return record.version === STATE_VERSION && isRecord6(record.conversations) && isRecord6(record.attachments) && isRecord6(record.sendOperations);
}
function isRecord6(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
function isMissingFile(error) {
	return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
function createAwikiImClient(options) {
	return new DefaultAwikiImClient(options);
}
var DefaultAwikiImClient = class {
	store;
	transport;
	identity;
	messaging;
	attachments;
	ready;
	inFlight = /* @__PURE__ */ new Set();
	disposal;
	disposed = false;
	constructor(options) {
		const allowInsecureLoopback = options.allowInsecureLoopbackForTesting === true;
		validateServiceBaseUrl(options.userServiceUrl, allowInsecureLoopback);
		validateServiceBaseUrl(options.messageServiceUrl, allowInsecureLoopback);
		validateServiceBaseUrl(options.messageServicePublicUrl, allowInsecureLoopback);
		if (!isDomainName(options.userServiceDomain)) throw new AwikiImError("invalid-request", "AWiki userServiceDomain is invalid");
		if (!isBareDomainDidWba(options.messageServiceDid)) throw new AwikiImError("invalid-request", "AWiki messageServiceDid is invalid");
		if (!Array.isArray(options.allowedAttachmentOrigins) || options.allowedAttachmentOrigins.length === 0) throw new AwikiImError("invalid-request", "AWiki allowedAttachmentOrigins is required");
		if (!Number.isSafeInteger(options.attachmentMaxBytes) || options.attachmentMaxBytes < 1) throw new AwikiImError("invalid-request", "AWiki attachmentMaxBytes is invalid");
		if (!options.statePath.trim()) throw new AwikiImError("invalid-request", "AWiki statePath is required");
		const fetchImpl = options.fetch ?? globalThis.fetch;
		if (typeof fetchImpl !== "function") throw new AwikiImError("invalid-request", "AWiki fetch implementation is required");
		this.store = new AwikiImStateStore(options.statePath);
		this.transport = new AwikiImTransport(fetchImpl, {
			allowedAttachmentOrigins: options.allowedAttachmentOrigins,
			allowInsecureLoopback,
			attachmentMaxBytes: options.attachmentMaxBytes
		});
		this.identity = new AwikiIdentityRuntime({
			userServiceUrl: options.userServiceUrl,
			userServiceDomain: options.userServiceDomain.toLowerCase(),
			messageServicePublicUrl: options.messageServicePublicUrl,
			messageServiceDid: options.messageServiceDid,
			transport: this.transport,
			store: this.store
		});
		this.messaging = new AwikiMessagingRuntime({
			userServiceUrl: options.userServiceUrl,
			messageServiceUrl: options.messageServiceUrl,
			transport: this.transport,
			store: this.store,
			identity: this.identity,
			attachmentMaxBytes: options.attachmentMaxBytes
		});
		this.attachments = new AwikiAttachmentRuntime({
			transport: this.transport,
			store: this.store,
			identity: this.identity,
			messaging: this.messaging,
			attachmentMaxBytes: options.attachmentMaxBytes
		});
		this.ready = this.store.load().then(() => this.identity.validateConfiguredIdentity());
	}
	async getIdentity() {
		return this.run(async () => {
			await this.identity.hydrateDisplayName();
			return structuredClone(this.identity.getIdentity());
		});
	}
	async sendRegistrationOtp(request) {
		return this.run(() => this.identity.sendRegistrationOtp(request));
	}
	async registerIdentity(request) {
		return this.run(() => this.identity.registerIdentity(request));
	}
	async updateDisplayName(request) {
		return this.run(() => this.identity.updateDisplayName(request.displayName));
	}
	async resolvePeer(peer) {
		return this.run(async () => {
			this.identity.requireSecrets();
			const resolved = await this.messaging.resolveTarget({
				kind: "direct",
				peer
			});
			return {
				did: resolved.did,
				conversationId: resolved.conversationId,
				...resolved.handle === void 0 ? {} : { handle: resolved.handle },
				...resolved.displayName === void 0 ? {} : { displayName: resolved.displayName }
			};
		});
	}
	async listConversations(request) {
		return this.run(() => this.messaging.listConversations(request));
	}
	async getHistory(request) {
		return this.run(() => this.messaging.getHistory(request));
	}
	async markConversationRead(conversationId) {
		return this.run(() => this.messaging.markConversationRead(conversationId));
	}
	async sendText(request) {
		return this.run(() => this.messaging.sendText(request));
	}
	async sendAttachment(request) {
		return this.run(() => this.attachments.sendAttachment(request));
	}
	async downloadAttachment(request) {
		return this.run(() => this.attachments.downloadAttachment(request));
	}
	async dispose() {
		this.disposal ??= this.disposeOnce();
		return this.disposal;
	}
	run(operation) {
		if (this.disposed) return Promise.reject(new AwikiImError("remote", "AWiki IM client has been disposed"));
		const pending = (async () => {
			try {
				await this.ready;
				return await operation();
			} catch (error) {
				throw normalizeAwikiImError(error);
			}
		})();
		this.inFlight.add(pending);
		pending.then(() => this.inFlight.delete(pending), () => this.inFlight.delete(pending));
		return pending;
	}
	async disposeOnce() {
		this.disposed = true;
		this.transport.dispose();
		const ready = this.ready.catch((error) => {
			throw normalizeAwikiImError(error);
		});
		await Promise.allSettled([...this.inFlight]);
		await ready;
	}
};
function isDomainName(value) {
	const domain = value.trim().toLowerCase();
	if (!domain || domain.length > 253 || domain.includes("/") || domain.includes(":")) return false;
	try {
		return new URL(`https://${domain}`).hostname === domain;
	} catch {
		return false;
	}
}
function isBareDomainDidWba(value) {
	const prefix = "did:wba:";
	const normalized = value.trim().toLowerCase();
	return normalized.startsWith(prefix) && isDomainName(normalized.slice(8));
}
//#endregion
//#region lib/types/provider.js
/** Production AWiki provider backed by the versioned TypeScript SDK. */
/** Cordis plugin name used by Loader diagnostics. */
const name = "awiki-typescript-sdk-provider";
/** The AWiki service must own its provider registry before this plugin loads. */
const inject = ["awiki"];
/** Register one SDK client whose disposal follows this provider's fiber. */
function apply(ctx) {
	ctx.effect(() => ctx.awiki.registerClientFactory((options) => new TypeScriptSdkAdapter(createAwikiImClient(options))), "awiki TypeScript SDK client");
}
//#endregion
export { apply, inject, name };
