window.__ModuleLoader__.load({
	id: "@awiki/dsh-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$2(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const _undefined$2 = /^undefined$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$2(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUndefined = /*@__PURE__*/ $constructor("$ZodUndefined", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _undefined$2;
			inst._zod.values = /* @__PURE__ */ new Set([void 0]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (typeof input === "undefined") return payload;
				payload.issues.push({
					expected: "undefined",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }

        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }

        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _undefined$1(Class, params) {
			return new Class({
				type: "undefined",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const undefinedProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Undefined cannot be represented in JSON Schema");
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") {
				if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
				else vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time$1(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time$1(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUndefined = /*@__PURE__*/ $constructor("ZodUndefined", (inst, def) => {
			$ZodUndefined.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
		});
		function _undefined(params) {
			return /* @__PURE__ */ _undefined$1(ZodUndefined, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
		//#region lib/typert.remote-client.js
		const dsh_awiki_awiki_clearLocalData_parameter_0$schema = object({ "confirmation": string().readonly() });
		const dsh_awiki_awiki_clearLocalData_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({ "cleared": boolean().readonly() }).readonly()
		})]);
		const dsh_awiki_awiki_downloadAttachment_parameter_0$schema = object({
			"attachmentId": intersection(string(), unknown()).readonly(),
			"messageId": intersection(string(), unknown()).readonly()
		});
		const dsh_awiki_awiki_downloadAttachment_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"attachment": object({
					"id": intersection(string(), unknown()).readonly(),
					"fileName": string().readonly(),
					"mimeType": string().readonly(),
					"size": number().readonly(),
					"sha256": string().readonly()
				}).readonly(),
				"bytesBase64": string().readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_getConfig_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"pollIntervalMs": number().readonly(),
				"attachmentMaxBytes": number().readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_getHistory_parameter_0$schema = object({
			"conversationId": intersection(string(), unknown()).readonly(),
			"cursor": intersection(string(), unknown()).readonly().optional(),
			"limit": number().readonly().optional()
		});
		const dsh_awiki_awiki_getHistory_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"items": array(object({
					"id": intersection(string(), unknown()).readonly(),
					"conversationId": intersection(string(), unknown()).readonly(),
					"conversationKind": union([literal("direct"), literal("group")]).readonly(),
					"senderDid": intersection(string(), unknown()).readonly(),
					"senderHandle": intersection(string(), unknown()).readonly().optional(),
					"senderDisplayName": string().readonly().optional(),
					"sentAt": number().readonly(),
					"outgoing": boolean().readonly(),
					"content": union([object({
						"kind": literal("text").readonly(),
						"text": string().readonly()
					}), object({
						"kind": literal("attachment").readonly(),
						"attachment": object({
							"id": intersection(string(), unknown()).readonly(),
							"fileName": string().readonly(),
							"mimeType": string().readonly(),
							"size": number().readonly(),
							"sha256": string().readonly()
						}).readonly(),
						"caption": string().readonly().optional()
					})]).readonly()
				})).readonly(),
				"nextCursor": intersection(string(), unknown()).readonly().optional(),
				"hasMore": boolean().readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_getIdentity_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": union([literal(null), object({
				"handle": intersection(string(), unknown()).readonly(),
				"did": intersection(string(), unknown()).readonly(),
				"displayName": string().readonly().optional(),
				"registeredAt": number().readonly()
			})]).readonly()
		})]);
		const dsh_awiki_awiki_getSession_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": union([
				object({ "status": literal("unregistered").readonly() }),
				object({ "status": literal("signed-out").readonly() }),
				object({
					"status": literal("active").readonly(),
					"identity": object({
						"handle": intersection(string(), unknown()).readonly(),
						"did": intersection(string(), unknown()).readonly(),
						"displayName": string().readonly().optional(),
						"registeredAt": number().readonly()
					}).readonly()
				})
			]).readonly()
		})]);
		const dsh_awiki_awiki_listConversations_parameter_0$schema = union([_undefined(), object({
			"cursor": intersection(string(), unknown()).readonly().optional(),
			"limit": number().readonly().optional()
		})]);
		const dsh_awiki_awiki_listConversations_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"items": array(union([object({
					"kind": literal("direct").readonly(),
					"id": intersection(string(), unknown()).readonly(),
					"peerDid": intersection(string(), unknown()).readonly(),
					"peerHandle": intersection(string(), unknown()).readonly().optional(),
					"displayName": string().readonly().optional(),
					"title": string().readonly(),
					"unreadCount": number().readonly().optional(),
					"lastMessageAt": number().readonly().optional(),
					"lastMessagePreview": string().readonly().optional()
				}), object({
					"kind": literal("group").readonly(),
					"id": intersection(string(), unknown()).readonly(),
					"groupDid": intersection(string(), unknown()).readonly(),
					"title": string().readonly(),
					"unreadCount": number().readonly().optional(),
					"lastMessageAt": number().readonly().optional(),
					"lastMessagePreview": string().readonly().optional()
				})])).readonly(),
				"nextCursor": intersection(string(), unknown()).readonly().optional(),
				"hasMore": boolean().readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_login_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": union([
				object({ "status": literal("unregistered").readonly() }),
				object({ "status": literal("signed-out").readonly() }),
				object({
					"status": literal("active").readonly(),
					"identity": object({
						"handle": intersection(string(), unknown()).readonly(),
						"did": intersection(string(), unknown()).readonly(),
						"displayName": string().readonly().optional(),
						"registeredAt": number().readonly()
					}).readonly()
				})
			]).readonly()
		})]);
		const dsh_awiki_awiki_logout_parameter_0$schema = object({ "confirmation": string().readonly() });
		const dsh_awiki_awiki_logout_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": union([
				object({ "status": literal("unregistered").readonly() }),
				object({ "status": literal("signed-out").readonly() }),
				object({
					"status": literal("active").readonly(),
					"identity": object({
						"handle": intersection(string(), unknown()).readonly(),
						"did": intersection(string(), unknown()).readonly(),
						"displayName": string().readonly().optional(),
						"registeredAt": number().readonly()
					}).readonly()
				})
			]).readonly()
		})]);
		const dsh_awiki_awiki_markConversationRead_parameter_0$schema = object({ "conversationId": intersection(string(), unknown()).readonly() });
		const dsh_awiki_awiki_markConversationRead_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": number().readonly()
		})]);
		const dsh_awiki_awiki_registerIdentity_parameter_0$schema = object({
			"handle": string().readonly(),
			"phone": string().readonly(),
			"otp": string().readonly()
		});
		const dsh_awiki_awiki_registerIdentity_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"handle": intersection(string(), unknown()).readonly(),
				"did": intersection(string(), unknown()).readonly(),
				"displayName": string().readonly().optional(),
				"registeredAt": number().readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_resolvePeer_parameter_0$schema = object({ "peer": string().readonly() });
		const dsh_awiki_awiki_resolvePeer_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"did": intersection(string(), unknown()).readonly(),
				"handle": intersection(string(), unknown()).readonly().optional(),
				"displayName": string().readonly().optional(),
				"conversationId": intersection(string(), unknown()).readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_sendAttachment_parameter_0$schema = object({
			"target": union([object({
				"kind": literal("direct").readonly(),
				"peer": string().readonly()
			}), object({
				"kind": literal("group").readonly(),
				"group": string().readonly()
			})]).readonly(),
			"fileName": string().readonly(),
			"mimeType": string().readonly(),
			"bytesBase64": string().readonly(),
			"caption": string().readonly().optional(),
			"idempotencyKey": string().readonly()
		});
		const dsh_awiki_awiki_sendAttachment_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"id": intersection(string(), unknown()).readonly(),
				"conversationId": intersection(string(), unknown()).readonly(),
				"conversationKind": union([literal("direct"), literal("group")]).readonly(),
				"senderDid": intersection(string(), unknown()).readonly(),
				"senderHandle": intersection(string(), unknown()).readonly().optional(),
				"senderDisplayName": string().readonly().optional(),
				"sentAt": number().readonly(),
				"outgoing": boolean().readonly(),
				"content": union([object({
					"kind": literal("text").readonly(),
					"text": string().readonly()
				}), object({
					"kind": literal("attachment").readonly(),
					"attachment": object({
						"id": intersection(string(), unknown()).readonly(),
						"fileName": string().readonly(),
						"mimeType": string().readonly(),
						"size": number().readonly(),
						"sha256": string().readonly()
					}).readonly(),
					"caption": string().readonly().optional()
				})]).readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_sendRegistrationOtp_parameter_0$schema = object({
			"handle": string().readonly(),
			"phone": string().readonly()
		});
		const dsh_awiki_awiki_sendRegistrationOtp_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"retryAfterSeconds": number().readonly(),
				"retryAt": string().readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_sendText_parameter_0$schema = object({
			"target": union([object({
				"kind": literal("direct").readonly(),
				"peer": string().readonly()
			}), object({
				"kind": literal("group").readonly(),
				"group": string().readonly()
			})]).readonly(),
			"text": string().readonly(),
			"idempotencyKey": string().readonly()
		});
		const dsh_awiki_awiki_sendText_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"id": intersection(string(), unknown()).readonly(),
				"conversationId": intersection(string(), unknown()).readonly(),
				"conversationKind": union([literal("direct"), literal("group")]).readonly(),
				"senderDid": intersection(string(), unknown()).readonly(),
				"senderHandle": intersection(string(), unknown()).readonly().optional(),
				"senderDisplayName": string().readonly().optional(),
				"sentAt": number().readonly(),
				"outgoing": boolean().readonly(),
				"content": union([object({
					"kind": literal("text").readonly(),
					"text": string().readonly()
				}), object({
					"kind": literal("attachment").readonly(),
					"attachment": object({
						"id": intersection(string(), unknown()).readonly(),
						"fileName": string().readonly(),
						"mimeType": string().readonly(),
						"size": number().readonly(),
						"sha256": string().readonly()
					}).readonly(),
					"caption": string().readonly().optional()
				})]).readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_summarizeConversation_parameter_0$schema = object({
			"conversationId": intersection(string(), unknown()).readonly(),
			"unreadCountAtOpen": number().readonly().optional()
		});
		const dsh_awiki_awiki_summarizeConversation_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"range": object({
					"kind": union([literal("unread"), literal("recent")]).readonly(),
					"messageCount": number().readonly(),
					"firstMessageId": intersection(string(), unknown()).readonly(),
					"lastMessageId": intersection(string(), unknown()).readonly(),
					"startedAt": number().readonly(),
					"endedAt": number().readonly(),
					"truncated": boolean().readonly()
				}).readonly(),
				"highlights": array(string()).readonly(),
				"conclusions": array(string()).readonly(),
				"todos": array(object({
					"text": string().readonly(),
					"owner": string().readonly().optional()
				})).readonly()
			}).readonly()
		})]);
		const dsh_awiki_awiki_updateDisplayName_parameter_0$schema = object({ "displayName": string().readonly() });
		const dsh_awiki_awiki_updateDisplayName_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
					literal("signed-out"),
					literal("already-registered"),
					literal("invalid-request"),
					literal("invalid-otp"),
					literal("challenge-expired"),
					literal("handle-unavailable"),
					literal("not-found"),
					literal("forbidden"),
					literal("conflict"),
					literal("rate-limited"),
					literal("attachment-too-large"),
					literal("summary-unavailable"),
					literal("summary-timeout"),
					literal("summary-cancelled"),
					literal("summary-invalid-output"),
					literal("summary-failed"),
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": object({
				"handle": intersection(string(), unknown()).readonly(),
				"did": intersection(string(), unknown()).readonly(),
				"displayName": string().readonly().optional(),
				"registeredAt": number().readonly()
			}).readonly()
		})]);
		const TYPERT_REMOTE = {
			package: "@awiki/dsh-plugin",
			descriptors: [
				{
					id: "@awiki/dsh-plugin#awiki/clearLocalData",
					service: "awiki",
					namespace: "awiki",
					method: "clearLocalData",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiClearLocalDataRequest",
							schema: dsh_awiki_awiki_clearLocalData_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_clearLocalData_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 803,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/downloadAttachment",
					service: "awiki",
					namespace: "awiki",
					method: "downloadAttachment",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiDownloadAttachmentRequest",
							schema: dsh_awiki_awiki_downloadAttachment_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_downloadAttachment_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 784,
						"column": 9
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/getConfig",
					service: "awiki",
					namespace: "awiki",
					method: "getConfig",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_getConfig_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 528,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/getHistory",
					service: "awiki",
					namespace: "awiki",
					method: "getHistory",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiHistoryRequest",
							schema: dsh_awiki_awiki_getHistory_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_getHistory_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 654,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/getIdentity",
					service: "awiki",
					namespace: "awiki",
					method: "getIdentity",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_getIdentity_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 543,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/getSession",
					service: "awiki",
					namespace: "awiki",
					method: "getSession",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_getSession_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 549,
						"column": 9
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/listConversations",
					service: "awiki",
					namespace: "awiki",
					method: "listConversations",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						acceptsUndefined: true,
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiPageRequest",
							schema: dsh_awiki_awiki_listConversations_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_listConversations_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 644,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/login",
					service: "awiki",
					namespace: "awiki",
					method: "login",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_login_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 582,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/logout",
					service: "awiki",
					namespace: "awiki",
					method: "logout",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiLogoutRequest",
							schema: dsh_awiki_awiki_logout_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_logout_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 560,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/markConversationRead",
					service: "awiki",
					namespace: "awiki",
					method: "markConversationRead",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiMarkConversationReadRequest",
							schema: dsh_awiki_awiki_markConversationRead_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_markConversationRead_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 743,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/registerIdentity",
					service: "awiki",
					namespace: "awiki",
					method: "registerIdentity",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiRegistrationRequest",
							schema: dsh_awiki_awiki_registerIdentity_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_registerIdentity_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 614,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/resolvePeer",
					service: "awiki",
					namespace: "awiki",
					method: "resolvePeer",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiResolvePeerRequest",
							schema: dsh_awiki_awiki_resolvePeer_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_resolvePeer_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 634,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/sendAttachment",
					service: "awiki",
					namespace: "awiki",
					method: "sendAttachment",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiSendAttachmentRequest",
							schema: dsh_awiki_awiki_sendAttachment_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_sendAttachment_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 763,
						"column": 9
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/sendRegistrationOtp",
					service: "awiki",
					namespace: "awiki",
					method: "sendRegistrationOtp",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiRegistrationOtpRequest",
							schema: dsh_awiki_awiki_sendRegistrationOtp_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_sendRegistrationOtp_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 604,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/sendText",
					service: "awiki",
					namespace: "awiki",
					method: "sendText",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiSendTextRequest",
							schema: dsh_awiki_awiki_sendText_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_sendText_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 753,
						"column": 3
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/summarizeConversation",
					service: "awiki",
					namespace: "awiki",
					method: "summarizeConversation",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiSummarizeConversationRequest",
							schema: dsh_awiki_awiki_summarizeConversation_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_summarizeConversation_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 664,
						"column": 9
					}
				},
				{
					id: "@awiki/dsh-plugin#awiki/updateDisplayName",
					service: "awiki",
					namespace: "awiki",
					method: "updateDisplayName",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@awiki/dsh-plugin/types#AwikiUpdateDisplayNameRequest",
							schema: dsh_awiki_awiki_updateDisplayName_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@awiki/dsh-plugin/types#AwikiResult",
						schema: dsh_awiki_awiki_updateDisplayName_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 624,
						"column": 3
					}
				}
			]
		};
		//#endregion
		//#region lib/types/domain.js
		/** Client-safe AWiki Handle provider domain constants and validation. */
		/** Default Handle provider domain for new AWiki deployments. */
		const DEFAULT_AWIKI_DOMAIN = "awiki.ai";
		/** Field carrying the Handle provider domain in the AWiki settings namespace. */
		const AWIKI_DOMAIN_FIELD = "domain";
		/** Normalize and validate one DNS provider domain. */
		function normalizeAwikiDomain(raw, field = "domain") {
			const value = raw.trim().toLowerCase();
			const valid = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(value);
			if (value.length > 253 || !valid) throw new TypeError(`awiki: ${field} must contain a valid DNS domain`);
			return value;
		}
		//#endregion
		//#region lib/types/types.js
		/** Client-safe AWiki service and Remote data types. */
		/** Exact browser acknowledgement required before locally signing out. */
		const AWIKI_LOGOUT_CONFIRMATION = "logout-awiki-session";
		/** Exact browser acknowledgement required before destructive local-state removal. */
		const AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION = "clear-awiki-local-data";
		//#endregion
		//#region lib/types/client/controller.js
		/** React-free browser controller for the deployment's one AWiki identity. */
		/** Turn a registration rejection into an actionable message without exposing remote response text. */
		function registrationFailureMessage(failure) {
			switch (failure.code) {
				case "already-registered": return "当前设备已注册 AWiki 身份，请刷新后继续使用。";
				case "invalid-request": return "注册信息不匹配，请检查手机号、Handle 和验证码后重试。";
				case "invalid-otp": return "验证码不正确，请检查后重试。";
				case "challenge-expired": return "验证码状态已失效，请重新获取验证码后再注册。";
				case "handle-unavailable": return "该 Handle 已存在，无法重复注册。请更换一个未使用的 Handle，并重新获取验证码。";
				case "conflict": return "注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。";
				case "rate-limited": return "注册请求过于频繁，请稍后重试。";
				case "network": return "无法连接 AWiki 服务，请检查网络后重试。";
				case "forbidden": return "当前 AWiki 服务未开放公开注册，或该手机号不在注册白名单。请使用已获准的手机号，或联系管理员开通注册权限。";
				case "remote": return "AWiki 服务暂时无法完成注册，请稍后重试；若持续失败，请联系管理员并提供失败时间。";
				default: return `${failure.code}：${failure.message}`;
			}
		}
		/** Turn a verification-code request failure into a safe next action. */
		function registrationOtpFailureMessage(failure) {
			switch (failure.code) {
				case "rate-limited": return "验证码发送过于频繁，请等待限流解除后再重新获取。";
				case "invalid-request": return "无法发送验证码，请检查手机号和 Handle 后重试。";
				case "forbidden": return "当前 AWiki 服务未向该手机号开放注册，请联系管理员。";
				case "network": return "无法连接 AWiki 服务，请检查网络后重试。";
				case "remote": return "AWiki 服务暂时无法发送验证码，请稍后重试。";
				default: return registrationFailureMessage(failure);
			}
		}
		const INITIAL_VIEW = Object.freeze({
			status: "cold",
			sessionStatus: "unregistered",
			identity: null,
			conversations: Object.freeze([]),
			conversationsHasMore: false,
			selectedConversationId: null,
			messages: Object.freeze([]),
			historyHasMore: false,
			pending: null,
			error: null,
			attachmentMaxBytes: 0,
			summaries: Object.freeze({})
		});
		/** Turn a closed Host summary failure into one actionable Chinese message. */
		function summaryFailureMessage(failure) {
			switch (failure.code) {
				case "summary-unavailable": return "AI 总结暂不可用，请先在 Harness 设置中配置可用的默认模型。";
				case "summary-timeout": return "AI 总结超时，请稍后重新生成。";
				case "summary-cancelled": return "AI 总结已取消，请重新生成。";
				case "summary-invalid-output": return "模型没有返回有效的结构化摘要，请重新生成。";
				case "summary-failed": return "暂时无法生成 AI 总结，请检查模型连接后重试。";
				default: return `${failure.code}：${failure.message}`;
			}
		}
		/** Flatten the carrier and business result once for every controller caller. */
		async function call(operation, failureMessage = (failure) => `${failure.code}：${failure.message}`) {
			try {
				const carried = await operation();
				if (!carried.ok) return {
					ok: false,
					error: `连接 AWiki Host 失败：${carried.error.message}`
				};
				if (!carried.value.ok) return {
					ok: false,
					error: failureMessage(carried.value.error)
				};
				return {
					ok: true,
					value: carried.value.value
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? `AWiki 调用失败：${error.message}` : "AWiki 调用失败"
				};
			}
		}
		/** Append unique values while retaining existing references. */
		function appendUnique(current, incoming, id) {
			const seen = new Set(current.map(id));
			const appended = [];
			for (const value of incoming) {
				const key = id(value);
				if (seen.has(key)) continue;
				seen.add(key);
				appended.push(value);
			}
			return [...current, ...appended];
		}
		/** Prepend unique values while retaining the existing tail. */
		function prependUnique(current, incoming, id) {
			const seen = new Set(current.map(id));
			const prepended = [];
			for (const value of incoming) {
				const key = id(value);
				if (seen.has(key)) continue;
				seen.add(key);
				prepended.push(value);
			}
			return [...prepended, ...current];
		}
		/** Strip surrounding space and a leading @ from a Handle the user typed. */
		function normalizeHandle(value) {
			return value.trim().replace(/^@+/u, "");
		}
		/** Compare a typed Handle against the deployment identity, including domain suffix form. */
		function sameIdentity(identity, peer) {
			const own = identity.handle.toLowerCase();
			const target = peer.toLowerCase();
			return own === target || own.startsWith(`${target}.`) || target.startsWith(`${own}.`);
		}
		/** Keys that can identify one direct peer in the current roster. */
		function directPeerKeys(conversation) {
			const keys = [conversation.peerDid, conversation.title];
			if (conversation.peerHandle !== void 0) keys.push(conversation.peerHandle);
			if (conversation.displayName !== void 0) keys.push(conversation.displayName);
			return keys.map((value) => value.replace(/^@/u, "").toLowerCase());
		}
		/** Find an existing direct conversation for one typed Handle or DID. */
		function findDirect(conversations, peer) {
			const key = peer.toLowerCase();
			return conversations.find((conversation) => conversation.kind === "direct" && directPeerKeys(conversation).includes(key));
		}
		/** Keep a profile refreshed from WNS when a slower roster page still carries an older message snapshot. */
		function preserveDirectProfile(incoming, current) {
			if (incoming.kind !== "direct" || current?.kind !== "direct") return incoming;
			const displayName = current.displayName ?? incoming.displayName;
			const peerHandle = current.peerHandle ?? incoming.peerHandle;
			return {
				...incoming,
				title: displayName ?? peerHandle ?? incoming.title,
				...peerHandle === void 0 ? {} : { peerHandle },
				...displayName === void 0 ? {} : { displayName }
			};
		}
		/** Resolve one listed conversation into the send target accepted by AWiki. */
		function targetOf(conversation) {
			return conversation.kind === "direct" ? {
				kind: "direct",
				peer: conversation.peerDid
			} : {
				kind: "group",
				group: conversation.groupDid
			};
		}
		/** Browser object layer for identity, conversations, history, and polling. */
		var AwikiController = class {
			remote;
			view = INITIAL_VIEW;
			listeners = /* @__PURE__ */ new Set();
			config = null;
			conversationsCursor;
			historyCursor;
			timer;
			generation = 0;
			disposed = false;
			polling = false;
			markReadInFlight = /* @__PURE__ */ new Map();
			unreadAtOpen = /* @__PURE__ */ new Map();
			summaryBaselines = /* @__PURE__ */ new Map();
			/** @param remote - generated Host Remote namespace. */
			constructor(remote) {
				this.remote = remote;
			}
			/** Return the cached immutable view. */
			getSnapshot = () => this.view;
			/** Subscribe to view replacement. */
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Load Host policy and the shared identity state without starting drawer polling. */
			async loadSession() {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				this.close();
				this.summaryBaselines.clear();
				const generation = this.generation;
				this.publish({
					...INITIAL_VIEW,
					status: "loading"
				});
				const config = await call(() => this.remote.getConfig());
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				if (!config.ok) return this.fail(config.error);
				this.config = config.value;
				const session = await call(() => this.remote.getSession());
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				if (!session.ok) return this.fail(session.error);
				this.publish({
					...this.view,
					status: "ready",
					sessionStatus: session.value.status,
					identity: session.value.status === "active" ? session.value.identity : null,
					error: null,
					attachmentMaxBytes: config.value.attachmentMaxBytes
				});
				return {
					ok: true,
					value: void 0
				};
			}
			/**
			* Load Host policy and identity, then start polling while the drawer remains open.
			* @returns successful readiness or one display-safe Host failure.
			*/
			async open() {
				const loaded = await this.loadSession();
				if (!loaded.ok) return loaded;
				const generation = this.generation;
				if (this.view.identity !== null) {
					const listed = await this.refreshConversations(generation);
					if (!listed.ok) return listed;
				}
				if (this.current(generation)) this.timer = setInterval(() => {
					this.poll(generation);
				}, this.config?.pollIntervalMs ?? 3e3);
				return {
					ok: true,
					value: void 0
				};
			}
			/** Sign out locally while retaining the SDK-owned identity and database. */
			async logout(request) {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const result = await call(() => this.remote.logout(request));
				if (!result.ok) return result;
				this.close();
				this.conversationsCursor = void 0;
				this.historyCursor = void 0;
				this.summaryBaselines.clear();
				this.publish({
					...INITIAL_VIEW,
					status: "ready",
					sessionStatus: "signed-out",
					attachmentMaxBytes: this.config?.attachmentMaxBytes ?? 0
				});
				return result;
			}
			/** Resume the preserved local identity and reload its conversations. */
			async login() {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const result = await call(() => this.remote.login());
				if (!result.ok) return result;
				if (result.value.status !== "active") return {
					ok: false,
					error: "本机没有可恢复的 AWiki 身份"
				};
				const opened = await this.open();
				return opened.ok ? result : {
					ok: false,
					error: opened.error
				};
			}
			/** Stop polling and invalidate all in-flight drawer work. */
			close() {
				this.generation += 1;
				if (this.timer !== void 0) clearInterval(this.timer);
				this.timer = void 0;
				this.polling = false;
				this.markReadInFlight.clear();
			}
			/**
			* Request one phone verification challenge.
			* @param request - desired Handle and verification phone number.
			* @returns challenge retry metadata or one display-safe failure.
			*/
			async sendRegistrationOtp(request) {
				return this.withPending("发送验证码", () => call(() => this.remote.sendRegistrationOtp(request), registrationOtpFailureMessage));
			}
			/**
			* Register the deployment identity and populate the initial conversation list.
			* @param request - verified Handle, phone number, and one-time code.
			* @returns the registered public identity or one display-safe failure.
			*/
			async registerIdentity(request) {
				const generation = this.generation;
				const result = await this.withPending("注册身份", () => call(() => this.remote.registerIdentity(request), registrationFailureMessage));
				if (!result.ok) return result;
				if (!this.current(generation)) return result;
				this.publish({
					...this.view,
					sessionStatus: "active",
					identity: result.value,
					error: null
				});
				await this.refreshConversations(generation);
				return result;
			}
			/**
			* Update the deployment identity's public display name.
			* @param displayName - replacement display name selected by the user.
			* @returns the updated identity or one display-safe failure.
			*/
			async updateDisplayName(displayName) {
				const normalized = displayName.trim();
				const length = Array.from(normalized).length;
				if (length === 0) return this.fail("请输入昵称");
				if (length > 50) return this.fail("昵称不能超过 50 个字符");
				const generation = this.generation;
				const result = await this.withPending("修改昵称", () => call(() => this.remote.updateDisplayName({ displayName: normalized })));
				if (!result.ok || !this.current(generation)) return result;
				this.publish({
					...this.view,
					identity: result.value,
					error: null
				});
				return result;
			}
			/**
			* Load another page of the conversation roster.
			* @returns successful pagination or one display-safe failure.
			*/
			async loadMoreConversations() {
				const generation = this.generation;
				const result = await this.withPending("加载更多会话", () => call(() => this.remote.listConversations(this.conversationsCursor === void 0 ? {} : { cursor: this.conversationsCursor })));
				if (!result.ok) return result;
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				this.conversationsCursor = result.value.nextCursor;
				this.publish({
					...this.view,
					conversations: appendUnique(this.view.conversations, result.value.items, (value) => value.id),
					conversationsHasMore: result.value.hasMore && result.value.nextCursor !== void 0
				});
				return {
					ok: true,
					value: void 0
				};
			}
			/**
			* Look up a Handle or DID, then open the matching direct conversation.
			* @param handle - peer Handle or DID typed by the user.
			* @returns successful selection or one display-safe lookup failure.
			*/
			async startDirectChat(handle) {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const peer = normalizeHandle(handle);
				if (peer === "") return this.fail("请输入 Handle");
				const identity = this.view.identity;
				if (identity === null) return this.fail("请先注册 AWiki 身份");
				if (sameIdentity(identity, peer)) return this.fail("不能向自己发起私聊");
				const existing = findDirect(this.view.conversations, peer);
				if (existing !== void 0) return this.selectConversation(existing.id);
				const generation = this.generation;
				const resolved = await this.withPending("查找用户", () => call(() => this.remote.resolvePeer({ peer })));
				if (!resolved.ok) return resolved.error.startsWith("not-found") ? this.fail("该 Handle 不存在") : resolved;
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				if (resolved.value.did === identity.did) return this.fail("不能向自己发起私聊");
				await this.refreshConversations(generation);
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				const listed = this.view.conversations.find((conversation) => conversation.id === resolved.value.conversationId) ?? findDirect(this.view.conversations, resolved.value.handle ?? peer) ?? findDirect(this.view.conversations, resolved.value.did);
				if (listed !== void 0) return this.selectConversation(listed.id);
				const conversation = {
					kind: "direct",
					id: resolved.value.conversationId,
					peerDid: resolved.value.did,
					title: resolved.value.displayName ?? resolved.value.handle ?? resolved.value.did,
					...resolved.value.handle === void 0 ? {} : { peerHandle: resolved.value.handle },
					...resolved.value.displayName === void 0 ? {} : { displayName: resolved.value.displayName }
				};
				this.publish({
					...this.view,
					conversations: [conversation, ...this.view.conversations],
					error: null
				});
				return this.selectConversation(conversation.id);
			}
			/**
			* Select a conversation and load its newest history page.
			* @param conversationId - selected conversation, or `null` to return to the roster.
			* @returns successful selection or one display-safe history failure.
			*/
			async selectConversation(conversationId) {
				this.historyCursor = void 0;
				const selected = conversationId === null ? void 0 : this.view.conversations.find((conversation) => conversation.id === conversationId);
				if (selected !== void 0) this.unreadAtOpen.set(selected.id, selected.unreadCount ?? 0);
				this.publish({
					...this.view,
					selectedConversationId: conversationId,
					messages: [],
					historyHasMore: false,
					error: null
				});
				if (conversationId === null) return {
					ok: true,
					value: void 0
				};
				const generation = this.generation;
				const profile = selected?.kind === "direct" ? call(() => this.remote.resolvePeer({ peer: selected.peerDid })) : Promise.resolve(null);
				const [loaded, refreshed] = await Promise.all([this.loadHistory(false), profile]);
				if (refreshed?.ok && this.current(generation) && this.view.selectedConversationId === conversationId && selected?.kind === "direct" && refreshed.value.did === selected.peerDid && refreshed.value.conversationId === selected.id) this.publish({
					...this.view,
					conversations: this.view.conversations.map((conversation) => {
						if (conversation.id !== conversationId || conversation.kind !== "direct") return conversation;
						const displayName = refreshed.value.displayName ?? conversation.displayName;
						const peerHandle = refreshed.value.handle ?? conversation.peerHandle;
						return {
							...conversation,
							title: displayName ?? peerHandle ?? conversation.title,
							...peerHandle === void 0 ? {} : { peerHandle },
							...displayName === void 0 ? {} : { displayName }
						};
					})
				});
				if (!loaded.ok) return loaded;
				return {
					ok: true,
					value: void 0
				};
			}
			/**
			* Mark the selected conversation read after the UI proves its newest message is visible.
			* Repeated scroll and layout notifications share one Host request, while a failed
			* background attempt keeps the unread badge so reaching the bottom can retry.
			*/
			async markSelectedConversationRead() {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const conversation = this.selectedConversation();
				if (conversation === void 0 || (conversation.unreadCount ?? 0) <= 0) return {
					ok: true,
					value: void 0
				};
				const existing = this.markReadInFlight.get(conversation.id);
				if (existing !== void 0) return existing;
				const conversationId = conversation.id;
				const generation = this.generation;
				const operation = (async () => {
					const result = await call(() => this.remote.markConversationRead({ conversationId }));
					if (!result.ok) return result;
					if (this.current(generation)) this.publish({
						...this.view,
						conversations: this.view.conversations.map((current) => current.id === conversationId ? {
							...current,
							unreadCount: 0
						} : current)
					});
					return {
						ok: true,
						value: void 0
					};
				})();
				this.markReadInFlight.set(conversationId, operation);
				try {
					return await operation;
				} finally {
					if (this.markReadInFlight.get(conversationId) === operation) this.markReadInFlight.delete(conversationId);
				}
			}
			/**
			* Load one older history page before the currently rendered messages.
			* @returns successful pagination or one display-safe failure.
			*/
			loadOlderHistory() {
				return this.loadHistory(true);
			}
			/** Generate or regenerate the selected conversation's runtime-only summary. */
			async summarizeConversation() {
				const conversation = this.selectedConversation();
				if (conversation === void 0) return this.fail("请先选择会话");
				const conversationId = conversation.id;
				const generation = this.generation;
				this.setSummary(conversationId, {
					status: "loading",
					collapsed: false,
					stale: false
				});
				const unreadCountAtOpen = this.unreadAtOpen.get(conversationId) ?? 0;
				const result = await call(() => this.remote.summarizeConversation({
					conversationId,
					...unreadCountAtOpen > 0 ? { unreadCountAtOpen } : {}
				}), summaryFailureMessage);
				if (!this.current(generation)) return result;
				if (!result.ok) {
					this.setSummary(conversationId, {
						status: "error",
						collapsed: false,
						stale: false,
						error: result.error
					});
					return result;
				}
				this.setSummary(conversationId, {
					status: "success",
					collapsed: false,
					stale: false,
					result: result.value
				});
				const latestSentAt = Math.max(result.value.range.endedAt, ...this.view.messages.map((message) => message.sentAt));
				const messageIdsAtLatest = new Set(this.view.messages.filter((message) => message.sentAt === latestSentAt).map((message) => message.id));
				if (result.value.range.endedAt === latestSentAt) messageIdsAtLatest.add(result.value.range.lastMessageId);
				this.summaryBaselines.set(conversationId, {
					latestSentAt,
					messageIdsAtLatest
				});
				return result;
			}
			/** Expand or collapse one cached summary without another model call. */
			setSummaryCollapsed(conversationId, collapsed) {
				const current = this.view.summaries[conversationId];
				if (current === void 0 || current.status === "idle") return;
				this.setSummary(conversationId, {
					...current,
					collapsed
				});
			}
			/**
			* Send one text message to the selected direct or group conversation.
			* @param text - non-empty text prepared by the composer.
			* @returns successful delivery or one display-safe failure.
			*/
			async sendText(text) {
				const conversation = this.selectedConversation();
				if (conversation === void 0) return this.fail("请先选择会话");
				const conversationId = conversation.id;
				const generation = this.generation;
				const result = await this.withPending("发送消息", () => call(() => this.remote.sendText({
					target: targetOf(conversation),
					text,
					idempotencyKey: crypto.randomUUID()
				})));
				if (!result.ok) return result;
				if (!this.current(generation) || this.view.selectedConversationId !== conversationId) return {
					ok: true,
					value: void 0
				};
				this.appendMessage(result.value);
				return {
					ok: true,
					value: void 0
				};
			}
			/**
			* Send one already-read browser file without retaining its bytes in the view.
			* @param file - JSON-safe file name, MIME type, base64 bytes, and optional caption.
			* @returns successful delivery or one display-safe failure.
			*/
			async sendAttachment(file) {
				const conversation = this.selectedConversation();
				if (conversation === void 0) return this.fail("请先选择会话");
				const conversationId = conversation.id;
				const generation = this.generation;
				const request = {
					target: targetOf(conversation),
					fileName: file.fileName,
					mimeType: file.mimeType,
					bytesBase64: file.bytesBase64,
					...file.caption === void 0 ? {} : { caption: file.caption },
					idempotencyKey: crypto.randomUUID()
				};
				const result = await this.withPending("发送附件", () => call(() => this.remote.sendAttachment(request)));
				if (!result.ok) return result;
				if (!this.current(generation) || this.view.selectedConversationId !== conversationId) return {
					ok: true,
					value: void 0
				};
				this.appendMessage(result.value);
				return {
					ok: true,
					value: void 0
				};
			}
			/**
			* Download verified attachment bytes without publishing them into controller state.
			* @param messageId - message that grants access to the attachment.
			* @param attachmentId - attachment selected from that message.
			* @returns verified attachment metadata and bytes, or one display-safe failure.
			*/
			async downloadAttachment(messageId, attachmentId) {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const generation = this.generation;
				const result = await call(() => this.remote.downloadAttachment({
					attachmentId,
					messageId
				}));
				return this.current(generation) ? result : {
					ok: false,
					error: "AWiki 已关闭"
				};
			}
			/** Clear Host-owned local data and immediately remove every cached browser projection. */
			async clearLocalData(request) {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const result = await call(() => this.remote.clearLocalData(request));
				if (!result.ok) return result;
				this.close();
				this.config = null;
				this.conversationsCursor = void 0;
				this.historyCursor = void 0;
				this.unreadAtOpen.clear();
				this.summaryBaselines.clear();
				this.publish({
					...INITIAL_VIEW,
					status: "ready"
				});
				return result;
			}
			/** Stop timers, invalidate work, and drop subscribers during HMR unload. */
			dispose() {
				this.disposed = true;
				this.close();
				this.listeners.clear();
			}
			async refreshConversations(generation) {
				const result = await call(() => this.remote.listConversations({}));
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				if (!result.ok) return this.fail(result.error);
				const firstPage = this.view.conversations.length === 0;
				if (firstPage) this.conversationsCursor = result.value.nextCursor;
				const refreshed = result.value.items.map((incoming) => preserveDirectProfile(incoming, this.view.conversations.find((current) => current.id === incoming.id)));
				this.publish({
					...this.view,
					conversations: firstPage ? refreshed : appendUnique(refreshed, this.view.conversations, (value) => value.id),
					conversationsHasMore: firstPage ? result.value.hasMore && result.value.nextCursor !== void 0 : this.view.conversationsHasMore,
					error: null
				});
				return {
					ok: true,
					value: void 0
				};
			}
			async loadHistory(older) {
				const conversationId = this.view.selectedConversationId;
				if (conversationId === null) return this.fail("请先选择会话");
				const generation = this.generation;
				const request = {
					conversationId,
					...older && this.historyCursor !== void 0 ? { cursor: this.historyCursor } : {}
				};
				const result = await this.withPending(older ? "加载更早消息" : "加载消息", () => call(() => this.remote.getHistory(request)));
				if (!result.ok) return result;
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				if (this.view.selectedConversationId !== conversationId) return {
					ok: true,
					value: void 0
				};
				this.historyCursor = result.value.nextCursor;
				const messages = older ? prependUnique(this.view.messages, result.value.items, (value) => value.id) : result.value.items;
				this.publish({
					...this.view,
					messages,
					historyHasMore: result.value.hasMore && result.value.nextCursor !== void 0,
					summaries: older ? this.view.summaries : this.staleSummaries(conversationId, result.value.items)
				});
				return {
					ok: true,
					value: void 0
				};
			}
			async poll(generation) {
				if (this.polling || !this.current(generation) || this.view.identity === null) return;
				this.polling = true;
				try {
					await this.refreshConversations(generation);
					const selected = this.view.selectedConversationId;
					if (selected === null || !this.current(generation)) return;
					const result = await call(() => this.remote.getHistory({ conversationId: selected }));
					if (!this.current(generation) || !result.ok || this.view.selectedConversationId !== selected) return;
					const existingIds = new Set(this.view.messages.map((message) => message.id));
					const incoming = result.value.items.filter((message) => !existingIds.has(message.id));
					const messages = appendUnique(this.view.messages, result.value.items, (value) => value.id);
					const added = messages.length - this.view.messages.length;
					if (added > 0 && (this.unreadAtOpen.get(selected) ?? 0) > 0) this.unreadAtOpen.set(selected, (this.unreadAtOpen.get(selected) ?? 0) + added);
					this.publish({
						...this.view,
						messages,
						summaries: this.staleSummaries(selected, incoming)
					});
				} finally {
					this.polling = false;
				}
			}
			async withPending(label, operation) {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				const generation = this.generation;
				this.publish({
					...this.view,
					pending: label,
					error: null
				});
				const result = await operation();
				if (!this.current(generation)) return result;
				this.publish({
					...this.view,
					pending: null,
					error: result.ok ? null : result.error
				});
				return result;
			}
			appendMessage(message) {
				const isNew = !this.view.messages.some((current) => current.id === message.id);
				const messages = appendUnique(this.view.messages, [message], (value) => value.id);
				if ((this.unreadAtOpen.get(message.conversationId) ?? 0) > 0 && messages.length > this.view.messages.length) this.unreadAtOpen.set(message.conversationId, (this.unreadAtOpen.get(message.conversationId) ?? 0) + 1);
				this.publish({
					...this.view,
					messages,
					summaries: isNew ? this.markSummaryStale(message.conversationId) : this.view.summaries,
					error: null
				});
			}
			setSummary(conversationId, summary) {
				this.publish({
					...this.view,
					summaries: Object.freeze({
						...this.view.summaries,
						[conversationId]: Object.freeze(summary)
					})
				});
			}
			staleSummaries(conversationId, messages) {
				const summary = this.view.summaries[conversationId];
				if (summary?.status !== "success" || summary.result === void 0 || summary.stale) return this.view.summaries;
				const baseline = this.summaryBaselines.get(conversationId) ?? {
					latestSentAt: summary.result.range.endedAt,
					messageIdsAtLatest: /* @__PURE__ */ new Set([summary.result.range.lastMessageId])
				};
				if (!messages.some((message) => message.sentAt > baseline.latestSentAt || message.sentAt === baseline.latestSentAt && !baseline.messageIdsAtLatest.has(message.id))) return this.view.summaries;
				return this.markSummaryStale(conversationId);
			}
			markSummaryStale(conversationId) {
				const summary = this.view.summaries[conversationId];
				if (summary?.status !== "success" || summary.stale) return this.view.summaries;
				return Object.freeze({
					...this.view.summaries,
					[conversationId]: Object.freeze({
						...summary,
						stale: true
					})
				});
			}
			selectedConversation() {
				const selected = this.view.selectedConversationId;
				return selected === null ? void 0 : this.view.conversations.find((value) => value.id === selected);
			}
			fail(error) {
				this.publish({
					...this.view,
					status: this.view.status === "loading" ? "error" : this.view.status,
					pending: null,
					error
				});
				return {
					ok: false,
					error
				};
			}
			current(generation) {
				return !this.disposed && generation === this.generation;
			}
			publish(view) {
				/* v8 ignore next -- every asynchronous and public mutation path checks disposal before publishing. */
				if (this.disposed) return;
				this.view = Object.freeze(view);
				for (const listener of [...this.listeners]) listener();
			}
		};
		//#endregion
		//#region lib/types/client/assets.js
		/** AWiki Me macOS AppIcon 128px, source SHA-256 289224256ee8144d80ee863e83c208fab732aba2ca44117af157eff3d9b53f5d. */
		const AWIKI_ME_APP_ICON_DATA_URL = [
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAATC0lEQVR42u2dCXBU15WG205Qt5beJIM9BI/BhOAlGbvGnlTiZOKM",
			"GSoVqmZSDjjlxIkTb+PxTJIpT+EdEKuFhBFIgJCQkIQQi5AwAgxmM8gKm4ExmwVmMyAwZkfq7rf3e/+c291yt1oLArqlfvL9q061",
			"KFut1v3OOffce8+7sli4uLi4uLi4uLi4uLi4uLi4YigADrKHyUaRZZI1gCtaDaGxGRUaK4fZod9J9ixZNdkpMj9n3GX5Q2NWHRrD",
			"O80EfihZHtk5zjFmOhca06GJDD6DLJusifOKm5pCY5yRaPCHkx3ifLpNbKyHJwr80WQKZ9LtYmM+uifB306Wyzn0uBiD23vCATj8",
			"BHKCnkj7XIml0d0Ffxif8xO2JhgWb/jpZEf4WCesGJv0eDpADh/jhFdOvOAPIfPw8U14MUZD4uEA+XxsTaP8WMPvS3aBj6tpxFj1",
			"jaUDPMvH1HR6NpYOUMPH03SqiRV8O1kjH0/TiTGzx8IBWHcKb+Ywnxizh2PhACP5WMZwjaYAV0QDhtEtP25kLBwgk2O7dR2+rOOF",
			"tQoeKJEweJ6En1dJKDqgQdXj+mMzY+EAvIEzBvAHF0qwZAtw5InoXyiizwwBt88U8MpmBf74ZYOGWDgA1y2KRT6DP6xKxtazOs54",
			"DJQc1NBvngDbHB82NMavxOIO0MO6KhmBlH9PkRgAH6lJu1RYZvnw0haZO0CvTf9X9EDa/+XytpC3nPXjWwU+PPmhxB2gt+rIVR3p",
			"s0XcXy7imtw6A8zYTxmgwIvneAbovfKqwD8sFPHtPAG/Xy/j6DUdl2haWHJMw4AKAUnFPtSe1LgD9GZVHtbQv0REcoGA/mUCvltJ",
			"xd88H24r8uKlehlaHPcEuAMkiF7bpsA61wdniQ+pZA9Vi5h+QIUc5z1W7gAJoLM+A0Mp6u2U7m1kL34sB6aG7hB3gB6WpgO/3SDD",
			"VuSDu9SHlPk+rDvTfUcr3AF6WGM+odQfgu8o82HgEgHnRYM7wDdBk/eoSKFiz0Xw3eWU/ku9eOojqVs/A3eAHpCH5vf/onneFgHf",
			"vcAHa5kXi09o3AF6s3Zf0PH4CimQ9iPhpy3w4gcrBDQpBneA3qjTHgNv71DQj9b5LO27y8Lw3Qt9SCr3YmZD9z9QxR0gzjp8Vcdb",
			"2xUMrBBgLaR1/vwI+BUMvhdpZA+s8OGKbHAH6A26IBioPubHU2tl3DVfCGzwOIqDlX4kfBeBdy3ywkav5cfVHvms3AFiIJHqtr00",
			"t8/dr+F3H8oYUi4ieY4Q2Np1Fgtwz4+AvyAM303wrfT65BYxnk0f3AFiKcUPnPMaqGvUkb1Tw29XK3hkoYQMgm3NJ+izBTgKCfo8",
			"suvATyMbtNyH4x69x34f7gCd6LJoYM85HdWH/MjapuGZWgU/LJcwsECCfYYI63SK9JkC7LMEuMgB3Ax8UQh+iS8MvzwM310ZTPsO",
			"MucSL2obtR79HbkDILgde+qagS1f6MjboeG5FSqeKFfwvVky3DkSkqfSsm0qwc4RkUbQnTNFuPPJZpNRqnffIHznYi9SFnkw+/Oe",
			"v0bhG+kADHjDeQOlu/14pVbDT4sUfCdHRtokAj1Rgo1eU9+V4MiW4JomwT2djCLezcDnRcGf2zX4rspg2mfwkyo9mHhAToix+MY4",
			"AIO+87SB8Rs0/GwurccnybCNJRtH4CfKcE4hyFlkFO1uAu9m4N9j8MXW8Gd1AL84An7UGr8FvoPgJy/2IHO/DN0Ad4Du0BlK7Xn1",
			"fvysQIGbYNveJuD06ibo6eQEbgb+3Qj4ORHwc9uDH0r5LfDnRcAv7QD+4mDB517qxZwjakKNT691gNNXDbz5gYZBkxXY3iToYwh2",
			"JkGfQMbgT2bw5a7Bz79B+BVh+GzOt9Lrd1f48OGX7Rd8BneA2MlHdVVunR/3MvCvU2on8OkM/PgwfHc0/OxYw/cGCr40smQq9kbW",
			"iTjhbX+pt/ILP9ae9HMHiIV2njLw03yVwCtwvqMgfVxb+MHIl9qHz+b7Fvh5EfDnRMAv6nyNz+A7CHxShRf31fqw8ITaYYTXf+lH",
			"vxIB609zB7hlzaSo7zdWQeqbBH5sO/AntUR+CP7UaPjSDcD3tQvfTtCTFngxsMaHKQcUnJc6Tu51Z/0YUC6gb6mA016DO8Ct7My9",
			"ukJD8msKXG+3A3/ideC/FxH57S3zrrPGd5Ill9E8X+7F/e/7MGm/glO+znf2VlHK70/wk4p8+EmtGFihcAe4CUlUU72wRINtNFX4",
			"LOXTsu5r+BPiAT+Y9l2h3r2k+V70q/RhxAYR5cdUXLrOaR4DPW2vChd9r53MSt//Pzt6dj/AtA7ABvPlKg1Wgp8+5jrw372JNX4E",
			"fBfBt8/zBTp4WNduP0r3w9aIyD2o4LOrXQvfE80GRq2XYKX3cJYFp4xkyhorT/Ot4JvSmLV+2F6TW8MfHxv4bF/fTmZjNpcintL+",
			"g0sF/GmLjIqjGj5v0rt8gYNHMQKPeA1iD3uUtOwPeGEnu6+HegBM7wBLPtWR8npU2o+G39kaPwq+k9J+ap4AK1nyLCHwWPYjS0X8",
			"YaOMeQ0q9lzUb7hV6woVgEX0vY/WiLBS1rCXhbeE2d5A0kIP/ndPz28Hm84BzjYZGJqlwPG23LVlXjsbPC6y1OnB07zUmQLunifi",
			"iWoJr9UrWMYinNK6dBOZmWWF/Zf0QKv3A0uCj3ellYaXhwy8a4kXzqVeZFR7ceCazh3gRvXn5VT0vdEZ/PYj30XwU3II+jQRd1Gq",
			"f2KpjMxtKtZTRd7oMW56N449wbPrvI6pe1QMq5VwB+sAoureXhpO94GoX0xG4F1VFP1LPfiPXRISQaZyAHaYk862dMd2fY1vJ0ua",
			"KqIfpfp/q5ZRuFfDkas3dwkTu6/nNBVzmxv9yP9UxTMfynhokRhYIbC2r9TiUKcvgXe1HP8uDkY9A++q9sBONmCVF8e9OneAG9Uz",
			"i2i9/1ZHa/zWW7vsKNeaJeL+Qgnj6lUcvNj1AWcrDHZT14ELOqoO+TGJMsVzaxU8tkjCgCIRabMJ+Kxgy5edrRJKIo5/W84BQuk+",
			"EPXLyGo8cC33IKmmGTOOJs6fUzCNAxw4Z6BvZuhAp5MNHheZjb4eNEvC1O0aLgqdhzr7r1/SFLDphI7cHRqeX6XisXIZQ+ZKyKAi",
			"0faeiCSqFWwzBKQRdGdB1KZQxG5gS5Pn1+l+WTDqGXjXCg+sy5sxYpsASQd3gBvVm2tpzf9WBxs8ofneTq92ivwXP1Bwsqlj8E00",
			"/W44puON9RqGlSkYOENGGjmNld7LRtNFGkF3sGIxL2o7uDBqN7CsdcNHdLoPRP37ZLUepNQ24/6NXpwUEoi+WRyAVeSP5iuwj+t4",
			"jZ9CX99LUV9zuP2DFdaAsfWUjlfXaPh+frj7J5WgO7OjloeR+wIFUU0f86PTvbf9dP9+MOpdKz1IXdmM76zzYMfVxLtQ1RQOsP20",
			"Dtf4iCaOKPg2gvjjUhkNF9tGvZ8CbuUhHb8oVeGk77eOpywxJWp5OD3q+Dey46co6ti3vCXd+zpN9yzqXauakUJ293oPtlzSkIgy",
			"hQPM+Jsf1rHtb/Aw+COWKO3O9fVf6BhRpiKVnCeFpg7Xu+3sCOZGnfvPEVuf+Yf2/9tN90sj0v3ycLp3rSJb3Qzrqibcv9mD7VcT",
			"9yplUzjAn2pUJGdKbTZ4kunrf61UAhV7pGQKtgkfaYGMkTxeCtcJkYdAudHpXmg/3YcaPVwRXb1fz/PLPG3SPQNv/6AZSaub8Mud",
			"PnyRYHO+6RyALcl+UqQgbWLrJo40en2wUA6syyPVSMXfiHIF1nE0t7OpIuvW0727vXRfE5HuVwbTvTMEvv+GZuQcl6naN5DoSngH",
			"uEypfQhV6Y6IKGZFWwZFcd2p1tF1/IqBfypQYMuM2hCKbPiYGdXsMfcmqvtW6Z4inqI+idJ9xrpmvLBPxCGveW7PT3gHOHnNQP9p",
			"NH9HpHDruyIm1Lfurj1N/9+jBD95QhfSffSyLirdRx7ahNN96+reTvBttcF5/p6NHvz3QRF7m833ZxMS3gEOUWXfNye4wcOApmaL",
			"+HG5DG/EZlqzjMB63jaxg3Qf2ehR0HG6d0VU9+wBDgelezvBT6W5Prk6uIuX9D5FPEX9kA0ePL1HQHmjgrNROzufXdFR1qDB4A4Q",
			"gx3A8wYymAOEopkd6Lx/pHWk/WWNiqSJkelebJXuXRT1Tiry0ijyUwLn/L7As/qsJYvdxGml6LeVeZFcQbArg8/s3VHtxYAVXgxd",
			"48UPN/rw71sFvLpfQskpBduu+HGpg+PhD076cd9CEVvP+XkGiIUOXjAC8z17RCuV4D9eKUONGNs1R/XALp4rKt3bZwa3b215wXR/",
			"b5mIHy2T8Ks1El7cIuONnQqy9iqY06Ci/JiGZSc1rGrUsOkrP3Ze9uNQs44zVMFfUw0oXSjkz/kMvPo3BX3IuV75WOZTQKx05LKB",
			"frkEmO3HkwMU7wtvqLBnANgGUGp2MOpdBD6FHCCFXh8sl/DSRiWQivdc0HGBlorx+Osb7Ch52qcqvlcp4FtzfRi0SMAZn8EdIFZi",
			"d+jfPUsKPJU7uEhqteGz4IA/8NQui/qU6cGoH7FcRs1Rf5ubt2Mp1ub18Vk//lynYOCC4NUvafODzR9VJzSYSQnvAM0U5Q8WS+gz",
			"TcQf14QrPxbNTyySA6d1NnKAf6mSsY7m31hjZ7d/fOk1sONc8AaQ5zfKeGixCAfVD+x2T8f8YAHZp9SLN3bLMJsS3gFY48Zwgnvb",
			"NAEVDeHo2kVA0gh8BlX2M/9Pg9RJzeWRg88K7vvSQN0JHasP66ii7LFgrx/Fe/yYu9uP/E805GzXMJ6Wl69uUvGHDxT8olrGPy6U",
			"cE+JGDgGts4ONonaiyOueKsI3vD1u4+lTj8Dd4Bb0F8/UgK9e4cuhyfxidvVAPx1HTxXd5iKx6kf+TGiWMUP3lMwYLKMjAkyHOxc",
			"gIztF7Blo3Vy8BiYNY9Ys4MtY9bQ+X9KvgA7rRychcHWcHdU4wc7/0+q8OCpOhFezYAZZQoHmHdAw5BSET41vD38x3UKtpxpW9Vt",
			"OqLjyVIN/cYFnwpOfYegZ8pwEXz3JLn1uUCHB0KdbA1HHAGzzt6n60V4TArfNA6w6ysdv1oZnl8FcoRDV1rDP3rRwNMLVDjfoggn",
			"c4+L6ByaLHd8INQR+JaTwKiIZxc92NkVL0s8eO1TGbIOU8sUDtBEFX3W7o4vVlhLc/rgKcGIvyHweR2Bjz77D4Jn28LWxR78/Qov",
			"Kk+q6A0yTUtYYwdP0C7bp+MOgm4f0wH4qV0AX9g++MhunxQCn7LUg2e2izjm0dFbZOqHQzcd1dGXoDvGRV780AH4GTcBnqV6MhuB",
			"/+eNAlac0dDbZFoHOMOeEKLqPi2zk4iffp1TwKiu3pZzfzbHWxd5YK/y4OebBFQ1qqZc4vVqB3i+Rg00fQRaxLoS8Z2Ad4UubLZS",
			"VZ9M8AfX+vDyLgkfnffDxAV+79kI2nJcR9ZmP6bW+QMNohvp305av3/d43cDEc+ezXcQ/NSy4B9osC7wIp3m+EfWCHhhh4RlpzVc",
			"lHs5dbM4wEUq/J6uVJFKBZ7lTQmWtwkygb+bYDuzOj73d84SAk/vsAub2dFvUqEv8Lweu9QhnZZzg5cJeHytgP/cIaP4qIq9tKQU",
			"/fhGKmEdgDV2/rpCxW20pv+7LBkjF6t4comCfuxYOKttxLNHvK3s3l4CP6hMxGPVEn69VsLLdTLG7VIwt0HFaorufQT7omRAN8CV",
			"yA5Qc1BHnzES7p0uY3tjeNlVT1PAPbMpA+SGI56d+Q8oFvHXOgUbG/34SjB69N4d7gAx0Eu1KizkANlb2y693qmnAjBXgGs2wc8X",
			"8Js1cuAvc3D1IgcYVaXgtgkiaj9vOzkX7NOQRFHvpLX8lN1qj/2xBe4AcXSA0RspA0wS8ZcNbbdcR1LEW/J9eHGzzAn2Vgeop3k/",
			"leZ5J83zUz5RcbLZwLFrOl7fpiC1KNjQufqUnxNMAAdoiNeHG7tVRR+q7L+d58NdJQL6zhdgKfAihdbzY3YrPPXfuhpi4QCZcdsE",
			"Ipv3mYYfVYsYtFDA96sEPLNZwoazPPJjpMxYOMDIeH9KtqS7RGt3n8ZDPsYaGQsHeJiMh6T5xJg9HAsHsJM18vE0nRgzuyUWYht3",
			"fDxNpxpLrERv9iwfT9Pp2Vg6QF+yC3xMTSPGqq8llqI3zOfjahrlW2ItetMhZB4+tgkvxmiIJR6iN87h45vwyrHES/Tm6WRH+Bgn",
			"rBibdEs8RT9gGJnCxzrhxJgMs3SH6AeN5uOdcBpt6U7RD8zlY54wyrV0t+iH3s6dIDHgMxaWnlJoOuA1Qc/M+aMtiSD6IMPJDnEm",
			"3SY21sMtiST6QBlk2WRNnE/c1BQa4wxLooo+3FCyPLJznFfMdC40pkMtZhF92DsRPEWsJjsF3lRyI/KHxqw6NIZ3Wsws+gUcCHYW",
			"jUKwx7CBM26jhtDYjAqNlcPCxcXFxcXFxcXFxcXFxcXFFUP9P5tFzYq0T40aAAAAAElFTkSuQmCC"
		].join("");
		//#endregion
		//#region lib/types/client/file.js
		/** Browser attachment byte conversion and download helpers. */
		/** Decode Host-verified Base64 bytes for browser-only Blob use. */
		function downloadedBytes(value) {
			const binary = atob(value.bytesBase64);
			return Uint8Array.from(binary, (character) => character.charCodeAt(0));
		}
		/**
		* Read one browser file as base64 without retaining the bytes after settlement.
		* @param file - selected browser file.
		* @returns base64 payload without a data-URL prefix.
		*/
		async function fileToBase64(file) {
			const bytes = new Uint8Array(await file.arrayBuffer());
			let binary = "";
			const chunkSize = 32768;
			for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
			return btoa(binary);
		}
		/**
		* Create a temporary browser URL for verified attachment bytes.
		* @param value - attachment metadata and base64 bytes returned by the Host.
		* @returns object URL that the caller must revoke after use.
		*/
		function createAttachmentObjectUrl(value) {
			return URL.createObjectURL(new Blob([downloadedBytes(value)], { type: value.attachment.mimeType }));
		}
		/**
		* Offer verified Host-returned bytes as a browser download.
		* @param value - attachment metadata and base64 bytes returned by the Host.
		*/
		function saveDownloadedAttachment(value) {
			const url = createAttachmentObjectUrl(value);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = value.attachment.fileName;
			anchor.click();
			URL.revokeObjectURL(url);
		}
		//#endregion
		//#region \0dsh-awiki-css:AwikiOverlay.module.css.mjs
		const css$2 = ".EtEeYG_trigger{z-index:2;border:1px solid var(--dsw-alias-border-l2);width:48px;height:48px;color:var(--dsw-alias-brand-primary);box-shadow:var(--dsw-shadow-lv2);cursor:grab;font:inherit;touch-action:none;user-select:none;background:#fff;border-radius:50%;place-items:center;padding:0;display:grid;position:fixed;overflow:visible}.EtEeYG_trigger:hover{box-shadow:var(--dsw-shadow-lv3);background:#fff}.EtEeYG_trigger:active,.EtEeYG_trigger[data-dragging]{cursor:grabbing}.EtEeYG_launcherIcon{object-fit:cover;pointer-events:none;border-radius:50%;width:100%;height:100%;display:block}.EtEeYG_unreadBadge{border:2px solid var(--dsw-alias-bg-base);background:var(--dsw-alias-state-error-primary);color:#fff;box-sizing:border-box;pointer-events:none;border-radius:10px;place-items:center;min-width:20px;height:20px;padding:0 5px;font-size:11px;font-weight:600;line-height:16px;display:grid;position:absolute;top:-5px;right:-5px}.EtEeYG_trigger:focus-visible,.EtEeYG_drawer button:focus-visible,.EtEeYG_drawer input:focus-visible,.EtEeYG_drawer textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.EtEeYG_drawer{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);z-index:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:min(720px,100vw - 80px);min-width:min(360px,100vw - 80px);height:min(720px,100vh - 16px);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv3);border-radius:16px;flex-direction:column;display:flex;position:fixed;overflow:hidden}.EtEeYG_drawerHeader{border-bottom:1px solid var(--dsw-alias-border-l1);cursor:grab;touch-action:none;user-select:none;flex:none;align-items:center;gap:8px;height:58px;padding:0 14px 0 18px;display:flex}.EtEeYG_drawerHeader[data-dragging]{cursor:grabbing}.EtEeYG_drawerHeader>div{flex:1;align-items:center;gap:8px;display:flex}.EtEeYG_drawerHeader h2{margin:0;font-size:16px;line-height:24px}.EtEeYG_drawerHeader button,.EtEeYG_back{cursor:pointer;width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:9px;place-items:center;padding:0;display:grid}.EtEeYG_drawerHeader button:hover,.EtEeYG_back:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.EtEeYG_centerState,.EtEeYG_registration,.EtEeYG_threadEmpty{text-align:center;color:var(--dsw-alias-label-secondary);flex-direction:column;flex:1;justify-content:center;align-items:center;gap:14px;padding:32px;display:flex}.EtEeYG_centerState p{overflow-wrap:anywhere;max-width:420px;margin:0}.EtEeYG_registration{box-sizing:border-box;align-items:stretch;width:min(360px,100%);margin:0 auto}.EtEeYG_registration h3{text-align:center;color:var(--dsw-alias-label-primary);margin:0}.EtEeYG_registration>p{margin:0;font-size:13px;line-height:20px}.EtEeYG_registrationIcon{background:var(--dsw-alias-interactive-bg-active);width:48px;height:48px;color:var(--dsw-alias-brand-primary);border-radius:50%;align-self:center;place-items:center;display:grid}.EtEeYG_registration label{text-align:left;color:var(--dsw-alias-label-secondary);gap:6px;font-size:13px;line-height:20px;display:grid}.EtEeYG_registration input,.EtEeYG_fileDraft input,.EtEeYG_composeRow textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:10px}.EtEeYG_registration input{height:40px;padding:0 12px}.EtEeYG_primary,.EtEeYG_more,.EtEeYG_fileDraft button{background:var(--dsw-alias-button-primary-fill);min-height:36px;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;font:inherit;border:0;border-radius:10px;padding:0 14px}.EtEeYG_primary:hover,.EtEeYG_fileDraft button:hover{background:var(--dsw-alias-button-primary-hover)}.EtEeYG_primary:disabled,.EtEeYG_fileDraft button:disabled{opacity:.5;cursor:default}.EtEeYG_secondary{border:1px solid var(--dsw-alias-border-l2);min-height:36px;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;background:0 0;border-radius:10px;padding:0 14px}.EtEeYG_secondary:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_composeBackdrop{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 72%, transparent);place-items:center;padding:24px;display:grid;position:absolute;inset:58px 0 0}.EtEeYG_composeCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:min(360px,100%);box-shadow:var(--dsw-shadow-lv3);border-radius:14px;gap:12px;padding:20px;display:grid}.EtEeYG_composeCard h3{margin:0;font-size:16px;line-height:24px}.EtEeYG_composeCard p{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}.EtEeYG_composeCard label{color:var(--dsw-alias-label-secondary);gap:6px;font-size:13px;line-height:20px;display:grid}.EtEeYG_composeCard input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:40px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:10px;padding:0 12px}.EtEeYG_composeActions{justify-content:flex-end;gap:8px;display:flex}.EtEeYG_logoutWarning{color:var(--dsw-alias-label-secondary);gap:8px;font-size:13px;line-height:20px;display:grid}.EtEeYG_logoutWarning p{margin:0}.EtEeYG_logoutConfirm{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.EtEeYG_linkButton{color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:0}.EtEeYG_notice{color:var(--dsw-alias-state-success-primary);text-align:center}.EtEeYG_chat{flex:1;grid-template-columns:240px minmax(0,1fr);min-height:0;display:grid}.EtEeYG_roster{border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);flex-direction:column;min-width:0;display:flex}.EtEeYG_identityCard{background:var(--dsw-alias-bg-layer-3);border-radius:12px;flex-direction:column;gap:2px;margin:14px;padding:12px;display:flex}.EtEeYG_identityNameRow{align-items:center;min-width:0;min-height:24px;display:flex}.EtEeYG_identityName{min-width:0;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:text;background:0 0;border:0;flex:1;padding:0;font-size:16px;font-weight:600;line-height:24px;overflow:hidden}.EtEeYG_identityName:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:4px}.EtEeYG_identityEdit{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;visibility:hidden;background:0 0;border:0;border-radius:6px;flex:none;place-items:center;margin-left:4px;padding:0;transition:opacity .12s;display:grid}.EtEeYG_identityNameRow:hover .EtEeYG_identityEdit,.EtEeYG_identityNameRow:focus-within .EtEeYG_identityEdit{opacity:1;visibility:visible}.EtEeYG_identityEdit:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.EtEeYG_identityEditor{flex:1;align-items:center;gap:4px;min-width:0;display:flex}.EtEeYG_identityEditor input{border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);min-width:0;height:28px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:7px;outline:none;flex:1;padding:0 8px;font-size:13px}.EtEeYG_identityEditor button{width:26px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;place-items:center;padding:0;display:grid}.EtEeYG_identityEditor button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.EtEeYG_identityEditor button:disabled,.EtEeYG_identityName:disabled{cursor:default;opacity:.5}.EtEeYG_identityEdit:disabled{cursor:default}.EtEeYG_identityHandle{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}.EtEeYG_identityStatus{color:var(--dsw-alias-state-success-primary);margin-top:4px;font-size:12px;line-height:18px}.EtEeYG_identityError{color:var(--dsw-alias-state-error-primary);margin-top:4px;font-size:11px;line-height:16px}.EtEeYG_identityCard i{background:var(--dsw-alias-state-success-primary);border-radius:50%;width:6px;height:6px;margin-right:5px;display:inline-block}.EtEeYG_rosterTitle{color:var(--dsw-alias-label-tertiary);padding:4px 16px 8px;font-size:12px;line-height:18px}.EtEeYG_conversationList{flex:1;min-height:0;padding:0 8px;overflow:auto}.EtEeYG_conversationRow{width:100%;color:inherit;cursor:pointer;text-align:left;background:0 0;border:0;border-radius:10px;align-items:center;gap:10px;padding:9px;display:flex}.EtEeYG_conversationRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_conversationRow[data-active]{background:var(--dsw-alias-interactive-bg-active)}.EtEeYG_avatar{background:var(--dsw-alias-interactive-bg-active);width:34px;height:34px;color:var(--dsw-alias-brand-primary);border-radius:50%;flex:none;place-items:center;font-size:12px;line-height:18px;display:grid;position:relative;overflow:visible}.EtEeYG_conversationUnreadBadge{border:2px solid var(--dsw-alias-bg-layer-2);background:var(--dsw-alias-state-error-primary);min-width:18px;height:18px;color:var(--dsw-alias-label-primary-inverted);box-sizing:border-box;pointer-events:none;border-radius:9px;place-items:center;padding:0 4px;font-size:10px;font-weight:600;line-height:14px;display:grid;position:absolute;top:-6px;right:-7px}.EtEeYG_conversationText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.EtEeYG_conversationHeader{align-items:center;gap:8px;min-width:0;display:flex}.EtEeYG_conversationHeader strong{flex:1;min-width:0}.EtEeYG_conversationTime{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;font-weight:400;line-height:16px}.EtEeYG_conversationText strong,.EtEeYG_conversationText small{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.EtEeYG_conversationText strong{font-size:13px;line-height:20px}.EtEeYG_conversationText small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.EtEeYG_more{background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-secondary);margin:8px}.EtEeYG_more:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_thread{flex-direction:column;min-width:0;min-height:0;display:flex}.EtEeYG_threadHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:8px;height:56px;padding:0 14px;display:flex}.EtEeYG_threadTitle{flex-direction:column;flex:1;min-width:0;display:flex}.EtEeYG_threadTitle strong,.EtEeYG_threadTitle small{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.EtEeYG_threadHeader small{color:var(--dsw-alias-label-tertiary)}.EtEeYG_summaryTrigger{min-height:30px;color:var(--dsw-alias-brand-primary);cursor:pointer;font:inherit;background:0 0;border:0;border-radius:8px;flex:none;align-items:center;gap:5px;padding:0 8px;font-size:12px;line-height:18px;display:flex}.EtEeYG_summaryTrigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_summaryTrigger:disabled{cursor:default;opacity:.7}.EtEeYG_summaryTrigger[aria-expanded=true]>svg:last-child{transform:rotate(180deg)}.EtEeYG_summaryTrigger>svg:first-child{flex:none}.EtEeYG_summaryPanel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-height:0;max-height:min(220px,33%);color:var(--dsw-alias-label-primary);border-radius:10px;flex:0 33%;margin:8px 10px 0;overflow:hidden}.EtEeYG_summaryPanel[data-collapsed]{flex-basis:auto;max-height:42px}.EtEeYG_summaryHeader{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:9px;min-height:38px;padding:0 8px 0 12px;display:flex}.EtEeYG_summaryHeader>span{color:var(--dsw-alias-brand-primary);align-items:center;gap:6px;display:flex}.EtEeYG_summaryHeader>span strong{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}.EtEeYG_summaryHeader>small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;line-height:16px;overflow:hidden}.EtEeYG_summaryHeader>button{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:7px;flex:none;place-items:center;padding:0;display:grid}.EtEeYG_summaryHeader>button:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_summaryCollapsed{width:100%;min-height:40px;color:inherit;cursor:pointer;text-align:left;background:0 0;border:0;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:0 10px 0 12px;display:grid}.EtEeYG_summaryCollapsed:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_summaryCollapsed>span{color:var(--dsw-alias-brand-primary);align-items:center;gap:6px;font-size:12px;font-weight:600;display:flex}.EtEeYG_summaryCollapsed>small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.EtEeYG_summaryCollapsed>em{color:var(--dsw-alias-state-warn-label);white-space:nowrap;font-size:11px;font-style:normal}.EtEeYG_summaryLoading{min-height:88px;color:var(--dsw-alias-brand-primary);justify-content:center;align-items:center;gap:10px;padding:16px;display:flex}.EtEeYG_summaryLoading>svg,.EtEeYG_summaryTrigger:disabled>svg:first-child{animation:1s linear infinite EtEeYG_summary-spin}.EtEeYG_summaryLoading>span{flex-direction:column;gap:2px;display:flex}.EtEeYG_summaryLoading strong{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}.EtEeYG_summaryLoading small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.EtEeYG_summaryError{min-height:58px;color:var(--dsw-alias-state-error-primary);justify-content:space-between;align-items:center;gap:12px;padding:12px;font-size:12px;line-height:18px;display:flex}.EtEeYG_summaryError>span{overflow-wrap:anywhere;min-width:0}.EtEeYG_summaryError button,.EtEeYG_summaryStale button{border:1px solid var(--dsw-alias-border-l2);min-height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;background:0 0;border-radius:7px;flex:none;align-items:center;gap:5px;padding:0 8px;font-size:11px;display:flex}.EtEeYG_summaryError button:hover,.EtEeYG_summaryStale button:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_summaryStale{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-state-warn-label);justify-content:space-between;align-items:center;gap:10px;padding:6px 10px;font-size:11px;line-height:16px;display:flex}.EtEeYG_summaryBody{gap:10px;max-height:118px;padding:10px 12px;display:grid;overflow:auto}.EtEeYG_summarySection h4{color:var(--dsw-alias-label-primary);align-items:center;gap:6px;margin:0 0 4px;font-size:12px;line-height:18px;display:flex}.EtEeYG_summarySection h4>svg{color:var(--dsw-alias-label-secondary);flex:none}.EtEeYG_summarySection ul{color:var(--dsw-alias-label-secondary);gap:2px;margin:0;padding-left:18px;font-size:11px;line-height:17px;display:grid}.EtEeYG_summarySection li{overflow-wrap:anywhere;padding-left:1px}.EtEeYG_summarySection p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:17px}.EtEeYG_summarySection b{color:var(--dsw-alias-label-primary);font-weight:500}.EtEeYG_summaryActions{border-top:1px solid var(--dsw-alias-border-l1);grid-template-columns:auto 1fr auto auto;align-items:center;gap:4px;min-height:34px;padding:0 8px;display:grid}.EtEeYG_summaryActions button{min-height:26px;color:var(--dsw-alias-brand-primary);cursor:pointer;font:inherit;background:0 0;border:0;border-radius:6px;align-items:center;gap:5px;padding:0 6px;font-size:11px;line-height:16px;display:flex}.EtEeYG_summaryActions button:hover{background:var(--dsw-alias-interactive-bg-hover)}.EtEeYG_summaryPrivacy{border-top:1px solid var(--dsw-alias-border-l1);min-height:28px;color:var(--dsw-alias-label-tertiary);align-items:center;gap:6px;padding:0 10px;font-size:10px;line-height:15px;display:flex}.EtEeYG_summaryPrivacy svg{flex:none}.EtEeYG_summaryCopyError{color:var(--dsw-alias-state-error-primary);padding:4px 10px;font-size:10px;line-height:15px}@keyframes EtEeYG_summary-spin{to{transform:rotate(360deg)}}.EtEeYG_back{display:none}.EtEeYG_historyShell{flex:1;min-height:0;position:relative}.EtEeYG_history{box-sizing:border-box;flex-direction:column;gap:12px;height:100%;min-height:0;padding:16px;display:flex;overflow:auto}.EtEeYG_historyLoading{color:var(--dsw-alias-label-tertiary);align-items:center;gap:8px;margin:auto;font-size:12px;line-height:18px;display:flex}.EtEeYG_historyLoading>svg{color:var(--dsw-alias-brand-primary);animation:1s linear infinite EtEeYG_summary-spin}.EtEeYG_latestMessages{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-floating-fill);min-width:30px;min-height:30px;color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv2);cursor:pointer;font:inherit;border-radius:16px;justify-content:center;align-items:center;gap:5px;padding:0 9px;font-size:11px;line-height:16px;display:flex;position:absolute;bottom:12px;left:50%;transform:translate(-50%)}.EtEeYG_latestMessages:hover{background:var(--dsw-alias-button-floating-hover)}.EtEeYG_message{align-self:flex-start;max-width:min(78%,420px)}.EtEeYG_message[data-outgoing]{align-self:flex-end}.EtEeYG_messageMeta{color:var(--dsw-alias-label-tertiary);justify-content:space-between;gap:10px;margin-bottom:3px;font-size:11px;line-height:16px;display:flex}.EtEeYG_message p,.EtEeYG_attachment{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;border-radius:12px;margin:0;padding:9px 11px;line-height:20px}.EtEeYG_message[data-outgoing] p,.EtEeYG_message[data-outgoing] .EtEeYG_attachment{background:var(--dsw-alias-interactive-bg-active)}.EtEeYG_pendingMessage{grid-template-columns:auto minmax(0,1fr);align-self:flex-end;align-items:end;gap:7px;max-width:min(78%,420px);display:grid}.EtEeYG_pendingMessageSpinner{color:var(--dsw-alias-label-tertiary);margin-bottom:12px;animation:1s linear infinite EtEeYG_summary-spin}.EtEeYG_pendingMessageContent{opacity:.82;min-width:0}.EtEeYG_pendingMessageContent>p,.EtEeYG_pendingAttachment{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;border-radius:12px;margin:0;padding:9px 11px;line-height:20px}.EtEeYG_pendingAttachment{align-items:center;gap:9px;display:flex}.EtEeYG_pendingAttachment>svg{color:var(--dsw-alias-label-secondary);flex:none}.EtEeYG_pendingAttachment span{flex-direction:column;min-width:0;display:flex}.EtEeYG_pendingAttachment strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.EtEeYG_pendingAttachment small{color:var(--dsw-alias-label-tertiary)}.EtEeYG_pendingMessageContent>.EtEeYG_pendingCaption{color:var(--dsw-alias-label-secondary);background:0 0;border:0;margin-top:4px;padding:4px 8px;font-size:12px}.EtEeYG_attachment{cursor:pointer;font:inherit;text-align:left;align-items:center;gap:12px;display:flex}.EtEeYG_attachment span{flex-direction:column;min-width:0;display:flex}.EtEeYG_attachment strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.EtEeYG_attachment small{color:var(--dsw-alias-label-tertiary)}.EtEeYG_attachment:disabled{cursor:default}.EtEeYG_imageAttachment{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:280px;max-width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;text-align:left;border-radius:12px;margin:0;padding:0;display:block;overflow:hidden}.EtEeYG_imageAttachment img{background:var(--dsw-alias-bg-layer-1);object-fit:contain;width:100%;max-height:280px;display:block}.EtEeYG_imageAttachment span{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:0 10px;padding:7px 9px;display:grid}.EtEeYG_imageAttachment strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.EtEeYG_imageAttachment small{color:var(--dsw-alias-label-tertiary);grid-column:1}.EtEeYG_imageAttachment svg{grid-area:1/2/span 2}.EtEeYG_message .EtEeYG_caption{color:var(--dsw-alias-label-secondary);background:0 0;margin-top:4px;padding:4px 8px;font-size:12px}.EtEeYG_inlineError{color:var(--dsw-alias-state-error-primary);margin-top:4px;display:block}.EtEeYG_empty{color:var(--dsw-alias-label-tertiary);text-align:center;margin:auto;padding:20px}.EtEeYG_composer{border-top:1px solid var(--dsw-alias-border-l1);flex:none;gap:8px;padding:10px 14px 14px;display:grid}.EtEeYG_filePicker{border:1px solid var(--dsw-alias-border-l2);width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:50%;flex:none;place-items:center;padding:0;display:grid}.EtEeYG_filePicker:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.EtEeYG_filePicker:disabled{opacity:.45;cursor:default}.EtEeYG_fileInput{display:none}.EtEeYG_composeInput{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;gap:6px;min-width:0;padding:9px 10px 8px;display:grid}.EtEeYG_composeInput:focus-within{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.EtEeYG_composeInput textarea{resize:none;background:0 0;border:0;border-radius:0;outline:0;min-width:0;min-height:42px;padding:0}.EtEeYG_composeInput textarea:focus-visible{outline:0}.EtEeYG_composeActions{justify-content:space-between;align-items:center;min-height:32px;display:flex}.EtEeYG_filePreview{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;align-items:center;gap:8px;width:min(240px,100% - 8px);min-height:36px;padding:5px 28px 5px 8px;display:flex;position:relative}.EtEeYG_filePreview[data-image]{width:72px;height:72px;min-height:0;padding:0}.EtEeYG_filePreview img{object-fit:cover;border-radius:9px;width:72px;height:72px;display:block}.EtEeYG_filePreviewIcon{color:var(--dsw-alias-label-secondary);flex:none;place-items:center;display:grid}.EtEeYG_filePreviewName{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}.EtEeYG_removeFile{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-floating-fill);width:22px;height:22px;color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1);cursor:pointer;border-radius:50%;place-items:center;padding:0;display:grid;position:absolute;top:-7px;right:-7px}.EtEeYG_removeFile:hover{background:var(--dsw-alias-button-floating-hover)}.EtEeYG_send{background:var(--dsw-alias-button-primary-fill);width:32px;height:32px;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;border:0;border-radius:50%;flex:none;place-items:center;padding:0;display:grid}.EtEeYG_send:disabled{opacity:.45;cursor:default}.EtEeYG_error{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;flex:none;padding:8px 14px;font-size:12px;line-height:18px}.EtEeYG_pending{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);box-shadow:var(--dsw-shadow-lv2);border-radius:9px;padding:7px 10px;font-size:12px;line-height:18px;position:absolute;bottom:14px;right:14px}@media (width<=620px){.EtEeYG_trigger span{display:none}.EtEeYG_trigger{justify-content:center;width:36px;padding:0}.EtEeYG_drawer{width:calc(100vw - 56px);min-width:0}.EtEeYG_chat{grid-template-columns:1fr}.EtEeYG_thread{display:none}.EtEeYG_thread[data-visible]{display:flex}.EtEeYG_roster[data-hidden]{display:none}.EtEeYG_back{display:grid}.EtEeYG_summaryPanel{max-height:min(190px,33%);margin-left:8px;margin-right:8px}.EtEeYG_summaryTrigger>span{display:none}.EtEeYG_summaryTrigger{justify-content:center;width:30px;padding:0}.EtEeYG_summaryTrigger>svg:last-child{display:none}}@media (prefers-reduced-motion:reduce){.EtEeYG_drawer{scroll-behavior:auto}.EtEeYG_summaryLoading>svg,.EtEeYG_summaryTrigger:disabled>svg:first-child,.EtEeYG_historyLoading>svg,.EtEeYG_pendingMessageSpinner{animation:none}}";
		const tagId$2 = "@awiki/dsh-plugin/AwikiOverlay.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@awiki/dsh-plugin";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var _dsh_awiki_css_AwikiOverlay_module_css_default = {
			"attachment": "EtEeYG_attachment",
			"avatar": "EtEeYG_avatar",
			"back": "EtEeYG_back",
			"caption": "EtEeYG_caption",
			"centerState": "EtEeYG_centerState",
			"chat": "EtEeYG_chat",
			"composeActions": "EtEeYG_composeActions",
			"composeBackdrop": "EtEeYG_composeBackdrop",
			"composeCard": "EtEeYG_composeCard",
			"composeInput": "EtEeYG_composeInput",
			"composer": "EtEeYG_composer",
			"composeRow": "EtEeYG_composeRow",
			"conversationHeader": "EtEeYG_conversationHeader",
			"conversationList": "EtEeYG_conversationList",
			"conversationRow": "EtEeYG_conversationRow",
			"conversationText": "EtEeYG_conversationText",
			"conversationTime": "EtEeYG_conversationTime",
			"conversationUnreadBadge": "EtEeYG_conversationUnreadBadge",
			"drawer": "EtEeYG_drawer",
			"drawerHeader": "EtEeYG_drawerHeader",
			"empty": "EtEeYG_empty",
			"error": "EtEeYG_error",
			"fileDraft": "EtEeYG_fileDraft",
			"fileInput": "EtEeYG_fileInput",
			"filePicker": "EtEeYG_filePicker",
			"filePreview": "EtEeYG_filePreview",
			"filePreviewIcon": "EtEeYG_filePreviewIcon",
			"filePreviewName": "EtEeYG_filePreviewName",
			"history": "EtEeYG_history",
			"historyLoading": "EtEeYG_historyLoading",
			"historyShell": "EtEeYG_historyShell",
			"identityCard": "EtEeYG_identityCard",
			"identityEdit": "EtEeYG_identityEdit",
			"identityEditor": "EtEeYG_identityEditor",
			"identityError": "EtEeYG_identityError",
			"identityHandle": "EtEeYG_identityHandle",
			"identityName": "EtEeYG_identityName",
			"identityNameRow": "EtEeYG_identityNameRow",
			"identityStatus": "EtEeYG_identityStatus",
			"imageAttachment": "EtEeYG_imageAttachment",
			"inlineError": "EtEeYG_inlineError",
			"latestMessages": "EtEeYG_latestMessages",
			"launcherIcon": "EtEeYG_launcherIcon",
			"linkButton": "EtEeYG_linkButton",
			"logoutConfirm": "EtEeYG_logoutConfirm",
			"logoutWarning": "EtEeYG_logoutWarning",
			"message": "EtEeYG_message",
			"messageMeta": "EtEeYG_messageMeta",
			"more": "EtEeYG_more",
			"notice": "EtEeYG_notice",
			"pending": "EtEeYG_pending",
			"pendingAttachment": "EtEeYG_pendingAttachment",
			"pendingCaption": "EtEeYG_pendingCaption",
			"pendingMessage": "EtEeYG_pendingMessage",
			"pendingMessageContent": "EtEeYG_pendingMessageContent",
			"pendingMessageSpinner": "EtEeYG_pendingMessageSpinner",
			"primary": "EtEeYG_primary",
			"registration": "EtEeYG_registration",
			"registrationIcon": "EtEeYG_registrationIcon",
			"removeFile": "EtEeYG_removeFile",
			"roster": "EtEeYG_roster",
			"rosterTitle": "EtEeYG_rosterTitle",
			"secondary": "EtEeYG_secondary",
			"send": "EtEeYG_send",
			"summary-spin": "EtEeYG_summary-spin",
			"summaryActions": "EtEeYG_summaryActions",
			"summaryBody": "EtEeYG_summaryBody",
			"summaryCollapsed": "EtEeYG_summaryCollapsed",
			"summaryCopyError": "EtEeYG_summaryCopyError",
			"summaryError": "EtEeYG_summaryError",
			"summaryHeader": "EtEeYG_summaryHeader",
			"summaryLoading": "EtEeYG_summaryLoading",
			"summaryPanel": "EtEeYG_summaryPanel",
			"summaryPrivacy": "EtEeYG_summaryPrivacy",
			"summarySection": "EtEeYG_summarySection",
			"summaryStale": "EtEeYG_summaryStale",
			"summaryTrigger": "EtEeYG_summaryTrigger",
			"thread": "EtEeYG_thread",
			"threadEmpty": "EtEeYG_threadEmpty",
			"threadHeader": "EtEeYG_threadHeader",
			"threadTitle": "EtEeYG_threadTitle",
			"trigger": "EtEeYG_trigger",
			"unreadBadge": "EtEeYG_unreadBadge"
		};
		//#endregion
		//#region lib/types/client/AwikiOverlay.js
		/** AWiki trigger, identity registration, and direct/group messaging drawer. */
		const AWIKI_LAUNCHER_POSITION_KEY = "dsh-awiki-launcher-position-v1";
		const LAUNCHER_SIZE = 48;
		const LAUNCHER_EDGE_GAP = 8;
		const LAUNCHER_RIGHT_OFFSET = 28;
		const LAUNCHER_BOTTOM_CLEARANCE = 152;
		const LAUNCHER_DRAG_THRESHOLD = 4;
		const DRAWER_LONG_PRESS_MS = 300;
		const DRAWER_ANCHOR_GAP = 8;
		const DRAWER_EDGE_GAP = 8;
		const DRAWER_NOMINAL_WIDTH = 720;
		const DRAWER_NOMINAL_HEIGHT = 720;
		const DRAWER_HORIZONTAL_RESERVE = 80;
		const ONE_DAY_MS = 864e5;
		const HISTORY_BOTTOM_THRESHOLD = 24;
		/** Keep the floating launcher fully reachable inside the current viewport. */
		function clampAwikiLauncherPosition(position, width, height) {
			return {
				left: Math.min(Math.max(position.left, LAUNCHER_EDGE_GAP), Math.max(LAUNCHER_EDGE_GAP, width - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP)),
				top: Math.min(Math.max(position.top, LAUNCHER_EDGE_GAP), Math.max(LAUNCHER_EDGE_GAP, height - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP))
			};
		}
		function overflowAmount(position, panelWidth, panelHeight, viewportWidth, viewportHeight) {
			return Math.max(0, DRAWER_EDGE_GAP - position.left) + Math.max(0, DRAWER_EDGE_GAP - position.top) + Math.max(0, position.left + panelWidth + DRAWER_EDGE_GAP - viewportWidth) + Math.max(0, position.top + panelHeight + DRAWER_EDGE_GAP - viewportHeight);
		}
		/** Place the chat panel in the launcher corner quadrant with the least viewport overflow. */
		function resolveAwikiDrawerPlacement(launcher, panelWidth, panelHeight, viewportWidth, viewportHeight, preferredDirection) {
			const candidates = [
				{
					direction: "upper-left",
					left: launcher.left - panelWidth - DRAWER_ANCHOR_GAP,
					top: launcher.top - panelHeight - DRAWER_ANCHOR_GAP
				},
				{
					direction: "upper-right",
					left: launcher.left + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
					top: launcher.top - panelHeight - DRAWER_ANCHOR_GAP
				},
				{
					direction: "lower-left",
					left: launcher.left - panelWidth - DRAWER_ANCHOR_GAP,
					top: launcher.top + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP
				},
				{
					direction: "lower-right",
					left: launcher.left + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
					top: launcher.top + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP
				}
			];
			const leastOverflow = candidates.reduce((best, candidate) => overflowAmount(candidate, panelWidth, panelHeight, viewportWidth, viewportHeight) < overflowAmount(best, panelWidth, panelHeight, viewportWidth, viewportHeight) ? candidate : best);
			const selected = preferredDirection === void 0 ? leastOverflow : candidates.find((candidate) => candidate.direction === preferredDirection) ?? leastOverflow;
			return {
				direction: selected.direction,
				left: Math.min(Math.max(selected.left, DRAWER_EDGE_GAP), Math.max(DRAWER_EDGE_GAP, viewportWidth - panelWidth - DRAWER_EDGE_GAP)),
				top: Math.min(Math.max(selected.top, DRAWER_EDGE_GAP), Math.max(DRAWER_EDGE_GAP, viewportHeight - panelHeight - DRAWER_EDGE_GAP))
			};
		}
		function defaultLauncherPosition() {
			return clampAwikiLauncherPosition({
				left: window.innerWidth - LAUNCHER_SIZE - LAUNCHER_RIGHT_OFFSET,
				top: window.innerHeight - LAUNCHER_SIZE - LAUNCHER_BOTTOM_CLEARANCE
			}, window.innerWidth, window.innerHeight);
		}
		function readLauncherPosition() {
			try {
				const stored = window.sessionStorage.getItem(AWIKI_LAUNCHER_POSITION_KEY);
				if (stored !== null) {
					const { left, top } = JSON.parse(stored);
					if (typeof left === "number" && Number.isFinite(left) && typeof top === "number" && Number.isFinite(top)) return clampAwikiLauncherPosition({
						left,
						top
					}, window.innerWidth, window.innerHeight);
				}
			} catch {}
			return defaultLauncherPosition();
		}
		function saveLauncherPosition(position) {
			try {
				window.sessionStorage.setItem(AWIKI_LAUNCHER_POSITION_KEY, JSON.stringify(position));
			} catch {}
		}
		function callPointerCapture(target, method, pointerId) {
			const capture = Reflect.get(target, method);
			if (typeof capture === "function") Reflect.apply(capture, target, [pointerId]);
		}
		/** Format one Host timestamp for compact local display. */
		function time(value) {
			return new Intl.DateTimeFormat("zh-CN", {
				month: "numeric",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			}).format(value);
		}
		/** Show a clock within 24 hours, otherwise only the local calendar date. */
		function conversationTime(value, now = Date.now()) {
			const age = now - value;
			return age >= 0 && age < ONE_DAY_MS ? new Intl.DateTimeFormat("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			}).format(value) : new Intl.DateTimeFormat("zh-CN", {
				month: "numeric",
				day: "numeric"
			}).format(value);
		}
		/** Render the identity registration form and its OTP challenge transition. */
		function AwikiRegistrationForm(props) {
			const [phone, setPhone] = (0, react.useState)("");
			const [handle, setHandle] = (0, react.useState)("");
			const [otp, setOtp] = (0, react.useState)("");
			const [otpSent, setOtpSent] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)(null);
			const [retryDeadline, setRetryDeadline] = (0, react.useState)(null);
			const [retrySeconds, setRetrySeconds] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				if (retryDeadline === null) return;
				const update = () => {
					const remaining = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1e3));
					setRetrySeconds(remaining);
					if (remaining === 0) setRetryDeadline(null);
				};
				update();
				const timer = setInterval(update, 250);
				return () => {
					clearInterval(timer);
				};
			}, [retryDeadline]);
			const requestOtp = async () => {
				const result = await props.sendRegistrationOtp({
					handle: handle.trim(),
					phone: phone.trim()
				});
				if (!result.ok) return;
				const cooldownSeconds = Math.max(0, Math.ceil(result.value.retryAfterSeconds));
				setOtpSent(true);
				setRetryDeadline(Date.now() + cooldownSeconds * 1e3);
				setRetrySeconds(cooldownSeconds);
				setNotice(`验证码已发送；${cooldownSeconds} 秒后可重新获取。`);
			};
			const register = async () => {
				/* v8 ignore next -- the registration action is rendered only after an OTP challenge starts. */
				if (!otpSent) return;
				if (!(await props.registerIdentity({
					phone: phone.trim(),
					handle: handle.trim(),
					otp: otp.trim()
				})).ok) return;
				setNotice(null);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.registration,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.registrationIcon,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, { size: 24 })
					}),
					(0, react_jsx_runtime.jsx)("h3", { children: "注册 AWiki 身份" }),
					(0, react_jsx_runtime.jsx)("p", { children: "该身份由当前 Harness 部署中的全部 Agent 共同使用。" }),
					(0, react_jsx_runtime.jsxs)("label", { children: ["Handle", (0, react_jsx_runtime.jsx)("input", {
						value: handle,
						onChange: (event) => {
							setHandle(event.target.value);
						},
						autoComplete: "username",
						placeholder: "例如 alice",
						autoFocus: props.autoFocusHandle
					})] }),
					(0, react_jsx_runtime.jsxs)("label", { children: ["手机号", (0, react_jsx_runtime.jsx)("input", {
						value: phone,
						onChange: (event) => {
							setPhone(event.target.value);
						},
						autoComplete: "tel"
					})] }),
					!otpSent ? (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.primary,
						disabled: props.pending || phone.trim() === "" || handle.trim() === "",
						onClick: () => {
							requestOtp();
						},
						children: "获取验证码"
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsxs)("label", { children: ["验证码", (0, react_jsx_runtime.jsx)("input", {
							value: otp,
							onChange: (event) => {
								setOtp(event.target.value);
							},
							inputMode: "numeric",
							autoComplete: "one-time-code"
						})] }),
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.primary,
							disabled: props.pending || handle.trim() === "" || otp.trim() === "",
							onClick: () => {
								register();
							},
							children: "注册身份"
						}),
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.linkButton,
							disabled: props.pending || retrySeconds > 0,
							onClick: () => {
								requestOtp();
							},
							children: retrySeconds > 0 ? `${retrySeconds} 秒后重新获取` : "重新获取验证码"
						})
					] }),
					notice !== null && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.notice,
						role: "status",
						children: notice
					})
				]
			});
		}
		/** Let a signed-out installation resume its preserved local identity. */
		function SignedOut(props) {
			const [error, setError] = (0, react.useState)(null);
			const login = async () => {
				setError(null);
				const result = await props.login();
				if (!result.ok) setError(result.error);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.centerState,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.registrationIcon,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, { size: 24 })
					}),
					(0, react_jsx_runtime.jsx)("h3", { children: "已退出 AWiki" }),
					(0, react_jsx_runtime.jsx)("p", { children: "本机身份和消息数据仍安全保留。重新进入后会继续使用原来的 DID 和 Handle。" }),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.primary,
						disabled: props.pending,
						onClick: () => {
							login();
						},
						children: "重新进入"
					}),
					error !== null && (0, react_jsx_runtime.jsx)("small", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.inlineError,
						role: "alert",
						children: error
					})
				]
			});
		}
		/** Prefer the peer WNS display name for a direct chat; groups keep their title. */
		function conversationLabel(conversation) {
			return conversation.kind === "direct" ? conversation.displayName ?? conversation.title : conversation.title;
		}
		/** Show only the deployment identity's WNS display name, never its routing Handle. */
		function identityLabel(identity) {
			return identity.displayName ?? "未设置昵称";
		}
		/** Editable deployment identity summary shown above the conversation roster. */
		function IdentityCard(props) {
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)(props.identity.displayName ?? "");
			const [error, setError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!editing) setDraft(props.identity.displayName ?? "");
			}, [editing, props.identity.displayName]);
			const cancel = () => {
				setDraft(props.identity.displayName ?? "");
				setError(null);
				setEditing(false);
			};
			const save = async () => {
				const displayName = draft.trim();
				const length = Array.from(displayName).length;
				if (length === 0) {
					setError("请输入昵称");
					return;
				}
				if (length > 50) {
					setError("昵称不能超过 50 个字符");
					return;
				}
				setError(null);
				const result = await props.updateDisplayName(displayName);
				if (!result.ok) {
					setError(result.error);
					return;
				}
				setDraft(result.value.displayName ?? displayName);
				setEditing(false);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityCard,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityNameRow,
						children: editing ? (0, react_jsx_runtime.jsxs)("form", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityEditor,
							onSubmit: (event) => {
								event.preventDefault();
								save();
							},
							children: [
								(0, react_jsx_runtime.jsx)("input", {
									"aria-label": "昵称",
									autoFocus: true,
									disabled: props.pending,
									value: draft,
									onChange: (event) => {
										setDraft(event.target.value);
									},
									onKeyDown: (event) => {
										if (event.key === "Escape") {
											event.stopPropagation();
											cancel();
										}
									}
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "submit",
									"aria-label": "保存昵称",
									disabled: props.pending,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 })
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "取消修改昵称",
									disabled: props.pending,
									onClick: cancel,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
								})
							]
						}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: props.identity.did,
							side: "bottom",
							children: (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityName,
								disabled: props.pending,
								onClick: () => {
									setError(null);
									setEditing(true);
								},
								children: identityLabel(props.identity)
							})
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: "修改昵称",
							side: "right",
							children: (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityEdit,
								"aria-label": "修改昵称",
								disabled: props.pending,
								onClick: () => {
									setError(null);
									setEditing(true);
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
							})
						})] })
					}),
					(0, react_jsx_runtime.jsx)("small", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityHandle,
						children: props.identity.handle
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityStatus,
						children: [(0, react_jsx_runtime.jsx)("i", {}), "在线"]
					}),
					error !== null && (0, react_jsx_runtime.jsx)("small", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.identityError,
						role: "alert",
						children: error
					})
				]
			});
		}
		/** Incoming sender label: WNS display name, then Handle, then DID. */
		function senderLabel(message, peerLabel) {
			if (message.outgoing) return "我";
			return peerLabel ?? message.senderDisplayName ?? message.senderHandle ?? message.senderDid;
		}
		/** Render one direct or group conversation row. */
		function ConversationRow(props) {
			const label = conversationLabel(props.conversation);
			const unreadCount = props.conversation.unreadCount ?? 0;
			const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
			const preview = props.conversation.lastMessagePreview ?? "暂无消息";
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.conversationRow,
				"data-active": props.active || void 0,
				"aria-label": unreadCount > 0 ? `${label}，${unreadCount} 条未读消息` : void 0,
				onClick: props.onSelect,
				children: [(0, react_jsx_runtime.jsxs)("span", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.avatar,
					children: [props.conversation.kind === "direct" ? "私" : "群", unreadCount > 0 && (0, react_jsx_runtime.jsx)("span", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.conversationUnreadBadge,
						"aria-hidden": "true",
						children: unreadLabel
					})]
				}), (0, react_jsx_runtime.jsxs)("span", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.conversationText,
					children: [(0, react_jsx_runtime.jsxs)("span", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.conversationHeader,
						children: [(0, react_jsx_runtime.jsx)("strong", { children: label }), props.conversation.lastMessageAt !== void 0 && (0, react_jsx_runtime.jsx)("time", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.conversationTime,
							children: conversationTime(props.conversation.lastMessageAt)
						})]
					}), (0, react_jsx_runtime.jsx)("small", { children: preview })]
				})]
			});
		}
		/** Render one AWiki message, including an attachment download action. */
		function MessageRow(props) {
			const [error, setError] = (0, react.useState)(null);
			const [preview, setPreview] = (0, react.useState)(null);
			const [previewLoading, setPreviewLoading] = (0, react.useState)(false);
			const imageAttachmentId = props.message.content.kind === "attachment" && props.message.content.attachment.mimeType.startsWith("image/") ? props.message.content.attachment.id : null;
			(0, react.useEffect)(() => {
				if (imageAttachmentId === null) return;
				let disposed = false;
				let objectUrl = null;
				setPreview(null);
				setPreviewLoading(true);
				setError(null);
				props.download(props.message.id, imageAttachmentId).then((result) => {
					if (disposed) return;
					setPreviewLoading(false);
					if (!result.ok) {
						setError(result.error);
						return;
					}
					objectUrl = createAttachmentObjectUrl(result.value);
					setPreview({
						url: objectUrl,
						value: result.value
					});
				});
				return () => {
					disposed = true;
					if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
				};
			}, [
				imageAttachmentId,
				props.download,
				props.message.id
			]);
			const download = async () => {
				/* v8 ignore next -- only attachment content renders the button that invokes this closure. */
				if (props.message.content.kind !== "attachment") return;
				if (preview !== null) {
					saveDownloadedAttachment(preview.value);
					return;
				}
				const result = await props.download(props.message.id, props.message.content.attachment.id);
				if (!result.ok) {
					setError(result.error);
					return;
				}
				saveDownloadedAttachment(result.value);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.message,
				"data-message-id": props.message.id,
				"data-outgoing": props.message.outgoing || void 0,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.messageMeta,
						children: [(0, react_jsx_runtime.jsx)("span", { children: senderLabel(props.message, props.peerLabel) }), (0, react_jsx_runtime.jsx)("time", { children: time(props.message.sentAt) })]
					}),
					props.message.content.kind === "text" ? (0, react_jsx_runtime.jsx)("p", { children: props.message.content.text }) : preview !== null ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.imageAttachment,
						"aria-label": `下载图片 ${props.message.content.attachment.fileName}`,
						onClick: () => {
							download();
						},
						children: [(0, react_jsx_runtime.jsx)("img", {
							src: preview.url,
							alt: props.message.content.attachment.fileName,
							onLoad: () => {
								props.onImageLoad?.(props.message.id);
							}
						}), (0, react_jsx_runtime.jsxs)("span", { children: [
							(0, react_jsx_runtime.jsx)("strong", { children: props.message.content.attachment.fileName }),
							(0, react_jsx_runtime.jsxs)("small", { children: [props.message.content.attachment.size, " 字节"] }),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 16 })
						] })]
					}), props.message.content.caption !== void 0 && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.caption,
						children: props.message.content.caption
					})] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.attachment,
						disabled: previewLoading,
						onClick: () => {
							download();
						},
						children: [(0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("strong", { children: props.message.content.attachment.fileName }), (0, react_jsx_runtime.jsx)("small", { children: previewLoading ? "正在加载图片预览…" : `${props.message.content.attachment.size} 字节` })] }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 16 })]
					}), props.message.content.caption !== void 0 && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.caption,
						children: props.message.content.caption
					})] }),
					error !== null && (0, react_jsx_runtime.jsx)("small", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.inlineError,
						children: error
					})
				]
			});
		}
		/** Render one optimistic outgoing bubble while the Host confirms delivery. */
		function PendingMessageRow(props) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.pendingMessage,
				role: "status",
				"aria-live": "polite",
				"aria-label": "消息发送中",
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.pendingMessageSpinner,
					size: 14
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.pendingMessageContent,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.messageMeta,
						children: [(0, react_jsx_runtime.jsx)("span", { children: "我" }), (0, react_jsx_runtime.jsx)("time", { children: time(props.draft.startedAt) })]
					}), props.draft.content.kind === "text" ? (0, react_jsx_runtime.jsx)("p", { children: props.draft.content.text }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.pendingAttachment,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, { size: 16 }), (0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("strong", { children: props.draft.content.fileName }), (0, react_jsx_runtime.jsxs)("small", { children: [props.draft.content.size, " 字节"] })] })]
					}), props.draft.content.caption !== void 0 && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.pendingCaption,
						children: props.draft.content.caption
					})] })]
				})]
			});
		}
		function summaryRangeLabel(summary) {
			const scope = summary.range.kind === "unread" ? "未读以来" : "最近消息";
			const formatter = new Intl.DateTimeFormat("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			});
			return `${scope} · ${summary.range.messageCount} 条消息 · ${formatter.format(summary.range.startedAt)}–${formatter.format(summary.range.endedAt)}`;
		}
		function copiedSummary(summary) {
			return [
				"AI 对话总结",
				`范围：${summaryRangeLabel(summary)}`,
				"",
				"重点",
				...summary.highlights.map((item) => `- ${item}`),
				"",
				"结论",
				...summary.conclusions.map((item) => `- ${item}`),
				"",
				"待办",
				...summary.todos.map((item) => `- ${item.owner === void 0 ? "" : `${item.owner}：`}${item.text}`)
			].join("\n");
		}
		/** Render every user-visible summary state without obscuring history or the composer. */
		function SummaryPanel(props) {
			const [copyState, setCopyState] = (0, react.useState)("idle");
			const result = props.summary.result;
			(0, react.useEffect)(() => {
				setCopyState("idle");
			}, [result]);
			if (props.summary.collapsed) return (0, react_jsx_runtime.jsx)("div", {
				id: props.id,
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryPanel,
				"data-collapsed": true,
				children: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryCollapsed,
					"aria-label": "展开 AI 对话总结",
					"aria-expanded": "false",
					onClick: () => {
						props.collapse(false);
					},
					children: [
						(0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 }), "AI 对话总结"] }),
						result !== void 0 && (0, react_jsx_runtime.jsx)("small", { children: summaryRangeLabel(result) }),
						props.summary.stale && (0, react_jsx_runtime.jsx)("em", { children: "有新消息" }),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })
					]
				})
			});
			const copy = async () => {
				if (result === void 0) return;
				try {
					await navigator.clipboard.writeText(copiedSummary(result));
					setCopyState("copied");
				} catch {
					setCopyState("error");
				}
			};
			return (0, react_jsx_runtime.jsxs)("section", {
				id: props.id,
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryPanel,
				"aria-label": "AI 对话总结",
				"aria-live": "polite",
				children: [
					(0, react_jsx_runtime.jsxs)("header", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryHeader,
						children: [
							(0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 15 }), (0, react_jsx_runtime.jsx)("strong", { children: "AI 对话总结" })] }),
							result !== void 0 && (0, react_jsx_runtime.jsx)("small", { children: summaryRangeLabel(result) }),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "折叠 AI 对话总结",
								"aria-expanded": "true",
								onClick: () => {
									props.collapse(true);
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })
							})
						]
					}),
					props.summary.status === "loading" && (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryLoading,
						role: "status",
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 18 }), (0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("strong", { children: "正在整理这段对话…" }), (0, react_jsx_runtime.jsx)("small", { children: "只会处理本次选择的消息范围" })] })]
					}),
					props.summary.status === "error" && (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryError,
						role: "alert",
						children: [(0, react_jsx_runtime.jsx)("span", { children: props.summary.error ?? "暂时无法生成 AI 总结。" }), (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-label": "重新生成 AI 总结",
							onClick: props.regenerate,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { size: 14 }), "重新生成"]
						})]
					}),
					props.summary.status === "success" && result !== void 0 && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						props.summary.stale && (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryStale,
							role: "status",
							children: [(0, react_jsx_runtime.jsx)("span", { children: "有新消息，当前总结已过期" }), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "根据新消息重新生成 AI 总结",
								onClick: props.regenerate,
								children: "重新生成"
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryBody,
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.summarySection,
									children: [(0, react_jsx_runtime.jsxs)("h4", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGoalOutline16, { size: 15 }), "重点"] }), result.highlights.length === 0 ? (0, react_jsx_runtime.jsx)("p", { children: "暂无明确重点" }) : (0, react_jsx_runtime.jsx)("ul", { children: result.highlights.map((item) => (0, react_jsx_runtime.jsx)("li", { children: item }, item)) })]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.summarySection,
									children: [(0, react_jsx_runtime.jsxs)("h4", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 15 }), "结论"] }), result.conclusions.length === 0 ? (0, react_jsx_runtime.jsx)("p", { children: "暂无明确结论" }) : (0, react_jsx_runtime.jsx)("ul", { children: result.conclusions.map((item) => (0, react_jsx_runtime.jsx)("li", { children: item }, item)) })]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.summarySection,
									children: [(0, react_jsx_runtime.jsxs)("h4", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 15 }), "待办"] }), result.todos.length === 0 ? (0, react_jsx_runtime.jsx)("p", { children: "暂无待办" }) : (0, react_jsx_runtime.jsx)("ul", { children: result.todos.map((item) => (0, react_jsx_runtime.jsxs)("li", { children: [item.owner === void 0 ? "" : (0, react_jsx_runtime.jsxs)("b", { children: [item.owner, "："] }), item.text] }, `${item.owner ?? ""}:${item.text}`)) })]
								})
							]
						}),
						(0, react_jsx_runtime.jsxs)("footer", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryActions,
							children: [
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										props.viewSource(result.range.firstMessageId);
									},
									children: "查看原消息"
								}),
								(0, react_jsx_runtime.jsx)("span", {}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-label": "重新生成 AI 总结",
									onClick: props.regenerate,
									children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { size: 14 }), "重新生成"]
								}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										copy();
									},
									children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 }), copyState === "copied" ? "已复制" : "复制"]
								})
							]
						}),
						copyState === "error" && (0, react_jsx_runtime.jsx)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryCopyError,
							role: "alert",
							children: "复制失败，请重试。"
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryPrivacy,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 14 }), "仅发送所选范围的文本与附件元数据，不发送附件文件"]
						})
					] })
				]
			});
		}
		/** Render the conversation roster, history, composer, and one-file picker. */
		function Chat(props) {
			const { view } = props;
			const [text, setText] = (0, react.useState)("");
			const [file, setFile] = (0, react.useState)(null);
			const [sendingDraft, setSendingDraft] = (0, react.useState)(null);
			const [previewUrl, setPreviewUrl] = (0, react.useState)(null);
			const [fileError, setFileError] = (0, react.useState)(null);
			const input = (0, react.useRef)(null);
			const history = (0, react.useRef)(null);
			const previousConversationId = (0, react.useRef)(null);
			const previousMessageTail = (0, react.useRef)(null);
			const selectedConversationId = (0, react.useRef)(view.selectedConversationId);
			const conversationAwaitingBottom = (0, react.useRef)(null);
			const pendingInitialImages = (0, react.useRef)(/* @__PURE__ */ new Set());
			const historyPinnedToBottom = (0, react.useRef)(true);
			const [historyAwayFromBottom, setHistoryAwayFromBottom] = (0, react.useState)(false);
			const [unseenMessageCount, setUnseenMessageCount] = (0, react.useState)(0);
			const selected = view.conversations.find((value) => value.id === view.selectedConversationId);
			const summary = selected === void 0 ? void 0 : view.summaries[selected.id];
			const summaryPanelId = (0, react.useId)();
			selectedConversationId.current = view.selectedConversationId;
			const visibleSendingDraft = sendingDraft?.conversationId === view.selectedConversationId ? sendingDraft : null;
			const markSelectedConversationReadAtBottom = () => {
				const node = history.current;
				const newestRendered = view.messages.at(-1);
				if (node === null || selected === void 0 || newestRendered === void 0 || (selected.unreadCount ?? 0) <= 0 || view.pending === "加载消息" || selected.lastMessageAt !== void 0 && newestRendered.sentAt < selected.lastMessageAt || node.scrollHeight - node.scrollTop - node.clientHeight > HISTORY_BOTTOM_THRESHOLD) return;
				props.markSelectedConversationRead();
			};
			const scrollHistoryToLatest = (smooth) => {
				const node = history.current;
				if (node === null) return;
				const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
				if (smooth && !reduceMotion && typeof node.scrollTo === "function") node.scrollTo({
					top: node.scrollHeight,
					behavior: "smooth"
				});
				else node.scrollTop = node.scrollHeight;
				historyPinnedToBottom.current = true;
				setHistoryAwayFromBottom(false);
				setUnseenMessageCount(0);
				if (!smooth || reduceMotion || typeof node.scrollTo !== "function") markSelectedConversationReadAtBottom();
			};
			const syncHistoryPosition = () => {
				const node = history.current;
				if (node === null) return;
				const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= HISTORY_BOTTOM_THRESHOLD;
				historyPinnedToBottom.current = atBottom;
				setHistoryAwayFromBottom(!atBottom);
				if (atBottom) {
					setUnseenMessageCount(0);
					markSelectedConversationReadAtBottom();
				}
			};
			(0, react.useLayoutEffect)(() => {
				markSelectedConversationReadAtBottom();
			}, [
				selected?.id,
				selected?.lastMessageAt,
				selected?.unreadCount,
				view.messages,
				view.pending
			]);
			(0, react.useLayoutEffect)(() => {
				const conversationId = view.selectedConversationId;
				if (conversationId !== previousConversationId.current) {
					previousConversationId.current = conversationId;
					conversationAwaitingBottom.current = conversationId;
					pendingInitialImages.current.clear();
					previousMessageTail.current = conversationId === null ? null : {
						conversationId,
						messageId: view.messages.at(-1)?.id ?? null
					};
					historyPinnedToBottom.current = true;
					setHistoryAwayFromBottom(false);
					setUnseenMessageCount(0);
				}
				if (conversationId === null || history.current === null) return;
				if (view.pending === "加载消息") return;
				if (conversationAwaitingBottom.current === conversationId) {
					if (view.messages.length === 0) return;
					pendingInitialImages.current = new Set(view.messages.flatMap((message) => message.content.kind === "attachment" && message.content.attachment.mimeType.startsWith("image/") ? [message.id] : []));
					previousMessageTail.current = {
						conversationId,
						messageId: view.messages.at(-1)?.id ?? null
					};
					scrollHistoryToLatest(false);
					if (pendingInitialImages.current.size === 0) {
						conversationAwaitingBottom.current = null;
						markSelectedConversationReadAtBottom();
					}
					return;
				}
				const previous = previousMessageTail.current;
				previousMessageTail.current = {
					conversationId,
					messageId: view.messages.at(-1)?.id ?? null
				};
				if (previous?.conversationId !== conversationId || previous.messageId === null) return;
				const previousTailIndex = view.messages.findIndex((message) => message.id === previous.messageId);
				if (previousTailIndex < 0 || previousTailIndex === view.messages.length - 1) return;
				const appendedMessageCount = view.messages.length - previousTailIndex - 1;
				if (historyPinnedToBottom.current) scrollHistoryToLatest(false);
				else {
					setHistoryAwayFromBottom(true);
					setUnseenMessageCount((current) => current + appendedMessageCount);
				}
			}, [
				view.messages,
				view.pending,
				view.selectedConversationId
			]);
			(0, react.useLayoutEffect)(() => {
				if (visibleSendingDraft === null || history.current === null) return;
				scrollHistoryToLatest(false);
			}, [visibleSendingDraft]);
			const scrollAfterInitialImage = (messageId) => {
				if (selected === void 0 || conversationAwaitingBottom.current !== selected.id) return;
				if (!pendingInitialImages.current.delete(messageId)) return;
				if (history.current !== null) scrollHistoryToLatest(false);
				if (pendingInitialImages.current.size === 0) conversationAwaitingBottom.current = null;
				if (pendingInitialImages.current.size === 0) markSelectedConversationReadAtBottom();
			};
			const viewSummarySource = (messageId) => {
				if (selected === void 0) return;
				props.setSummaryCollapsed(selected.id, true);
				requestAnimationFrame(() => {
					const node = [...history.current?.querySelectorAll("[data-message-id]") ?? []].find((candidate) => candidate.dataset.messageId === messageId);
					if (node === void 0) return;
					node.scrollIntoView({ block: "center" });
					node.tabIndex = -1;
					node.focus({ preventScroll: true });
				});
			};
			(0, react.useEffect)(() => {
				if (file === null || !file.type.startsWith("image/")) {
					setPreviewUrl(null);
					return;
				}
				const url = URL.createObjectURL(file);
				setPreviewUrl(url);
				return () => {
					URL.revokeObjectURL(url);
				};
			}, [file]);
			const clearFile = () => {
				setFile(null);
				setFileError(null);
				/* v8 ignore else -- the clear action is available only while the mounted file input owns the selection. */
				if (input.current !== null) input.current.value = "";
			};
			const sendMessage = async () => {
				if (sendingDraft !== null || view.selectedConversationId === null) return;
				const draft = text.trim();
				const conversationId = view.selectedConversationId;
				if (file === null) {
					/* v8 ignore next -- the only invocation control is disabled while both text and attachment are empty. */
					if (draft === "") return;
					setSendingDraft({
						conversationId,
						startedAt: Date.now(),
						content: {
							kind: "text",
							text: draft
						}
					});
					setText("");
					const result = await props.sendText(draft);
					setSendingDraft(null);
					if (!result.ok && selectedConversationId.current === conversationId) setText(draft);
					return;
				}
				if (file.size > view.attachmentMaxBytes) {
					setFileError(`附件不能超过 ${view.attachmentMaxBytes} 字节。`);
					return;
				}
				setFileError(null);
				const selectedFile = file;
				const bytesBase64 = await fileToBase64(selectedFile);
				setSendingDraft({
					conversationId,
					startedAt: Date.now(),
					content: {
						kind: "attachment",
						fileName: selectedFile.name,
						size: selectedFile.size,
						...draft === "" ? {} : { caption: draft }
					}
				});
				clearFile();
				setText("");
				const result = await props.sendAttachment({
					fileName: selectedFile.name,
					mimeType: selectedFile.type || "application/octet-stream",
					bytesBase64,
					...draft === "" ? {} : { caption: draft }
				});
				setSendingDraft(null);
				if (!result.ok && selectedConversationId.current === conversationId) {
					setFile(selectedFile);
					setText(draft);
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.chat,
				children: [(0, react_jsx_runtime.jsxs)("aside", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.roster,
					"data-hidden": selected !== void 0 || void 0,
					children: [
						(0, react_jsx_runtime.jsx)(IdentityCard, {
							identity: view.identity,
							pending: view.pending !== null,
							updateDisplayName: props.updateDisplayName
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.rosterTitle,
							children: "会话"
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.conversationList,
							children: [view.conversations.map((conversation) => (0, react_jsx_runtime.jsx)(ConversationRow, {
								conversation,
								active: conversation.id === view.selectedConversationId,
								onSelect: () => {
									props.selectConversation(conversation.id);
								}
							}, conversation.id)), view.conversations.length === 0 && (0, react_jsx_runtime.jsx)("p", {
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.empty,
								children: "还没有可用的私聊或群聊。"
							})]
						}),
						view.conversationsHasMore && (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.more,
							onClick: () => {
								props.loadMoreConversations();
							},
							children: "加载更多会话"
						})
					]
				}), (0, react_jsx_runtime.jsx)("section", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.thread,
					"data-visible": selected !== void 0 || void 0,
					children: selected === void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.threadEmpty,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 28 }), (0, react_jsx_runtime.jsx)("p", { children: "选择一个私聊或群聊查看消息。" })]
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsxs)("header", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.threadHeader,
							children: [
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.back,
									"aria-label": "返回会话列表",
									onClick: () => {
										props.selectConversation(null);
									},
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.threadTitle,
									children: [(0, react_jsx_runtime.jsx)("strong", { children: conversationLabel(selected) }), (0, react_jsx_runtime.jsx)("small", { children: selected.kind === "direct" ? "私聊" : "群聊" })]
								}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.summaryTrigger,
									"aria-controls": summaryPanelId,
									"aria-expanded": summary === void 0 ? void 0 : !summary.collapsed,
									"aria-label": summary?.status === "loading" ? "正在生成 AI 总结" : summary?.collapsed === true ? "展开 AI 总结" : "生成 AI 总结",
									disabled: summary?.status === "loading",
									onClick: () => {
										if (summary !== void 0 && !summary.collapsed && summary.status !== "error") props.setSummaryCollapsed(selected.id, true);
										else if (summary?.collapsed === true) props.setSummaryCollapsed(selected.id, false);
										else props.summarizeConversation();
									},
									children: [
										summary?.status === "loading" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 14 }) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 }),
										(0, react_jsx_runtime.jsx)("span", { children: summary?.status === "loading" ? "总结中" : "AI 总结" }),
										summary !== void 0 && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })
									]
								})
							]
						}),
						summary !== void 0 && (0, react_jsx_runtime.jsx)(SummaryPanel, {
							id: summaryPanelId,
							summary,
							regenerate: () => {
								props.summarizeConversation();
							},
							collapse: (collapsed) => {
								props.setSummaryCollapsed(selected.id, collapsed);
							},
							viewSource: viewSummarySource
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.historyShell,
							children: [(0, react_jsx_runtime.jsxs)("div", {
								ref: history,
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.history,
								role: "log",
								"aria-label": "消息记录",
								onScroll: syncHistoryPosition,
								children: [
									view.historyHasMore && (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.more,
										onClick: () => {
											props.loadOlderHistory();
										},
										children: "加载更早消息"
									}),
									view.pending === "加载消息" && (0, react_jsx_runtime.jsxs)("div", {
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.historyLoading,
										role: "status",
										"aria-live": "polite",
										"aria-label": "正在加载消息",
										children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 18 }), (0, react_jsx_runtime.jsx)("span", { children: "正在加载消息…" })]
									}),
									view.messages.map((message) => (0, react_jsx_runtime.jsx)(MessageRow, {
										message,
										peerLabel: selected.kind === "direct" ? conversationLabel(selected) : void 0,
										download: props.downloadAttachment,
										onImageLoad: scrollAfterInitialImage
									}, message.id)),
									visibleSendingDraft !== null && (0, react_jsx_runtime.jsx)(PendingMessageRow, { draft: visibleSendingDraft }),
									view.pending !== "加载消息" && view.messages.length === 0 && visibleSendingDraft === null && (0, react_jsx_runtime.jsx)("p", {
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.empty,
										children: "暂无消息。"
									})
								]
							}), historyAwayFromBottom && (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.latestMessages,
								"aria-label": unseenMessageCount === 0 ? "下滑到最新消息" : `有 ${unseenMessageCount} 条新消息，下滑到最新消息`,
								onClick: () => {
									scrollHistoryToLatest(true);
								},
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }), unseenMessageCount > 0 && (0, react_jsx_runtime.jsxs)("span", { children: [
									"新消息（",
									unseenMessageCount,
									"）"
								] })]
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.composer,
							children: [fileError !== null && (0, react_jsx_runtime.jsx)("small", {
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.inlineError,
								role: "alert",
								children: fileError
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiOverlay_module_css_default.composeInput,
								children: [
									file !== null && (0, react_jsx_runtime.jsxs)("div", {
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.filePreview,
										"data-image": previewUrl !== null || void 0,
										children: [
											previewUrl === null ? (0, react_jsx_runtime.jsx)("span", {
												className: _dsh_awiki_css_AwikiOverlay_module_css_default.filePreviewIcon,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {})
											}) : (0, react_jsx_runtime.jsx)("img", {
												src: previewUrl,
												alt: file.name
											}),
											previewUrl === null && (0, react_jsx_runtime.jsx)("span", {
												className: _dsh_awiki_css_AwikiOverlay_module_css_default.filePreviewName,
												children: file.name
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: _dsh_awiki_css_AwikiOverlay_module_css_default.removeFile,
												"aria-label": `移除附件 ${file.name}`,
												onClick: clearFile,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 12 })
											})
										]
									}),
									(0, react_jsx_runtime.jsx)("textarea", {
										value: text,
										onChange: (event) => {
											setText(event.target.value);
										},
										onKeyDown: (event) => {
											if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
											event.preventDefault();
											if (view.pending === null && sendingDraft === null && (file !== null || text.trim() !== "")) sendMessage();
										},
										placeholder: "输入消息",
										rows: 2
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.composeActions,
										children: [
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: "添加附件",
												side: "top",
												children: (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: _dsh_awiki_css_AwikiOverlay_module_css_default.filePicker,
													"aria-label": "添加附件",
													disabled: view.pending !== null || sendingDraft !== null,
													onClick: () => {
														input.current?.click();
													},
													children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {})
												})
											}),
											(0, react_jsx_runtime.jsx)("input", {
												ref: input,
												type: "file",
												className: _dsh_awiki_css_AwikiOverlay_module_css_default.fileInput,
												"aria-label": "选择一个附件",
												onChange: (event) => {
													setFile(event.target.files?.[0] ?? null);
													setFileError(null);
												}
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: _dsh_awiki_css_AwikiOverlay_module_css_default.send,
												"aria-label": "发送消息",
												disabled: view.pending !== null || sendingDraft !== null || file === null && text.trim() === "",
												onClick: () => {
													sendMessage();
												},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {})
											})
										]
									})
								]
							})]
						})
					] })
				})]
			});
		}
		/**
		* Render the frame-wide AWiki trigger and right-side drawer.
		* @param props - slot-derived runtime, store, and injected AWiki operations.
		* @returns the persistent trigger and the conditionally mounted drawer.
		*/
		function AwikiOverlay(props) {
			const open = props.useStore((state) => state.open);
			const view = props.useAwiki((state) => state);
			const titleId = (0, react.useId)();
			const composeTitleId = (0, react.useId)();
			const [accountMenuOpen, setAccountMenuOpen] = (0, react.useState)(false);
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [composeDirect, setComposeDirect] = (0, react.useState)(false);
			const [peerHandle, setPeerHandle] = (0, react.useState)("");
			const [composeError, setComposeError] = (0, react.useState)(null);
			const [logoutOpen, setLogoutOpen] = (0, react.useState)(false);
			const [logoutPending, setLogoutPending] = (0, react.useState)(false);
			const [logoutError, setLogoutError] = (0, react.useState)(null);
			const [launcherPosition, setLauncherPosition] = (0, react.useState)(readLauncherPosition);
			const [launcherDragging, setLauncherDragging] = (0, react.useState)(false);
			const [drawerDragging, setDrawerDragging] = (0, react.useState)(false);
			const [drawerDragDirection, setDrawerDragDirection] = (0, react.useState)(null);
			const launcherRef = (0, react.useRef)(null);
			const rememberedConversationId = (0, react.useRef)(null);
			const drawerWasOpen = (0, react.useRef)(open);
			const suppressLauncherClick = (0, react.useRef)(false);
			const launcherDrag = (0, react.useRef)(null);
			const drawerDrag = (0, react.useRef)(null);
			const registered = view.status === "ready" && view.identity !== null;
			const unreadCount = view.conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0);
			const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
			const drawerPlacement = resolveAwikiDrawerPlacement(launcherPosition, Math.min(DRAWER_NOMINAL_WIDTH, Math.max(1, window.innerWidth - DRAWER_HORIZONTAL_RESERVE)), Math.min(DRAWER_NOMINAL_HEIGHT, Math.max(1, window.innerHeight - 16)), window.innerWidth, window.innerHeight, drawerDragDirection ?? void 0);
			(0, react.useEffect)(() => {
				props.open();
				return props.close;
			}, [props.close, props.open]);
			(0, react.useEffect)(() => () => {
				const drag = drawerDrag.current;
				if (drag !== null) clearTimeout(drag.timer);
			}, []);
			(0, react.useEffect)(() => {
				const wasOpen = drawerWasOpen.current;
				drawerWasOpen.current = open;
				if (open) {
					if (view.selectedConversationId !== null) rememberedConversationId.current = view.selectedConversationId;
					else if (!wasOpen && rememberedConversationId.current !== null) {
						const remembered = rememberedConversationId.current;
						if (view.conversations.some((conversation) => conversation.id === remembered)) props.selectConversation(remembered);
						else rememberedConversationId.current = null;
					}
					return;
				}
				setAccountMenuOpen(false);
				setMenuOpen(false);
				setComposeDirect(false);
				setPeerHandle("");
				setComposeError(null);
				const drag = drawerDrag.current;
				if (drag !== null) clearTimeout(drag.timer);
				drawerDrag.current = null;
				setDrawerDragging(false);
				setDrawerDragDirection(null);
				if (wasOpen && view.selectedConversationId !== null) {
					rememberedConversationId.current = view.selectedConversationId;
					props.selectConversation(null);
				}
			}, [
				open,
				props.selectConversation,
				view.conversations,
				view.selectedConversationId
			]);
			const selectConversation = (conversationId) => {
				rememberedConversationId.current = conversationId;
				return props.selectConversation(conversationId);
			};
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					if (logoutOpen) {
						if (!logoutPending) setLogoutOpen(false);
						return;
					}
					if (composeDirect) {
						setComposeDirect(false);
						return;
					}
					if (menuOpen) {
						setMenuOpen(false);
						return;
					}
					if (accountMenuOpen) {
						setAccountMenuOpen(false);
						return;
					}
					props.actions.close();
					launcherRef.current?.focus();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [
				open,
				accountMenuOpen,
				composeDirect,
				logoutOpen,
				logoutPending,
				menuOpen,
				props.actions
			]);
			(0, react.useEffect)(() => {
				const onResize = () => {
					setLauncherPosition((current) => {
						const next = clampAwikiLauncherPosition(current, window.innerWidth, window.innerHeight);
						saveLauncherPosition(next);
						return next;
					});
				};
				window.addEventListener("resize", onResize);
				return () => {
					window.removeEventListener("resize", onResize);
				};
			}, []);
			const onLauncherPointerDown = (event) => {
				if (event.button !== 0) return;
				launcherDrag.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					origin: launcherPosition,
					moved: false,
					current: launcherPosition
				};
				callPointerCapture(event.currentTarget, "setPointerCapture", event.pointerId);
			};
			const onLauncherPointerMove = (event) => {
				const drag = launcherDrag.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				const deltaX = event.clientX - drag.startX;
				const deltaY = event.clientY - drag.startY;
				if (!drag.moved && Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD) return;
				drag.moved = true;
				setLauncherDragging(true);
				drag.current = clampAwikiLauncherPosition({
					left: drag.origin.left + deltaX,
					top: drag.origin.top + deltaY
				}, window.innerWidth, window.innerHeight);
				setLauncherPosition(drag.current);
			};
			const finishLauncherDrag = (event) => {
				const drag = launcherDrag.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				if (drag.moved) {
					suppressLauncherClick.current = true;
					saveLauncherPosition(drag.current);
				}
				launcherDrag.current = null;
				setLauncherDragging(false);
				callPointerCapture(event.currentTarget, "releasePointerCapture", event.pointerId);
			};
			const onDrawerPointerDown = (event) => {
				if (event.button !== 0 || event.target.closest("button, input, textarea, a, [role=\"button\"]") !== null) return;
				const drag = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					origin: launcherPosition,
					timer: void 0,
					armed: false,
					moved: false,
					current: launcherPosition
				};
				drag.timer = setTimeout(() => {
					if (drawerDrag.current !== drag) return;
					drag.armed = true;
					setDrawerDragging(true);
					setDrawerDragDirection(drawerPlacement.direction);
				}, DRAWER_LONG_PRESS_MS);
				drawerDrag.current = drag;
				callPointerCapture(event.currentTarget, "setPointerCapture", event.pointerId);
			};
			const onDrawerPointerMove = (event) => {
				const drag = drawerDrag.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				const deltaX = event.clientX - drag.startX;
				const deltaY = event.clientY - drag.startY;
				if (!drag.armed) {
					if (Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD) return;
					clearTimeout(drag.timer);
					drawerDrag.current = null;
					callPointerCapture(event.currentTarget, "releasePointerCapture", event.pointerId);
					return;
				}
				event.preventDefault();
				drag.moved = true;
				drag.current = clampAwikiLauncherPosition({
					left: drag.origin.left + deltaX,
					top: drag.origin.top + deltaY
				}, window.innerWidth, window.innerHeight);
				setLauncherPosition(drag.current);
			};
			const finishDrawerDrag = (event) => {
				const drag = drawerDrag.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				clearTimeout(drag.timer);
				if (drag.moved) saveLauncherPosition(drag.current);
				drawerDrag.current = null;
				setDrawerDragging(false);
				setDrawerDragDirection(null);
				callPointerCapture(event.currentTarget, "releasePointerCapture", event.pointerId);
			};
			const toggleLauncher = () => {
				if (suppressLauncherClick.current) {
					suppressLauncherClick.current = false;
					return;
				}
				props.actions.toggle();
			};
			const startDirect = async () => {
				setComposeError(null);
				const result = await props.startDirectChat(peerHandle);
				if (!result.ok) {
					setComposeError(result.error);
					return;
				}
				setComposeDirect(false);
				setPeerHandle("");
			};
			const logout = async () => {
				setLogoutPending(true);
				setLogoutError(null);
				const result = await props.logout();
				setLogoutPending(false);
				if (!result.ok) {
					setLogoutError(result.error);
					return;
				}
				rememberedConversationId.current = null;
				setLogoutOpen(false);
			};
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
				ref: launcherRef,
				type: "button",
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.trigger,
				style: {
					left: launcherPosition.left,
					top: launcherPosition.top
				},
				"data-dragging": launcherDragging || void 0,
				"aria-label": open ? "收起 AWiki" : unreadCount > 0 ? `打开 AWiki，${unreadCount} 条未读消息` : "打开 AWiki",
				"aria-expanded": open,
				"aria-haspopup": "dialog",
				title: "AWiki",
				onClick: toggleLauncher,
				onPointerDown: onLauncherPointerDown,
				onPointerMove: onLauncherPointerMove,
				onPointerUp: finishLauncherDrag,
				onPointerCancel: finishLauncherDrag,
				children: [(0, react_jsx_runtime.jsx)("img", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.launcherIcon,
					src: AWIKI_ME_APP_ICON_DATA_URL,
					alt: "",
					"aria-hidden": "true",
					draggable: "false"
				}), unreadCount > 0 && (0, react_jsx_runtime.jsx)("span", {
					className: _dsh_awiki_css_AwikiOverlay_module_css_default.unreadBadge,
					"aria-hidden": "true",
					children: unreadLabel
				})]
			}), open && (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiOverlay_module_css_default.drawer,
				style: {
					left: drawerPlacement.left,
					top: drawerPlacement.top
				},
				"data-placement": drawerPlacement.direction,
				role: "dialog",
				"aria-modal": "false",
				"aria-labelledby": titleId,
				children: [
					(0, react_jsx_runtime.jsxs)("header", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.drawerHeader,
						"data-dragging": drawerDragging || void 0,
						title: "长按拖动 AWiki",
						onPointerDown: onDrawerPointerDown,
						onPointerMove: onDrawerPointerMove,
						onPointerUp: finishDrawerDrag,
						onPointerCancel: finishDrawerDrag,
						children: [
							(0, react_jsx_runtime.jsxs)("div", { children: [registered ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: accountMenuOpen,
								onClose: () => {
									setAccountMenuOpen(false);
								},
								align: "start",
								portal: true,
								compact: true,
								items: [{
									id: "logout",
									label: "退出登录",
									danger: true
								}],
								onSelect: () => {
									setAccountMenuOpen(false);
									setLogoutError(null);
									setLogoutOpen(true);
								},
								anchor: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "AWiki 账户菜单",
									"aria-expanded": accountMenuOpen,
									"aria-haspopup": "menu",
									onClick: () => {
										setAccountMenuOpen((value) => !value);
									},
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 18 })
								})
							}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 18 }), (0, react_jsx_runtime.jsx)("h2", {
								id: titleId,
								children: "AWiki"
							})] }),
							registered && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: menuOpen,
								onClose: () => {
									setMenuOpen(false);
								},
								align: "end",
								portal: true,
								compact: true,
								items: [{
									id: "direct",
									label: "发起私聊"
								}],
								onSelect: () => {
									setMenuOpen(false);
									setComposeDirect(true);
								},
								anchor: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "发起会话",
									"aria-expanded": menuOpen,
									"aria-haspopup": "menu",
									onClick: () => {
										setMenuOpen((value) => !value);
									},
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
								})
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "刷新 AWiki",
								disabled: view.pending !== null,
								onClick: () => {
									props.open();
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, {})
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭 AWiki",
								onClick: props.actions.close,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
							})
						]
					}),
					view.status === "loading" && (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.centerState,
						role: "status",
						children: "正在连接 AWiki…"
					}),
					view.status === "error" && (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.centerState,
						children: [(0, react_jsx_runtime.jsx)("p", { children: view.error }), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.primary,
							onClick: () => {
								props.open();
							},
							children: "重试"
						})]
					}),
					view.status === "ready" && view.sessionStatus === "unregistered" && (0, react_jsx_runtime.jsx)(AwikiRegistrationForm, {
						...props,
						pending: view.pending !== null
					}),
					view.status === "ready" && view.sessionStatus === "signed-out" && (0, react_jsx_runtime.jsx)(SignedOut, {
						login: props.login,
						pending: view.pending !== null
					}),
					view.status === "ready" && view.sessionStatus === "active" && view.identity !== null && (0, react_jsx_runtime.jsx)(Chat, {
						...props,
						selectConversation,
						view: {
							...view,
							identity: view.identity
						}
					}),
					composeDirect && (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.composeBackdrop,
						children: (0, react_jsx_runtime.jsxs)("form", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.composeCard,
							role: "dialog",
							"aria-modal": "true",
							"aria-labelledby": composeTitleId,
							onSubmit: (event) => {
								event.preventDefault();
								startDirect();
							},
							children: [
								(0, react_jsx_runtime.jsx)("h3", {
									id: composeTitleId,
									children: "发起私聊"
								}),
								(0, react_jsx_runtime.jsx)("p", { children: "输入对方 Handle。打开会话前会先确认该用户存在。" }),
								(0, react_jsx_runtime.jsxs)("label", { children: ["Handle", (0, react_jsx_runtime.jsx)("input", {
									value: peerHandle,
									onChange: (event) => {
										setPeerHandle(event.target.value);
										setComposeError(null);
									},
									autoComplete: "off",
									placeholder: "例如 alice",
									autoFocus: true
								})] }),
								view.pending === "查找用户" && (0, react_jsx_runtime.jsx)("p", {
									role: "status",
									children: "正在查找用户…"
								}),
								composeError !== null && (0, react_jsx_runtime.jsx)("p", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.inlineError,
									role: "alert",
									children: composeError
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.composeActions,
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.secondary,
										onClick: () => {
											setComposeDirect(false);
											setComposeError(null);
										},
										children: "取消"
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "submit",
										className: _dsh_awiki_css_AwikiOverlay_module_css_default.primary,
										disabled: view.pending !== null || peerHandle.trim() === "",
										children: "打开会话"
									})]
								})
							]
						})
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: logoutOpen,
						onClose: () => {
							if (!logoutPending) setLogoutOpen(false);
						},
						title: "退出登录",
						closeLabel: "取消",
						description: "退出后，本机将暂停使用 AWiki；身份和本地数据都会保留。",
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							disabled: logoutPending,
							onClick: () => {
								setLogoutOpen(false);
							},
							children: "取消"
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.logoutConfirm,
							disabled: logoutPending,
							onClick: () => {
								logout();
							},
							children: logoutPending ? "正在退出…" : "确认退出"
						})] }),
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiOverlay_module_css_default.logoutWarning,
							children: [
								(0, react_jsx_runtime.jsx)("p", { children: "退出期间，Web UI 和 Agent 都不能读取会话或使用该身份发送消息。" }),
								(0, react_jsx_runtime.jsx)("p", { children: "稍后点击“重新进入”即可由本机 Rust SDK 恢复同一个 DID、Handle 和消息数据库。" }),
								logoutError !== null && (0, react_jsx_runtime.jsx)("p", {
									className: _dsh_awiki_css_AwikiOverlay_module_css_default.inlineError,
									role: "alert",
									children: logoutError
								})
							]
						})
					}),
					view.error !== null && view.status !== "error" && (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.error,
						role: "alert",
						children: view.error
					}),
					view.pending !== null && view.pending !== "发送消息" && view.pending !== "发送附件" && view.pending !== "加载消息" && (0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOverlay_module_css_default.pending,
						role: "status",
						children: [view.pending, "…"]
					})
				]
			})] });
		}
		//#endregion
		//#region \0dsh-awiki-css:AwikiOnboarding.module.css.mjs
		const css$1 = ".n7TPPG_dialog{width:min(520px,100vw - 32px)}.n7TPPG_modalContent{max-height:min(760px,100vh - 32px);overflow:auto}.n7TPPG_content{color:var(--dsw-alias-label-primary);flex-direction:column;gap:18px;display:flex}.n7TPPG_description,.n7TPPG_notice,.n7TPPG_error{margin:0}.n7TPPG_description,.n7TPPG_notice,.n7TPPG_error,.n7TPPG_accountRow{font-size:14px;line-height:22px}.n7TPPG_description{color:var(--dsw-alias-label-secondary)}.n7TPPG_notice{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:10px 12px}.n7TPPG_error{color:var(--dsw-alias-state-error-primary)}.n7TPPG_accountRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;justify-content:space-between;align-items:center;gap:16px;padding:14px;display:flex}.n7TPPG_actions{flex-wrap:wrap;justify-content:flex-end;gap:8px;display:flex}@media (width<=520px){.n7TPPG_actions>button{flex:100%}}";
		const tagId$1 = "@awiki/dsh-plugin/AwikiOnboarding.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@awiki/dsh-plugin";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var _dsh_awiki_css_AwikiOnboarding_module_css_default = {
			"accountRow": "n7TPPG_accountRow",
			"actions": "n7TPPG_actions",
			"content": "n7TPPG_content",
			"description": "n7TPPG_description",
			"dialog": "n7TPPG_dialog",
			"error": "n7TPPG_error",
			"modalContent": "n7TPPG_modalContent",
			"notice": "n7TPPG_notice"
		};
		//#endregion
		//#region lib/types/client/AwikiOnboarding.js
		/** AWiki identity and model opt-in step shown before the official API-key step. */
		function AwikiOnboarding(props) {
			const { t } = props;
			const dismiss = props.dismiss ?? props.complete;
			const identity = props.useAwikiOnboarding((value) => value);
			const models = props.useAwikiModelProxy((value) => value);
			(0, react.useEffect)(() => {
				if (identity.status === "cold") props.identity.loadSession();
			}, [identity.status, props.identity]);
			(0, react.useEffect)(() => {
				if (identity.status === "ready" && identity.sessionStatus === "active") props.models.load();
			}, [
				identity.sessionStatus,
				identity.status,
				props.models
			]);
			(0, react.useEffect)(() => {
				if (models.account?.enabled === true) props.complete();
			}, [models.account?.enabled, props.complete]);
			if (identity.status === "cold" || identity.status === "loading" || models.account?.enabled === true) return null;
			const alternatives = (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				type: "button",
				variant: "outline",
				onClick: props.complete,
				children: t("onboardingUseApiKey")
			}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				type: "button",
				variant: "outline",
				onClick: dismiss,
				children: t("onboardingLater")
			})] });
			if (identity.status === "error") return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingConnectTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [(0, react_jsx_runtime.jsx)("p", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.description,
					children: identity.error ?? t("onboardingIdentityUnavailable")
				}), (0, react_jsx_runtime.jsx)("div", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.actions,
					children: alternatives
				})]
			});
			if (identity.sessionStatus === "unregistered") return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingModelTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOnboarding_module_css_default.description,
						children: t("onboardingRegistrationDescription")
					}),
					(0, react_jsx_runtime.jsx)(AwikiRegistrationForm, {
						pending: identity.pending !== null,
						autoFocusHandle: true,
						sendRegistrationOtp: (request) => props.identity.sendRegistrationOtp(request),
						registerIdentity: (request) => props.identity.registerIdentity(request)
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiOnboarding_module_css_default.actions,
						children: alternatives
					})
				]
			});
			if (identity.sessionStatus === "signed-out") return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingRestoreTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [(0, react_jsx_runtime.jsx)("p", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.description,
					children: t("onboardingRestoreDescription")
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.actions,
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						disabled: identity.pending !== null,
						onClick: () => {
							props.identity.login();
						},
						children: t("onboardingRestore")
					}), alternatives]
				})]
			});
			if ((models.status === "idle" || models.status === "loading") && models.account === null) return null;
			const account = models.account?.account;
			const pendingOrder = models.account?.pending_recharge_order ?? null;
			const accessUnavailable = account?.model_access_available === false;
			return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingEnableTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [models.status === "unavailable" || account === void 0 ? (0, react_jsx_runtime.jsx)("p", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.error,
					role: "alert",
					children: models.error ?? t("modelAccountUnavailable")
				}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiOnboarding_module_css_default.accountRow,
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("accountBalance") }), (0, react_jsx_runtime.jsxs)("strong", { children: [
							account.balance,
							" ",
							account.currency
						] })]
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOnboarding_module_css_default.description,
						children: account.billing_mode === "development_bypass" ? t("onboardingBypassDescription") : pendingOrder !== null ? t("onboardingPendingRechargeDescription") : account.model_access_reason === "insufficient_balance" ? t("onboardingInsufficientBalanceDescription") : t("onboardingStrictDescription")
					}),
					!account.payments_available && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiOnboarding_module_css_default.notice,
						children: t("paymentsUnavailable")
					})
				] }), (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.actions,
					children: [pendingOrder !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						onClick: () => {
							props.openSection("awiki");
						},
						children: t("continuePayment")
					}) : accessUnavailable ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						disabled: account?.payments_available !== true,
						onClick: () => {
							props.openSection("awiki");
						},
						children: t("goToRecharge")
					}) : account !== void 0 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						disabled: models.pending !== null || models.status === "loading",
						onClick: () => {
							props.models.setEnabled(true);
						},
						children: models.pending === "enable" ? t("enablingModels") : t("enableModels")
					}) : null, alternatives]
				})]
			});
		}
		function OnboardingModal({ title, closeLabel, onClose, children }) {
			(0, react.useEffect)(() => {
				const root = document.getElementById("root");
				if (root === null) return;
				const previous = root.inert;
				root.inert = true;
				return () => {
					root.inert = previous;
				};
			}, []);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				title,
				closeLabel,
				onClose,
				className: _dsh_awiki_css_AwikiOnboarding_module_css_default.dialog ?? "",
				contentClassName: _dsh_awiki_css_AwikiOnboarding_module_css_default.modalContent,
				children: (0, react_jsx_runtime.jsx)("div", {
					className: _dsh_awiki_css_AwikiOnboarding_module_css_default.content,
					children
				})
			});
		}
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/can-promise.js
		var require_can_promise = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = function() {
				return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/utils.js
		var require_utils$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
			let toSJISFunction;
			const CODEWORDS_COUNT = [
				0,
				26,
				44,
				70,
				100,
				134,
				172,
				196,
				242,
				292,
				346,
				404,
				466,
				532,
				581,
				655,
				733,
				815,
				901,
				991,
				1085,
				1156,
				1258,
				1364,
				1474,
				1588,
				1706,
				1828,
				1921,
				2051,
				2185,
				2323,
				2465,
				2611,
				2761,
				2876,
				3034,
				3196,
				3362,
				3532,
				3706
			];
			/**
			* Returns the QR Code size for the specified version
			*
			* @param  {Number} version QR Code version
			* @return {Number}         size of QR code
			*/
			exports.getSymbolSize = function getSymbolSize(version) {
				if (!version) throw new Error("\"version\" cannot be null or undefined");
				if (version < 1 || version > 40) throw new Error("\"version\" should be in range from 1 to 40");
				return version * 4 + 17;
			};
			/**
			* Returns the total number of codewords used to store data and EC information.
			*
			* @param  {Number} version QR Code version
			* @return {Number}         Data length in bits
			*/
			exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
				return CODEWORDS_COUNT[version];
			};
			/**
			* Encode data with Bose-Chaudhuri-Hocquenghem
			*
			* @param  {Number} data Value to encode
			* @return {Number}      Encoded value
			*/
			exports.getBCHDigit = function(data) {
				let digit = 0;
				while (data !== 0) {
					digit++;
					data >>>= 1;
				}
				return digit;
			};
			exports.setToSJISFunction = function setToSJISFunction(f) {
				if (typeof f !== "function") throw new Error("\"toSJISFunc\" is not a valid function.");
				toSJISFunction = f;
			};
			exports.isKanjiModeEnabled = function() {
				return typeof toSJISFunction !== "undefined";
			};
			exports.toSJIS = function toSJIS(kanji) {
				return toSJISFunction(kanji);
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-level.js
		var require_error_correction_level = /* @__PURE__ */ __commonJSMin(((exports) => {
			exports.L = { bit: 1 };
			exports.M = { bit: 0 };
			exports.Q = { bit: 3 };
			exports.H = { bit: 2 };
			function fromString(string) {
				if (typeof string !== "string") throw new Error("Param is not a string");
				switch (string.toLowerCase()) {
					case "l":
					case "low": return exports.L;
					case "m":
					case "medium": return exports.M;
					case "q":
					case "quartile": return exports.Q;
					case "h":
					case "high": return exports.H;
					default: throw new Error("Unknown EC Level: " + string);
				}
			}
			exports.isValid = function isValid(level) {
				return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
			};
			exports.from = function from(value, defaultValue) {
				if (exports.isValid(value)) return value;
				try {
					return fromString(value);
				} catch (e) {
					return defaultValue;
				}
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-buffer.js
		var require_bit_buffer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			function BitBuffer() {
				this.buffer = [];
				this.length = 0;
			}
			BitBuffer.prototype = {
				get: function(index) {
					const bufIndex = Math.floor(index / 8);
					return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
				},
				put: function(num, length) {
					for (let i = 0; i < length; i++) this.putBit((num >>> length - i - 1 & 1) === 1);
				},
				getLengthInBits: function() {
					return this.length;
				},
				putBit: function(bit) {
					const bufIndex = Math.floor(this.length / 8);
					if (this.buffer.length <= bufIndex) this.buffer.push(0);
					if (bit) this.buffer[bufIndex] |= 128 >>> this.length % 8;
					this.length++;
				}
			};
			module.exports = BitBuffer;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-matrix.js
		var require_bit_matrix = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			/**
			* Helper class to handle QR Code symbol modules
			*
			* @param {Number} size Symbol size
			*/
			function BitMatrix(size) {
				if (!size || size < 1) throw new Error("BitMatrix size must be defined and greater than 0");
				this.size = size;
				this.data = new Uint8Array(size * size);
				this.reservedBit = new Uint8Array(size * size);
			}
			/**
			* Set bit value at specified location
			* If reserved flag is set, this bit will be ignored during masking process
			*
			* @param {Number}  row
			* @param {Number}  col
			* @param {Boolean} value
			* @param {Boolean} reserved
			*/
			BitMatrix.prototype.set = function(row, col, value, reserved) {
				const index = row * this.size + col;
				this.data[index] = value;
				if (reserved) this.reservedBit[index] = true;
			};
			/**
			* Returns bit value at specified location
			*
			* @param  {Number}  row
			* @param  {Number}  col
			* @return {Boolean}
			*/
			BitMatrix.prototype.get = function(row, col) {
				return this.data[row * this.size + col];
			};
			/**
			* Applies xor operator at specified location
			* (used during masking process)
			*
			* @param {Number}  row
			* @param {Number}  col
			* @param {Boolean} value
			*/
			BitMatrix.prototype.xor = function(row, col, value) {
				this.data[row * this.size + col] ^= value;
			};
			/**
			* Check if bit at specified location is reserved
			*
			* @param {Number}   row
			* @param {Number}   col
			* @return {Boolean}
			*/
			BitMatrix.prototype.isReserved = function(row, col) {
				return this.reservedBit[row * this.size + col];
			};
			module.exports = BitMatrix;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alignment-pattern.js
		var require_alignment_pattern = /* @__PURE__ */ __commonJSMin(((exports) => {
			/**
			* Alignment pattern are fixed reference pattern in defined positions
			* in a matrix symbology, which enables the decode software to re-synchronise
			* the coordinate mapping of the image modules in the event of moderate amounts
			* of distortion of the image.
			*
			* Alignment patterns are present only in QR Code symbols of version 2 or larger
			* and their number depends on the symbol version.
			*/
			const getSymbolSize = require_utils$1().getSymbolSize;
			/**
			* Calculate the row/column coordinates of the center module of each alignment pattern
			* for the specified QR Code version.
			*
			* The alignment patterns are positioned symmetrically on either side of the diagonal
			* running from the top left corner of the symbol to the bottom right corner.
			*
			* Since positions are simmetrical only half of the coordinates are returned.
			* Each item of the array will represent in turn the x and y coordinate.
			* @see {@link getPositions}
			*
			* @param  {Number} version QR Code version
			* @return {Array}          Array of coordinate
			*/
			exports.getRowColCoords = function getRowColCoords(version) {
				if (version === 1) return [];
				const posCount = Math.floor(version / 7) + 2;
				const size = getSymbolSize(version);
				const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
				const positions = [size - 7];
				for (let i = 1; i < posCount - 1; i++) positions[i] = positions[i - 1] - intervals;
				positions.push(6);
				return positions.reverse();
			};
			/**
			* Returns an array containing the positions of each alignment pattern.
			* Each array's element represent the center point of the pattern as (x, y) coordinates
			*
			* Coordinates are calculated expanding the row/column coordinates returned by {@link getRowColCoords}
			* and filtering out the items that overlaps with finder pattern
			*
			* @example
			* For a Version 7 symbol {@link getRowColCoords} returns values 6, 22 and 38.
			* The alignment patterns, therefore, are to be centered on (row, column)
			* positions (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
			* Note that the coordinates (6,6), (6,38), (38,6) are occupied by finder patterns
			* and are not therefore used for alignment patterns.
			*
			* let pos = getPositions(7)
			* // [[6,22], [22,6], [22,22], [22,38], [38,22], [38,38]]
			*
			* @param  {Number} version QR Code version
			* @return {Array}          Array of coordinates
			*/
			exports.getPositions = function getPositions(version) {
				const coords = [];
				const pos = exports.getRowColCoords(version);
				const posLength = pos.length;
				for (let i = 0; i < posLength; i++) for (let j = 0; j < posLength; j++) {
					if (i === 0 && j === 0 || i === 0 && j === posLength - 1 || i === posLength - 1 && j === 0) continue;
					coords.push([pos[i], pos[j]]);
				}
				return coords;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/finder-pattern.js
		var require_finder_pattern = /* @__PURE__ */ __commonJSMin(((exports) => {
			const getSymbolSize = require_utils$1().getSymbolSize;
			const FINDER_PATTERN_SIZE = 7;
			/**
			* Returns an array containing the positions of each finder pattern.
			* Each array's element represent the top-left point of the pattern as (x, y) coordinates
			*
			* @param  {Number} version QR Code version
			* @return {Array}          Array of coordinates
			*/
			exports.getPositions = function getPositions(version) {
				const size = getSymbolSize(version);
				return [
					[0, 0],
					[size - FINDER_PATTERN_SIZE, 0],
					[0, size - FINDER_PATTERN_SIZE]
				];
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mask-pattern.js
		var require_mask_pattern = /* @__PURE__ */ __commonJSMin(((exports) => {
			/**
			* Data mask pattern reference
			* @type {Object}
			*/
			exports.Patterns = {
				PATTERN000: 0,
				PATTERN001: 1,
				PATTERN010: 2,
				PATTERN011: 3,
				PATTERN100: 4,
				PATTERN101: 5,
				PATTERN110: 6,
				PATTERN111: 7
			};
			/**
			* Weighted penalty scores for the undesirable features
			* @type {Object}
			*/
			const PenaltyScores = {
				N1: 3,
				N2: 3,
				N3: 40,
				N4: 10
			};
			/**
			* Check if mask pattern value is valid
			*
			* @param  {Number}  mask    Mask pattern
			* @return {Boolean}         true if valid, false otherwise
			*/
			exports.isValid = function isValid(mask) {
				return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
			};
			/**
			* Returns mask pattern from a value.
			* If value is not valid, returns undefined
			*
			* @param  {Number|String} value        Mask pattern value
			* @return {Number}                     Valid mask pattern or undefined
			*/
			exports.from = function from(value) {
				return exports.isValid(value) ? parseInt(value, 10) : void 0;
			};
			/**
			* Find adjacent modules in row/column with the same color
			* and assign a penalty value.
			*
			* Points: N1 + i
			* i is the amount by which the number of adjacent modules of the same color exceeds 5
			*/
			exports.getPenaltyN1 = function getPenaltyN1(data) {
				const size = data.size;
				let points = 0;
				let sameCountCol = 0;
				let sameCountRow = 0;
				let lastCol = null;
				let lastRow = null;
				for (let row = 0; row < size; row++) {
					sameCountCol = sameCountRow = 0;
					lastCol = lastRow = null;
					for (let col = 0; col < size; col++) {
						let module$1 = data.get(row, col);
						if (module$1 === lastCol) sameCountCol++;
						else {
							if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
							lastCol = module$1;
							sameCountCol = 1;
						}
						module$1 = data.get(col, row);
						if (module$1 === lastRow) sameCountRow++;
						else {
							if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
							lastRow = module$1;
							sameCountRow = 1;
						}
					}
					if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
					if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
				}
				return points;
			};
			/**
			* Find 2x2 blocks with the same color and assign a penalty value
			*
			* Points: N2 * (m - 1) * (n - 1)
			*/
			exports.getPenaltyN2 = function getPenaltyN2(data) {
				const size = data.size;
				let points = 0;
				for (let row = 0; row < size - 1; row++) for (let col = 0; col < size - 1; col++) {
					const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
					if (last === 4 || last === 0) points++;
				}
				return points * PenaltyScores.N2;
			};
			/**
			* Find 1:1:3:1:1 ratio (dark:light:dark:light:dark) pattern in row/column,
			* preceded or followed by light area 4 modules wide
			*
			* Points: N3 * number of pattern found
			*/
			exports.getPenaltyN3 = function getPenaltyN3(data) {
				const size = data.size;
				let points = 0;
				let bitsCol = 0;
				let bitsRow = 0;
				for (let row = 0; row < size; row++) {
					bitsCol = bitsRow = 0;
					for (let col = 0; col < size; col++) {
						bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
						if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
						bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
						if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
					}
				}
				return points * PenaltyScores.N3;
			};
			/**
			* Calculate proportion of dark modules in entire symbol
			*
			* Points: N4 * k
			*
			* k is the rating of the deviation of the proportion of dark modules
			* in the symbol from 50% in steps of 5%
			*/
			exports.getPenaltyN4 = function getPenaltyN4(data) {
				let darkCount = 0;
				const modulesCount = data.data.length;
				for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
				return Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10) * PenaltyScores.N4;
			};
			/**
			* Return mask value at given position
			*
			* @param  {Number} maskPattern Pattern reference value
			* @param  {Number} i           Row
			* @param  {Number} j           Column
			* @return {Boolean}            Mask value
			*/
			function getMaskAt(maskPattern, i, j) {
				switch (maskPattern) {
					case exports.Patterns.PATTERN000: return (i + j) % 2 === 0;
					case exports.Patterns.PATTERN001: return i % 2 === 0;
					case exports.Patterns.PATTERN010: return j % 3 === 0;
					case exports.Patterns.PATTERN011: return (i + j) % 3 === 0;
					case exports.Patterns.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
					case exports.Patterns.PATTERN101: return i * j % 2 + i * j % 3 === 0;
					case exports.Patterns.PATTERN110: return (i * j % 2 + i * j % 3) % 2 === 0;
					case exports.Patterns.PATTERN111: return (i * j % 3 + (i + j) % 2) % 2 === 0;
					default: throw new Error("bad maskPattern:" + maskPattern);
				}
			}
			/**
			* Apply a mask pattern to a BitMatrix
			*
			* @param  {Number}    pattern Pattern reference number
			* @param  {BitMatrix} data    BitMatrix data
			*/
			exports.applyMask = function applyMask(pattern, data) {
				const size = data.size;
				for (let col = 0; col < size; col++) for (let row = 0; row < size; row++) {
					if (data.isReserved(row, col)) continue;
					data.xor(row, col, getMaskAt(pattern, row, col));
				}
			};
			/**
			* Returns the best mask pattern for data
			*
			* @param  {BitMatrix} data
			* @return {Number} Mask pattern reference number
			*/
			exports.getBestMask = function getBestMask(data, setupFormatFunc) {
				const numPatterns = Object.keys(exports.Patterns).length;
				let bestPattern = 0;
				let lowerPenalty = Infinity;
				for (let p = 0; p < numPatterns; p++) {
					setupFormatFunc(p);
					exports.applyMask(p, data);
					const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
					exports.applyMask(p, data);
					if (penalty < lowerPenalty) {
						lowerPenalty = penalty;
						bestPattern = p;
					}
				}
				return bestPattern;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-code.js
		var require_error_correction_code = /* @__PURE__ */ __commonJSMin(((exports) => {
			const ECLevel = require_error_correction_level();
			const EC_BLOCKS_TABLE = [
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				2,
				2,
				1,
				2,
				2,
				4,
				1,
				2,
				4,
				4,
				2,
				4,
				4,
				4,
				2,
				4,
				6,
				5,
				2,
				4,
				6,
				6,
				2,
				5,
				8,
				8,
				4,
				5,
				8,
				8,
				4,
				5,
				8,
				11,
				4,
				8,
				10,
				11,
				4,
				9,
				12,
				16,
				4,
				9,
				16,
				16,
				6,
				10,
				12,
				18,
				6,
				10,
				17,
				16,
				6,
				11,
				16,
				19,
				6,
				13,
				18,
				21,
				7,
				14,
				21,
				25,
				8,
				16,
				20,
				25,
				8,
				17,
				23,
				25,
				9,
				17,
				23,
				34,
				9,
				18,
				25,
				30,
				10,
				20,
				27,
				32,
				12,
				21,
				29,
				35,
				12,
				23,
				34,
				37,
				12,
				25,
				34,
				40,
				13,
				26,
				35,
				42,
				14,
				28,
				38,
				45,
				15,
				29,
				40,
				48,
				16,
				31,
				43,
				51,
				17,
				33,
				45,
				54,
				18,
				35,
				48,
				57,
				19,
				37,
				51,
				60,
				19,
				38,
				53,
				63,
				20,
				40,
				56,
				66,
				21,
				43,
				59,
				70,
				22,
				45,
				62,
				74,
				24,
				47,
				65,
				77,
				25,
				49,
				68,
				81
			];
			const EC_CODEWORDS_TABLE = [
				7,
				10,
				13,
				17,
				10,
				16,
				22,
				28,
				15,
				26,
				36,
				44,
				20,
				36,
				52,
				64,
				26,
				48,
				72,
				88,
				36,
				64,
				96,
				112,
				40,
				72,
				108,
				130,
				48,
				88,
				132,
				156,
				60,
				110,
				160,
				192,
				72,
				130,
				192,
				224,
				80,
				150,
				224,
				264,
				96,
				176,
				260,
				308,
				104,
				198,
				288,
				352,
				120,
				216,
				320,
				384,
				132,
				240,
				360,
				432,
				144,
				280,
				408,
				480,
				168,
				308,
				448,
				532,
				180,
				338,
				504,
				588,
				196,
				364,
				546,
				650,
				224,
				416,
				600,
				700,
				224,
				442,
				644,
				750,
				252,
				476,
				690,
				816,
				270,
				504,
				750,
				900,
				300,
				560,
				810,
				960,
				312,
				588,
				870,
				1050,
				336,
				644,
				952,
				1110,
				360,
				700,
				1020,
				1200,
				390,
				728,
				1050,
				1260,
				420,
				784,
				1140,
				1350,
				450,
				812,
				1200,
				1440,
				480,
				868,
				1290,
				1530,
				510,
				924,
				1350,
				1620,
				540,
				980,
				1440,
				1710,
				570,
				1036,
				1530,
				1800,
				570,
				1064,
				1590,
				1890,
				600,
				1120,
				1680,
				1980,
				630,
				1204,
				1770,
				2100,
				660,
				1260,
				1860,
				2220,
				720,
				1316,
				1950,
				2310,
				750,
				1372,
				2040,
				2430
			];
			/**
			* Returns the number of error correction block that the QR Code should contain
			* for the specified version and error correction level.
			*
			* @param  {Number} version              QR Code version
			* @param  {Number} errorCorrectionLevel Error correction level
			* @return {Number}                      Number of error correction blocks
			*/
			exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
				switch (errorCorrectionLevel) {
					case ECLevel.L: return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
					case ECLevel.M: return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
					case ECLevel.Q: return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
					case ECLevel.H: return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
					default: return;
				}
			};
			/**
			* Returns the number of error correction codewords to use for the specified
			* version and error correction level.
			*
			* @param  {Number} version              QR Code version
			* @param  {Number} errorCorrectionLevel Error correction level
			* @return {Number}                      Number of error correction codewords
			*/
			exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
				switch (errorCorrectionLevel) {
					case ECLevel.L: return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
					case ECLevel.M: return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
					case ECLevel.Q: return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
					case ECLevel.H: return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
					default: return;
				}
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/galois-field.js
		var require_galois_field = /* @__PURE__ */ __commonJSMin(((exports) => {
			const EXP_TABLE = /* @__PURE__ */ new Uint8Array(512);
			const LOG_TABLE = /* @__PURE__ */ new Uint8Array(256);
			(function initTables() {
				let x = 1;
				for (let i = 0; i < 255; i++) {
					EXP_TABLE[i] = x;
					LOG_TABLE[x] = i;
					x <<= 1;
					if (x & 256) x ^= 285;
				}
				for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
			})();
			/**
			* Returns log value of n inside Galois Field
			*
			* @param  {Number} n
			* @return {Number}
			*/
			exports.log = function log(n) {
				if (n < 1) throw new Error("log(" + n + ")");
				return LOG_TABLE[n];
			};
			/**
			* Returns anti-log value of n inside Galois Field
			*
			* @param  {Number} n
			* @return {Number}
			*/
			exports.exp = function exp(n) {
				return EXP_TABLE[n];
			};
			/**
			* Multiplies two number inside Galois Field
			*
			* @param  {Number} x
			* @param  {Number} y
			* @return {Number}
			*/
			exports.mul = function mul(x, y) {
				if (x === 0 || y === 0) return 0;
				return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/polynomial.js
		var require_polynomial = /* @__PURE__ */ __commonJSMin(((exports) => {
			const GF = require_galois_field();
			/**
			* Multiplies two polynomials inside Galois Field
			*
			* @param  {Uint8Array} p1 Polynomial
			* @param  {Uint8Array} p2 Polynomial
			* @return {Uint8Array}    Product of p1 and p2
			*/
			exports.mul = function mul(p1, p2) {
				const coeff = new Uint8Array(p1.length + p2.length - 1);
				for (let i = 0; i < p1.length; i++) for (let j = 0; j < p2.length; j++) coeff[i + j] ^= GF.mul(p1[i], p2[j]);
				return coeff;
			};
			/**
			* Calculate the remainder of polynomials division
			*
			* @param  {Uint8Array} divident Polynomial
			* @param  {Uint8Array} divisor  Polynomial
			* @return {Uint8Array}          Remainder
			*/
			exports.mod = function mod(divident, divisor) {
				let result = new Uint8Array(divident);
				while (result.length - divisor.length >= 0) {
					const coeff = result[0];
					for (let i = 0; i < divisor.length; i++) result[i] ^= GF.mul(divisor[i], coeff);
					let offset = 0;
					while (offset < result.length && result[offset] === 0) offset++;
					result = result.slice(offset);
				}
				return result;
			};
			/**
			* Generate an irreducible generator polynomial of specified degree
			* (used by Reed-Solomon encoder)
			*
			* @param  {Number} degree Degree of the generator polynomial
			* @return {Uint8Array}    Buffer containing polynomial coefficients
			*/
			exports.generateECPolynomial = function generateECPolynomial(degree) {
				let poly = new Uint8Array([1]);
				for (let i = 0; i < degree; i++) poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
				return poly;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/reed-solomon-encoder.js
		var require_reed_solomon_encoder = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Polynomial = require_polynomial();
			function ReedSolomonEncoder(degree) {
				this.genPoly = void 0;
				this.degree = degree;
				if (this.degree) this.initialize(this.degree);
			}
			/**
			* Initialize the encoder.
			* The input param should correspond to the number of error correction codewords.
			*
			* @param  {Number} degree
			*/
			ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
				this.degree = degree;
				this.genPoly = Polynomial.generateECPolynomial(this.degree);
			};
			/**
			* Encodes a chunk of data
			*
			* @param  {Uint8Array} data Buffer containing input data
			* @return {Uint8Array}      Buffer containing encoded data
			*/
			ReedSolomonEncoder.prototype.encode = function encode(data) {
				if (!this.genPoly) throw new Error("Encoder not initialized");
				const paddedData = new Uint8Array(data.length + this.degree);
				paddedData.set(data);
				const remainder = Polynomial.mod(paddedData, this.genPoly);
				const start = this.degree - remainder.length;
				if (start > 0) {
					const buff = new Uint8Array(this.degree);
					buff.set(remainder, start);
					return buff;
				}
				return remainder;
			};
			module.exports = ReedSolomonEncoder;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version-check.js
		var require_version_check = /* @__PURE__ */ __commonJSMin(((exports) => {
			/**
			* Check if QR Code version is valid
			*
			* @param  {Number}  version QR Code version
			* @return {Boolean}         true if valid version, false otherwise
			*/
			exports.isValid = function isValid(version) {
				return !isNaN(version) && version >= 1 && version <= 40;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/regex.js
		var require_regex = /* @__PURE__ */ __commonJSMin(((exports) => {
			const numeric = "[0-9]+";
			const alphanumeric = "[A-Z $%*+\\-./:]+";
			let kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
			kanji = kanji.replace(/u/g, "\\u");
			const byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
			exports.KANJI = new RegExp(kanji, "g");
			exports.BYTE_KANJI = /* @__PURE__ */ new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
			exports.BYTE = new RegExp(byte, "g");
			exports.NUMERIC = new RegExp(numeric, "g");
			exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
			const TEST_KANJI = new RegExp("^" + kanji + "$");
			const TEST_NUMERIC = /* @__PURE__ */ new RegExp("^[0-9]+$");
			const TEST_ALPHANUMERIC = /* @__PURE__ */ new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
			exports.testKanji = function testKanji(str) {
				return TEST_KANJI.test(str);
			};
			exports.testNumeric = function testNumeric(str) {
				return TEST_NUMERIC.test(str);
			};
			exports.testAlphanumeric = function testAlphanumeric(str) {
				return TEST_ALPHANUMERIC.test(str);
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mode.js
		var require_mode = /* @__PURE__ */ __commonJSMin(((exports) => {
			const VersionCheck = require_version_check();
			const Regex = require_regex();
			/**
			* Numeric mode encodes data from the decimal digit set (0 - 9)
			* (byte values 30HEX to 39HEX).
			* Normally, 3 data characters are represented by 10 bits.
			*
			* @type {Object}
			*/
			exports.NUMERIC = {
				id: "Numeric",
				bit: 1,
				ccBits: [
					10,
					12,
					14
				]
			};
			/**
			* Alphanumeric mode encodes data from a set of 45 characters,
			* i.e. 10 numeric digits (0 - 9),
			*      26 alphabetic characters (A - Z),
			*   and 9 symbols (SP, $, %, *, +, -, ., /, :).
			* Normally, two input characters are represented by 11 bits.
			*
			* @type {Object}
			*/
			exports.ALPHANUMERIC = {
				id: "Alphanumeric",
				bit: 2,
				ccBits: [
					9,
					11,
					13
				]
			};
			/**
			* In byte mode, data is encoded at 8 bits per character.
			*
			* @type {Object}
			*/
			exports.BYTE = {
				id: "Byte",
				bit: 4,
				ccBits: [
					8,
					16,
					16
				]
			};
			/**
			* The Kanji mode efficiently encodes Kanji characters in accordance with
			* the Shift JIS system based on JIS X 0208.
			* The Shift JIS values are shifted from the JIS X 0208 values.
			* JIS X 0208 gives details of the shift coded representation.
			* Each two-byte character value is compacted to a 13-bit binary codeword.
			*
			* @type {Object}
			*/
			exports.KANJI = {
				id: "Kanji",
				bit: 8,
				ccBits: [
					8,
					10,
					12
				]
			};
			/**
			* Mixed mode will contain a sequences of data in a combination of any of
			* the modes described above
			*
			* @type {Object}
			*/
			exports.MIXED = { bit: -1 };
			/**
			* Returns the number of bits needed to store the data length
			* according to QR Code specifications.
			*
			* @param  {Mode}   mode    Data mode
			* @param  {Number} version QR Code version
			* @return {Number}         Number of bits
			*/
			exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
				if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
				if (!VersionCheck.isValid(version)) throw new Error("Invalid version: " + version);
				if (version >= 1 && version < 10) return mode.ccBits[0];
				else if (version < 27) return mode.ccBits[1];
				return mode.ccBits[2];
			};
			/**
			* Returns the most efficient mode to store the specified data
			*
			* @param  {String} dataStr Input data string
			* @return {Mode}           Best mode
			*/
			exports.getBestModeForData = function getBestModeForData(dataStr) {
				if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
				else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
				else if (Regex.testKanji(dataStr)) return exports.KANJI;
				else return exports.BYTE;
			};
			/**
			* Return mode name as string
			*
			* @param {Mode} mode Mode object
			* @returns {String}  Mode name
			*/
			exports.toString = function toString(mode) {
				if (mode && mode.id) return mode.id;
				throw new Error("Invalid mode");
			};
			/**
			* Check if input param is a valid mode object
			*
			* @param   {Mode}    mode Mode object
			* @returns {Boolean} True if valid mode, false otherwise
			*/
			exports.isValid = function isValid(mode) {
				return mode && mode.bit && mode.ccBits;
			};
			/**
			* Get mode object from its name
			*
			* @param   {String} string Mode name
			* @returns {Mode}          Mode object
			*/
			function fromString(string) {
				if (typeof string !== "string") throw new Error("Param is not a string");
				switch (string.toLowerCase()) {
					case "numeric": return exports.NUMERIC;
					case "alphanumeric": return exports.ALPHANUMERIC;
					case "kanji": return exports.KANJI;
					case "byte": return exports.BYTE;
					default: throw new Error("Unknown mode: " + string);
				}
			}
			/**
			* Returns mode from a value.
			* If value is not a valid mode, returns defaultValue
			*
			* @param  {Mode|String} value        Encoding mode
			* @param  {Mode}        defaultValue Fallback value
			* @return {Mode}                     Encoding mode
			*/
			exports.from = function from(value, defaultValue) {
				if (exports.isValid(value)) return value;
				try {
					return fromString(value);
				} catch (e) {
					return defaultValue;
				}
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version.js
		var require_version = /* @__PURE__ */ __commonJSMin(((exports) => {
			const Utils = require_utils$1();
			const ECCode = require_error_correction_code();
			const ECLevel = require_error_correction_level();
			const Mode = require_mode();
			const VersionCheck = require_version_check();
			const G18 = 7973;
			const G18_BCH = Utils.getBCHDigit(G18);
			function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
				for (let currentVersion = 1; currentVersion <= 40; currentVersion++) if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) return currentVersion;
			}
			function getReservedBitsCount(mode, version) {
				return Mode.getCharCountIndicator(mode, version) + 4;
			}
			function getTotalBitsFromDataArray(segments, version) {
				let totalBits = 0;
				segments.forEach(function(data) {
					const reservedBits = getReservedBitsCount(data.mode, version);
					totalBits += reservedBits + data.getBitsLength();
				});
				return totalBits;
			}
			function getBestVersionForMixedData(segments, errorCorrectionLevel) {
				for (let currentVersion = 1; currentVersion <= 40; currentVersion++) if (getTotalBitsFromDataArray(segments, currentVersion) <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) return currentVersion;
			}
			/**
			* Returns version number from a value.
			* If value is not a valid version, returns defaultValue
			*
			* @param  {Number|String} value        QR Code version
			* @param  {Number}        defaultValue Fallback value
			* @return {Number}                     QR Code version number
			*/
			exports.from = function from(value, defaultValue) {
				if (VersionCheck.isValid(value)) return parseInt(value, 10);
				return defaultValue;
			};
			/**
			* Returns how much data can be stored with the specified QR code version
			* and error correction level
			*
			* @param  {Number} version              QR Code version (1-40)
			* @param  {Number} errorCorrectionLevel Error correction level
			* @param  {Mode}   mode                 Data mode
			* @return {Number}                      Quantity of storable data
			*/
			exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
				if (!VersionCheck.isValid(version)) throw new Error("Invalid QR Code version");
				if (typeof mode === "undefined") mode = Mode.BYTE;
				const dataTotalCodewordsBits = (Utils.getSymbolTotalCodewords(version) - ECCode.getTotalCodewordsCount(version, errorCorrectionLevel)) * 8;
				if (mode === Mode.MIXED) return dataTotalCodewordsBits;
				const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
				switch (mode) {
					case Mode.NUMERIC: return Math.floor(usableBits / 10 * 3);
					case Mode.ALPHANUMERIC: return Math.floor(usableBits / 11 * 2);
					case Mode.KANJI: return Math.floor(usableBits / 13);
					case Mode.BYTE:
					default: return Math.floor(usableBits / 8);
				}
			};
			/**
			* Returns the minimum version needed to contain the amount of data
			*
			* @param  {Segment} data                    Segment of data
			* @param  {Number} [errorCorrectionLevel=H] Error correction level
			* @param  {Mode} mode                       Data mode
			* @return {Number}                          QR Code version
			*/
			exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
				let seg;
				const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
				if (Array.isArray(data)) {
					if (data.length > 1) return getBestVersionForMixedData(data, ecl);
					if (data.length === 0) return 1;
					seg = data[0];
				} else seg = data;
				return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
			};
			/**
			* Returns version information with relative error correction bits
			*
			* The version information is included in QR Code symbols of version 7 or larger.
			* It consists of an 18-bit sequence containing 6 data bits,
			* with 12 error correction bits calculated using the (18, 6) Golay code.
			*
			* @param  {Number} version QR Code version
			* @return {Number}         Encoded version info bits
			*/
			exports.getEncodedBits = function getEncodedBits(version) {
				if (!VersionCheck.isValid(version) || version < 7) throw new Error("Invalid QR Code version");
				let d = version << 12;
				while (Utils.getBCHDigit(d) - G18_BCH >= 0) d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
				return version << 12 | d;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/format-info.js
		var require_format_info = /* @__PURE__ */ __commonJSMin(((exports) => {
			const Utils = require_utils$1();
			const G15 = 1335;
			const G15_MASK = 21522;
			const G15_BCH = Utils.getBCHDigit(G15);
			/**
			* Returns format information with relative error correction bits
			*
			* The format information is a 15-bit sequence containing 5 data bits,
			* with 10 error correction bits calculated using the (15, 5) BCH code.
			*
			* @param  {Number} errorCorrectionLevel Error correction level
			* @param  {Number} mask                 Mask pattern
			* @return {Number}                      Encoded format information bits
			*/
			exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
				const data = errorCorrectionLevel.bit << 3 | mask;
				let d = data << 10;
				while (Utils.getBCHDigit(d) - G15_BCH >= 0) d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
				return (data << 10 | d) ^ G15_MASK;
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/numeric-data.js
		var require_numeric_data = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Mode = require_mode();
			function NumericData(data) {
				this.mode = Mode.NUMERIC;
				this.data = data.toString();
			}
			NumericData.getBitsLength = function getBitsLength(length) {
				return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
			};
			NumericData.prototype.getLength = function getLength() {
				return this.data.length;
			};
			NumericData.prototype.getBitsLength = function getBitsLength() {
				return NumericData.getBitsLength(this.data.length);
			};
			NumericData.prototype.write = function write(bitBuffer) {
				let i, group, value;
				for (i = 0; i + 3 <= this.data.length; i += 3) {
					group = this.data.substr(i, 3);
					value = parseInt(group, 10);
					bitBuffer.put(value, 10);
				}
				const remainingNum = this.data.length - i;
				if (remainingNum > 0) {
					group = this.data.substr(i);
					value = parseInt(group, 10);
					bitBuffer.put(value, remainingNum * 3 + 1);
				}
			};
			module.exports = NumericData;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alphanumeric-data.js
		var require_alphanumeric_data = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Mode = require_mode();
			/**
			* Array of characters available in alphanumeric mode
			*
			* As per QR Code specification, to each character
			* is assigned a value from 0 to 44 which in this case coincides
			* with the array index
			*
			* @type {Array}
			*/
			const ALPHA_NUM_CHARS = [
				"0",
				"1",
				"2",
				"3",
				"4",
				"5",
				"6",
				"7",
				"8",
				"9",
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
				"K",
				"L",
				"M",
				"N",
				"O",
				"P",
				"Q",
				"R",
				"S",
				"T",
				"U",
				"V",
				"W",
				"X",
				"Y",
				"Z",
				" ",
				"$",
				"%",
				"*",
				"+",
				"-",
				".",
				"/",
				":"
			];
			function AlphanumericData(data) {
				this.mode = Mode.ALPHANUMERIC;
				this.data = data;
			}
			AlphanumericData.getBitsLength = function getBitsLength(length) {
				return 11 * Math.floor(length / 2) + 6 * (length % 2);
			};
			AlphanumericData.prototype.getLength = function getLength() {
				return this.data.length;
			};
			AlphanumericData.prototype.getBitsLength = function getBitsLength() {
				return AlphanumericData.getBitsLength(this.data.length);
			};
			AlphanumericData.prototype.write = function write(bitBuffer) {
				let i;
				for (i = 0; i + 2 <= this.data.length; i += 2) {
					let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
					value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
					bitBuffer.put(value, 11);
				}
				if (this.data.length % 2) bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
			};
			module.exports = AlphanumericData;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/byte-data.js
		var require_byte_data = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Mode = require_mode();
			function ByteData(data) {
				this.mode = Mode.BYTE;
				if (typeof data === "string") this.data = new TextEncoder().encode(data);
				else this.data = new Uint8Array(data);
			}
			ByteData.getBitsLength = function getBitsLength(length) {
				return length * 8;
			};
			ByteData.prototype.getLength = function getLength() {
				return this.data.length;
			};
			ByteData.prototype.getBitsLength = function getBitsLength() {
				return ByteData.getBitsLength(this.data.length);
			};
			ByteData.prototype.write = function(bitBuffer) {
				for (let i = 0, l = this.data.length; i < l; i++) bitBuffer.put(this.data[i], 8);
			};
			module.exports = ByteData;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/kanji-data.js
		var require_kanji_data = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			const Mode = require_mode();
			const Utils = require_utils$1();
			function KanjiData(data) {
				this.mode = Mode.KANJI;
				this.data = data;
			}
			KanjiData.getBitsLength = function getBitsLength(length) {
				return length * 13;
			};
			KanjiData.prototype.getLength = function getLength() {
				return this.data.length;
			};
			KanjiData.prototype.getBitsLength = function getBitsLength() {
				return KanjiData.getBitsLength(this.data.length);
			};
			KanjiData.prototype.write = function(bitBuffer) {
				let i;
				for (i = 0; i < this.data.length; i++) {
					let value = Utils.toSJIS(this.data[i]);
					if (value >= 33088 && value <= 40956) value -= 33088;
					else if (value >= 57408 && value <= 60351) value -= 49472;
					else throw new Error("Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8");
					value = (value >>> 8 & 255) * 192 + (value & 255);
					bitBuffer.put(value, 13);
				}
			};
			module.exports = KanjiData;
		}));
		//#endregion
		//#region node_modules/.pnpm/dijkstrajs@1.0.3/node_modules/dijkstrajs/dijkstra.js
		var require_dijkstra = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			/******************************************************************************
			* Created 2008-08-19.
			*
			* Dijkstra path-finding functions. Adapted from the Dijkstar Python project.
			*
			* Copyright (C) 2008
			*   Wyatt Baldwin <self@wyattbaldwin.com>
			*   All rights reserved
			*
			* Licensed under the MIT license.
			*
			*   http://www.opensource.org/licenses/mit-license.php
			*
			* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
			* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
			* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
			* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
			* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
			* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
			* THE SOFTWARE.
			*****************************************************************************/
			var dijkstra = {
				single_source_shortest_paths: function(graph, s, d) {
					var predecessors = {};
					var costs = {};
					costs[s] = 0;
					var open = dijkstra.PriorityQueue.make();
					open.push(s, 0);
					var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
					while (!open.empty()) {
						closest = open.pop();
						u = closest.value;
						cost_of_s_to_u = closest.cost;
						adjacent_nodes = graph[u] || {};
						for (v in adjacent_nodes) if (adjacent_nodes.hasOwnProperty(v)) {
							cost_of_e = adjacent_nodes[v];
							cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
							cost_of_s_to_v = costs[v];
							first_visit = typeof costs[v] === "undefined";
							if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
								costs[v] = cost_of_s_to_u_plus_cost_of_e;
								open.push(v, cost_of_s_to_u_plus_cost_of_e);
								predecessors[v] = u;
							}
						}
					}
					if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
						var msg = [
							"Could not find a path from ",
							s,
							" to ",
							d,
							"."
						].join("");
						throw new Error(msg);
					}
					return predecessors;
				},
				extract_shortest_path_from_predecessor_list: function(predecessors, d) {
					var nodes = [];
					var u = d;
					while (u) {
						nodes.push(u);
						predecessors[u];
						u = predecessors[u];
					}
					nodes.reverse();
					return nodes;
				},
				find_path: function(graph, s, d) {
					var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
					return dijkstra.extract_shortest_path_from_predecessor_list(predecessors, d);
				},
				/**
				* A very naive priority queue implementation.
				*/
				PriorityQueue: {
					make: function(opts) {
						var T = dijkstra.PriorityQueue, t = {}, key;
						opts = opts || {};
						for (key in T) if (T.hasOwnProperty(key)) t[key] = T[key];
						t.queue = [];
						t.sorter = opts.sorter || T.default_sorter;
						return t;
					},
					default_sorter: function(a, b) {
						return a.cost - b.cost;
					},
					/**
					* Add a new item to the queue and ensure the highest priority element
					* is at the front of the queue.
					*/
					push: function(value, cost) {
						var item = {
							value,
							cost
						};
						this.queue.push(item);
						this.queue.sort(this.sorter);
					},
					/**
					* Return the highest priority element in the queue.
					*/
					pop: function() {
						return this.queue.shift();
					},
					empty: function() {
						return this.queue.length === 0;
					}
				}
			};
			if (typeof module !== "undefined") module.exports = dijkstra;
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/segments.js
		var require_segments = /* @__PURE__ */ __commonJSMin(((exports) => {
			const Mode = require_mode();
			const NumericData = require_numeric_data();
			const AlphanumericData = require_alphanumeric_data();
			const ByteData = require_byte_data();
			const KanjiData = require_kanji_data();
			const Regex = require_regex();
			const Utils = require_utils$1();
			const dijkstra = require_dijkstra();
			/**
			* Returns UTF8 byte length
			*
			* @param  {String} str Input string
			* @return {Number}     Number of byte
			*/
			function getStringByteLength(str) {
				return unescape(encodeURIComponent(str)).length;
			}
			/**
			* Get a list of segments of the specified mode
			* from a string
			*
			* @param  {Mode}   mode Segment mode
			* @param  {String} str  String to process
			* @return {Array}       Array of object with segments data
			*/
			function getSegments(regex, mode, str) {
				const segments = [];
				let result;
				while ((result = regex.exec(str)) !== null) segments.push({
					data: result[0],
					index: result.index,
					mode,
					length: result[0].length
				});
				return segments;
			}
			/**
			* Extracts a series of segments with the appropriate
			* modes from a string
			*
			* @param  {String} dataStr Input string
			* @return {Array}          Array of object with segments data
			*/
			function getSegmentsFromString(dataStr) {
				const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
				const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
				let byteSegs;
				let kanjiSegs;
				if (Utils.isKanjiModeEnabled()) {
					byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
					kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
				} else {
					byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
					kanjiSegs = [];
				}
				return numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs).sort(function(s1, s2) {
					return s1.index - s2.index;
				}).map(function(obj) {
					return {
						data: obj.data,
						mode: obj.mode,
						length: obj.length
					};
				});
			}
			/**
			* Returns how many bits are needed to encode a string of
			* specified length with the specified mode
			*
			* @param  {Number} length String length
			* @param  {Mode} mode     Segment mode
			* @return {Number}        Bit length
			*/
			function getSegmentBitsLength(length, mode) {
				switch (mode) {
					case Mode.NUMERIC: return NumericData.getBitsLength(length);
					case Mode.ALPHANUMERIC: return AlphanumericData.getBitsLength(length);
					case Mode.KANJI: return KanjiData.getBitsLength(length);
					case Mode.BYTE: return ByteData.getBitsLength(length);
				}
			}
			/**
			* Merges adjacent segments which have the same mode
			*
			* @param  {Array} segs Array of object with segments data
			* @return {Array}      Array of object with segments data
			*/
			function mergeSegments(segs) {
				return segs.reduce(function(acc, curr) {
					const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
					if (prevSeg && prevSeg.mode === curr.mode) {
						acc[acc.length - 1].data += curr.data;
						return acc;
					}
					acc.push(curr);
					return acc;
				}, []);
			}
			/**
			* Generates a list of all possible nodes combination which
			* will be used to build a segments graph.
			*
			* Nodes are divided by groups. Each group will contain a list of all the modes
			* in which is possible to encode the given text.
			*
			* For example the text '12345' can be encoded as Numeric, Alphanumeric or Byte.
			* The group for '12345' will contain then 3 objects, one for each
			* possible encoding mode.
			*
			* Each node represents a possible segment.
			*
			* @param  {Array} segs Array of object with segments data
			* @return {Array}      Array of object with segments data
			*/
			function buildNodes(segs) {
				const nodes = [];
				for (let i = 0; i < segs.length; i++) {
					const seg = segs[i];
					switch (seg.mode) {
						case Mode.NUMERIC:
							nodes.push([
								seg,
								{
									data: seg.data,
									mode: Mode.ALPHANUMERIC,
									length: seg.length
								},
								{
									data: seg.data,
									mode: Mode.BYTE,
									length: seg.length
								}
							]);
							break;
						case Mode.ALPHANUMERIC:
							nodes.push([seg, {
								data: seg.data,
								mode: Mode.BYTE,
								length: seg.length
							}]);
							break;
						case Mode.KANJI:
							nodes.push([seg, {
								data: seg.data,
								mode: Mode.BYTE,
								length: getStringByteLength(seg.data)
							}]);
							break;
						case Mode.BYTE: nodes.push([{
							data: seg.data,
							mode: Mode.BYTE,
							length: getStringByteLength(seg.data)
						}]);
					}
				}
				return nodes;
			}
			/**
			* Builds a graph from a list of nodes.
			* All segments in each node group will be connected with all the segments of
			* the next group and so on.
			*
			* At each connection will be assigned a weight depending on the
			* segment's byte length.
			*
			* @param  {Array} nodes    Array of object with segments data
			* @param  {Number} version QR Code version
			* @return {Object}         Graph of all possible segments
			*/
			function buildGraph(nodes, version) {
				const table = {};
				const graph = { start: {} };
				let prevNodeIds = ["start"];
				for (let i = 0; i < nodes.length; i++) {
					const nodeGroup = nodes[i];
					const currentNodeIds = [];
					for (let j = 0; j < nodeGroup.length; j++) {
						const node = nodeGroup[j];
						const key = "" + i + j;
						currentNodeIds.push(key);
						table[key] = {
							node,
							lastCount: 0
						};
						graph[key] = {};
						for (let n = 0; n < prevNodeIds.length; n++) {
							const prevNodeId = prevNodeIds[n];
							if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
								graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
								table[prevNodeId].lastCount += node.length;
							} else {
								if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
								graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
							}
						}
					}
					prevNodeIds = currentNodeIds;
				}
				for (let n = 0; n < prevNodeIds.length; n++) graph[prevNodeIds[n]].end = 0;
				return {
					map: graph,
					table
				};
			}
			/**
			* Builds a segment from a specified data and mode.
			* If a mode is not specified, the more suitable will be used.
			*
			* @param  {String} data             Input data
			* @param  {Mode | String} modesHint Data mode
			* @return {Segment}                 Segment
			*/
			function buildSingleSegment(data, modesHint) {
				let mode;
				const bestMode = Mode.getBestModeForData(data);
				mode = Mode.from(modesHint, bestMode);
				if (mode !== Mode.BYTE && mode.bit < bestMode.bit) throw new Error("\"" + data + "\" cannot be encoded with mode " + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
				if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) mode = Mode.BYTE;
				switch (mode) {
					case Mode.NUMERIC: return new NumericData(data);
					case Mode.ALPHANUMERIC: return new AlphanumericData(data);
					case Mode.KANJI: return new KanjiData(data);
					case Mode.BYTE: return new ByteData(data);
				}
			}
			/**
			* Builds a list of segments from an array.
			* Array can contain Strings or Objects with segment's info.
			*
			* For each item which is a string, will be generated a segment with the given
			* string and the more appropriate encoding mode.
			*
			* For each item which is an object, will be generated a segment with the given
			* data and mode.
			* Objects must contain at least the property "data".
			* If property "mode" is not present, the more suitable mode will be used.
			*
			* @param  {Array} array Array of objects with segments data
			* @return {Array}       Array of Segments
			*/
			exports.fromArray = function fromArray(array) {
				return array.reduce(function(acc, seg) {
					if (typeof seg === "string") acc.push(buildSingleSegment(seg, null));
					else if (seg.data) acc.push(buildSingleSegment(seg.data, seg.mode));
					return acc;
				}, []);
			};
			/**
			* Builds an optimized sequence of segments from a string,
			* which will produce the shortest possible bitstream.
			*
			* @param  {String} data    Input string
			* @param  {Number} version QR Code version
			* @return {Array}          Array of segments
			*/
			exports.fromString = function fromString(data, version) {
				const graph = buildGraph(buildNodes(getSegmentsFromString(data, Utils.isKanjiModeEnabled())), version);
				const path = dijkstra.find_path(graph.map, "start", "end");
				const optimizedSegs = [];
				for (let i = 1; i < path.length - 1; i++) optimizedSegs.push(graph.table[path[i]].node);
				return exports.fromArray(mergeSegments(optimizedSegs));
			};
			/**
			* Splits a string in various segments with the modes which
			* best represent their content.
			* The produced segments are far from being optimized.
			* The output of this function is only used to estimate a QR Code version
			* which may contain the data.
			*
			* @param  {string} data Input string
			* @return {Array}       Array of segments
			*/
			exports.rawSplit = function rawSplit(data) {
				return exports.fromArray(getSegmentsFromString(data, Utils.isKanjiModeEnabled()));
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/qrcode.js
		var require_qrcode = /* @__PURE__ */ __commonJSMin(((exports) => {
			const Utils = require_utils$1();
			const ECLevel = require_error_correction_level();
			const BitBuffer = require_bit_buffer();
			const BitMatrix = require_bit_matrix();
			const AlignmentPattern = require_alignment_pattern();
			const FinderPattern = require_finder_pattern();
			const MaskPattern = require_mask_pattern();
			const ECCode = require_error_correction_code();
			const ReedSolomonEncoder = require_reed_solomon_encoder();
			const Version = require_version();
			const FormatInfo = require_format_info();
			const Mode = require_mode();
			const Segments = require_segments();
			/**
			* QRCode for JavaScript
			*
			* modified by Ryan Day for nodejs support
			* Copyright (c) 2011 Ryan Day
			*
			* Licensed under the MIT license:
			*   http://www.opensource.org/licenses/mit-license.php
			*
			//---------------------------------------------------------------------
			// QRCode for JavaScript
			//
			// Copyright (c) 2009 Kazuhiko Arase
			//
			// URL: http://www.d-project.com/
			//
			// Licensed under the MIT license:
			//   http://www.opensource.org/licenses/mit-license.php
			//
			// The word "QR Code" is registered trademark of
			// DENSO WAVE INCORPORATED
			//   http://www.denso-wave.com/qrcode/faqpatent-e.html
			//
			//---------------------------------------------------------------------
			*/
			/**
			* Add finder patterns bits to matrix
			*
			* @param  {BitMatrix} matrix  Modules matrix
			* @param  {Number}    version QR Code version
			*/
			function setupFinderPattern(matrix, version) {
				const size = matrix.size;
				const pos = FinderPattern.getPositions(version);
				for (let i = 0; i < pos.length; i++) {
					const row = pos[i][0];
					const col = pos[i][1];
					for (let r = -1; r <= 7; r++) {
						if (row + r <= -1 || size <= row + r) continue;
						for (let c = -1; c <= 7; c++) {
							if (col + c <= -1 || size <= col + c) continue;
							if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) matrix.set(row + r, col + c, true, true);
							else matrix.set(row + r, col + c, false, true);
						}
					}
				}
			}
			/**
			* Add timing pattern bits to matrix
			*
			* Note: this function must be called before {@link setupAlignmentPattern}
			*
			* @param  {BitMatrix} matrix Modules matrix
			*/
			function setupTimingPattern(matrix) {
				const size = matrix.size;
				for (let r = 8; r < size - 8; r++) {
					const value = r % 2 === 0;
					matrix.set(r, 6, value, true);
					matrix.set(6, r, value, true);
				}
			}
			/**
			* Add alignment patterns bits to matrix
			*
			* Note: this function must be called after {@link setupTimingPattern}
			*
			* @param  {BitMatrix} matrix  Modules matrix
			* @param  {Number}    version QR Code version
			*/
			function setupAlignmentPattern(matrix, version) {
				const pos = AlignmentPattern.getPositions(version);
				for (let i = 0; i < pos.length; i++) {
					const row = pos[i][0];
					const col = pos[i][1];
					for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) matrix.set(row + r, col + c, true, true);
					else matrix.set(row + r, col + c, false, true);
				}
			}
			/**
			* Add version info bits to matrix
			*
			* @param  {BitMatrix} matrix  Modules matrix
			* @param  {Number}    version QR Code version
			*/
			function setupVersionInfo(matrix, version) {
				const size = matrix.size;
				const bits = Version.getEncodedBits(version);
				let row, col, mod;
				for (let i = 0; i < 18; i++) {
					row = Math.floor(i / 3);
					col = i % 3 + size - 8 - 3;
					mod = (bits >> i & 1) === 1;
					matrix.set(row, col, mod, true);
					matrix.set(col, row, mod, true);
				}
			}
			/**
			* Add format info bits to matrix
			*
			* @param  {BitMatrix} matrix               Modules matrix
			* @param  {ErrorCorrectionLevel}    errorCorrectionLevel Error correction level
			* @param  {Number}    maskPattern          Mask pattern reference value
			*/
			function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
				const size = matrix.size;
				const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
				let i, mod;
				for (i = 0; i < 15; i++) {
					mod = (bits >> i & 1) === 1;
					if (i < 6) matrix.set(i, 8, mod, true);
					else if (i < 8) matrix.set(i + 1, 8, mod, true);
					else matrix.set(size - 15 + i, 8, mod, true);
					if (i < 8) matrix.set(8, size - i - 1, mod, true);
					else if (i < 9) matrix.set(8, 15 - i - 1 + 1, mod, true);
					else matrix.set(8, 15 - i - 1, mod, true);
				}
				matrix.set(size - 8, 8, 1, true);
			}
			/**
			* Add encoded data bits to matrix
			*
			* @param  {BitMatrix}  matrix Modules matrix
			* @param  {Uint8Array} data   Data codewords
			*/
			function setupData(matrix, data) {
				const size = matrix.size;
				let inc = -1;
				let row = size - 1;
				let bitIndex = 7;
				let byteIndex = 0;
				for (let col = size - 1; col > 0; col -= 2) {
					if (col === 6) col--;
					while (true) {
						for (let c = 0; c < 2; c++) if (!matrix.isReserved(row, col - c)) {
							let dark = false;
							if (byteIndex < data.length) dark = (data[byteIndex] >>> bitIndex & 1) === 1;
							matrix.set(row, col - c, dark);
							bitIndex--;
							if (bitIndex === -1) {
								byteIndex++;
								bitIndex = 7;
							}
						}
						row += inc;
						if (row < 0 || size <= row) {
							row -= inc;
							inc = -inc;
							break;
						}
					}
				}
			}
			/**
			* Create encoded codewords from data input
			*
			* @param  {Number}   version              QR Code version
			* @param  {ErrorCorrectionLevel}   errorCorrectionLevel Error correction level
			* @param  {ByteData} data                 Data input
			* @return {Uint8Array}                    Buffer containing encoded codewords
			*/
			function createData(version, errorCorrectionLevel, segments) {
				const buffer = new BitBuffer();
				segments.forEach(function(data) {
					buffer.put(data.mode.bit, 4);
					buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
					data.write(buffer);
				});
				const dataTotalCodewordsBits = (Utils.getSymbolTotalCodewords(version) - ECCode.getTotalCodewordsCount(version, errorCorrectionLevel)) * 8;
				if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) buffer.put(0, 4);
				while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(0);
				const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
				for (let i = 0; i < remainingByte; i++) buffer.put(i % 2 ? 17 : 236, 8);
				return createCodewords(buffer, version, errorCorrectionLevel);
			}
			/**
			* Encode input data with Reed-Solomon and return codewords with
			* relative error correction bits
			*
			* @param  {BitBuffer} bitBuffer            Data to encode
			* @param  {Number}    version              QR Code version
			* @param  {ErrorCorrectionLevel} errorCorrectionLevel Error correction level
			* @return {Uint8Array}                     Buffer containing encoded codewords
			*/
			function createCodewords(bitBuffer, version, errorCorrectionLevel) {
				const totalCodewords = Utils.getSymbolTotalCodewords(version);
				const dataTotalCodewords = totalCodewords - ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
				const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
				const blocksInGroup1 = ecTotalBlocks - totalCodewords % ecTotalBlocks;
				const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
				const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
				const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
				const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
				const rs = new ReedSolomonEncoder(ecCount);
				let offset = 0;
				const dcData = new Array(ecTotalBlocks);
				const ecData = new Array(ecTotalBlocks);
				let maxDataSize = 0;
				const buffer = new Uint8Array(bitBuffer.buffer);
				for (let b = 0; b < ecTotalBlocks; b++) {
					const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
					dcData[b] = buffer.slice(offset, offset + dataSize);
					ecData[b] = rs.encode(dcData[b]);
					offset += dataSize;
					maxDataSize = Math.max(maxDataSize, dataSize);
				}
				const data = new Uint8Array(totalCodewords);
				let index = 0;
				let i, r;
				for (i = 0; i < maxDataSize; i++) for (r = 0; r < ecTotalBlocks; r++) if (i < dcData[r].length) data[index++] = dcData[r][i];
				for (i = 0; i < ecCount; i++) for (r = 0; r < ecTotalBlocks; r++) data[index++] = ecData[r][i];
				return data;
			}
			/**
			* Build QR Code symbol
			*
			* @param  {String} data                 Input string
			* @param  {Number} version              QR Code version
			* @param  {ErrorCorretionLevel} errorCorrectionLevel Error level
			* @param  {MaskPattern} maskPattern     Mask pattern
			* @return {Object}                      Object containing symbol data
			*/
			function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
				let segments;
				if (Array.isArray(data)) segments = Segments.fromArray(data);
				else if (typeof data === "string") {
					let estimatedVersion = version;
					if (!estimatedVersion) {
						const rawSegments = Segments.rawSplit(data);
						estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
					}
					segments = Segments.fromString(data, estimatedVersion || 40);
				} else throw new Error("Invalid data");
				const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
				if (!bestVersion) throw new Error("The amount of data is too big to be stored in a QR Code");
				if (!version) version = bestVersion;
				else if (version < bestVersion) throw new Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n");
				const dataBits = createData(version, errorCorrectionLevel, segments);
				const moduleCount = Utils.getSymbolSize(version);
				const modules = new BitMatrix(moduleCount);
				setupFinderPattern(modules, version);
				setupTimingPattern(modules);
				setupAlignmentPattern(modules, version);
				setupFormatInfo(modules, errorCorrectionLevel, 0);
				if (version >= 7) setupVersionInfo(modules, version);
				setupData(modules, dataBits);
				if (isNaN(maskPattern)) maskPattern = MaskPattern.getBestMask(modules, setupFormatInfo.bind(null, modules, errorCorrectionLevel));
				MaskPattern.applyMask(maskPattern, modules);
				setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
				return {
					modules,
					version,
					errorCorrectionLevel,
					maskPattern,
					segments
				};
			}
			/**
			* QR Code
			*
			* @param {String | Array} data                 Input data
			* @param {Object} options                      Optional configurations
			* @param {Number} options.version              QR Code version
			* @param {String} options.errorCorrectionLevel Error correction level
			* @param {Function} options.toSJISFunc         Helper func to convert utf8 to sjis
			*/
			exports.create = function create(data, options) {
				if (typeof data === "undefined" || data === "") throw new Error("No input text");
				let errorCorrectionLevel = ECLevel.M;
				let version;
				let mask;
				if (typeof options !== "undefined") {
					errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
					version = Version.from(options.version);
					mask = MaskPattern.from(options.maskPattern);
					if (options.toSJISFunc) Utils.setToSJISFunction(options.toSJISFunc);
				}
				return createSymbol(data, version, errorCorrectionLevel, mask);
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/utils.js
		var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
			function hex2rgba(hex) {
				if (typeof hex === "number") hex = hex.toString();
				if (typeof hex !== "string") throw new Error("Color should be defined as hex string");
				let hexCode = hex.slice().replace("#", "").split("");
				if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) throw new Error("Invalid hex color: " + hex);
				if (hexCode.length === 3 || hexCode.length === 4) hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
					return [c, c];
				}));
				if (hexCode.length === 6) hexCode.push("F", "F");
				const hexValue = parseInt(hexCode.join(""), 16);
				return {
					r: hexValue >> 24 & 255,
					g: hexValue >> 16 & 255,
					b: hexValue >> 8 & 255,
					a: hexValue & 255,
					hex: "#" + hexCode.slice(0, 6).join("")
				};
			}
			exports.getOptions = function getOptions(options) {
				if (!options) options = {};
				if (!options.color) options.color = {};
				const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
				const width = options.width && options.width >= 21 ? options.width : void 0;
				const scale = options.scale || 4;
				return {
					width,
					scale: width ? 4 : scale,
					margin,
					color: {
						dark: hex2rgba(options.color.dark || "#000000ff"),
						light: hex2rgba(options.color.light || "#ffffffff")
					},
					type: options.type,
					rendererOpts: options.rendererOpts || {}
				};
			};
			exports.getScale = function getScale(qrSize, opts) {
				return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
			};
			exports.getImageWidth = function getImageWidth(qrSize, opts) {
				const scale = exports.getScale(qrSize, opts);
				return Math.floor((qrSize + opts.margin * 2) * scale);
			};
			exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
				const size = qr.modules.size;
				const data = qr.modules.data;
				const scale = exports.getScale(size, opts);
				const symbolSize = Math.floor((size + opts.margin * 2) * scale);
				const scaledMargin = opts.margin * scale;
				const palette = [opts.color.light, opts.color.dark];
				for (let i = 0; i < symbolSize; i++) for (let j = 0; j < symbolSize; j++) {
					let posDst = (i * symbolSize + j) * 4;
					let pxColor = opts.color.light;
					if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
						const iSrc = Math.floor((i - scaledMargin) / scale);
						const jSrc = Math.floor((j - scaledMargin) / scale);
						pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
					}
					imgData[posDst++] = pxColor.r;
					imgData[posDst++] = pxColor.g;
					imgData[posDst++] = pxColor.b;
					imgData[posDst] = pxColor.a;
				}
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/canvas.js
		var require_canvas = /* @__PURE__ */ __commonJSMin(((exports) => {
			const Utils = require_utils();
			function clearCanvas(ctx, canvas, size) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				if (!canvas.style) canvas.style = {};
				canvas.height = size;
				canvas.width = size;
				canvas.style.height = size + "px";
				canvas.style.width = size + "px";
			}
			function getCanvasElement() {
				try {
					return document.createElement("canvas");
				} catch (e) {
					throw new Error("You need to specify a canvas element");
				}
			}
			exports.render = function render(qrData, canvas, options) {
				let opts = options;
				let canvasEl = canvas;
				if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
					opts = canvas;
					canvas = void 0;
				}
				if (!canvas) canvasEl = getCanvasElement();
				opts = Utils.getOptions(opts);
				const size = Utils.getImageWidth(qrData.modules.size, opts);
				const ctx = canvasEl.getContext("2d");
				const image = ctx.createImageData(size, size);
				Utils.qrToImageData(image.data, qrData, opts);
				clearCanvas(ctx, canvasEl, size);
				ctx.putImageData(image, 0, 0);
				return canvasEl;
			};
			exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
				let opts = options;
				if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
					opts = canvas;
					canvas = void 0;
				}
				if (!opts) opts = {};
				const canvasEl = exports.render(qrData, canvas, opts);
				const type = opts.type || "image/png";
				const rendererOpts = opts.rendererOpts || {};
				return canvasEl.toDataURL(type, rendererOpts.quality);
			};
		}));
		//#endregion
		//#region node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/svg-tag.js
		var require_svg_tag = /* @__PURE__ */ __commonJSMin(((exports) => {
			const Utils = require_utils();
			function getColorAttrib(color, attrib) {
				const alpha = color.a / 255;
				const str = attrib + "=\"" + color.hex + "\"";
				return alpha < 1 ? str + " " + attrib + "-opacity=\"" + alpha.toFixed(2).slice(1) + "\"" : str;
			}
			function svgCmd(cmd, x, y) {
				let str = cmd + x;
				if (typeof y !== "undefined") str += " " + y;
				return str;
			}
			function qrToPath(data, size, margin) {
				let path = "";
				let moveBy = 0;
				let newRow = false;
				let lineLength = 0;
				for (let i = 0; i < data.length; i++) {
					const col = Math.floor(i % size);
					const row = Math.floor(i / size);
					if (!col && !newRow) newRow = true;
					if (data[i]) {
						lineLength++;
						if (!(i > 0 && col > 0 && data[i - 1])) {
							path += newRow ? svgCmd("M", col + margin, .5 + row + margin) : svgCmd("m", moveBy, 0);
							moveBy = 0;
							newRow = false;
						}
						if (!(col + 1 < size && data[i + 1])) {
							path += svgCmd("h", lineLength);
							lineLength = 0;
						}
					} else moveBy++;
				}
				return path;
			}
			exports.render = function render(qrData, options, cb) {
				const opts = Utils.getOptions(options);
				const size = qrData.modules.size;
				const data = qrData.modules.data;
				const qrcodesize = size + opts.margin * 2;
				const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + " d=\"M0 0h" + qrcodesize + "v" + qrcodesize + "H0z\"/>";
				const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + " d=\"" + qrToPath(data, size, opts.margin) + "\"/>";
				const viewBox = "viewBox=\"0 0 " + qrcodesize + " " + qrcodesize + "\"";
				const svgTag = "<svg xmlns=\"http://www.w3.org/2000/svg\" " + (!opts.width ? "" : "width=\"" + opts.width + "\" height=\"" + opts.width + "\" ") + viewBox + " shape-rendering=\"crispEdges\">" + bg + path + "</svg>\n";
				if (typeof cb === "function") cb(null, svgTag);
				return svgTag;
			};
		}));
		//#endregion
		//#region \0dsh-awiki-css:AwikiSettingsSection.module.css.mjs
		var import_browser = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports) => {
			const canPromise = require_can_promise();
			const QRCode = require_qrcode();
			const CanvasRenderer = require_canvas();
			const SvgRenderer = require_svg_tag();
			function renderCanvas(renderFunc, canvas, text, opts, cb) {
				const args = [].slice.call(arguments, 1);
				const argsNum = args.length;
				const isLastArgCb = typeof args[argsNum - 1] === "function";
				if (!isLastArgCb && !canPromise()) throw new Error("Callback required as last argument");
				if (isLastArgCb) {
					if (argsNum < 2) throw new Error("Too few arguments provided");
					if (argsNum === 2) {
						cb = text;
						text = canvas;
						canvas = opts = void 0;
					} else if (argsNum === 3) {
						if (canvas.getContext && typeof cb === "undefined") {
							cb = opts;
							opts = void 0;
						} else {
							cb = opts;
							opts = text;
							text = canvas;
							canvas = void 0;
						}
					}
				} else {
					if (argsNum < 1) throw new Error("Too few arguments provided");
					if (argsNum === 1) {
						text = canvas;
						canvas = opts = void 0;
					} else if (argsNum === 2 && !canvas.getContext) {
						opts = text;
						text = canvas;
						canvas = void 0;
					}
					return new Promise(function(resolve, reject) {
						try {
							resolve(renderFunc(QRCode.create(text, opts), canvas, opts));
						} catch (e) {
							reject(e);
						}
					});
				}
				try {
					const data = QRCode.create(text, opts);
					cb(null, renderFunc(data, canvas, opts));
				} catch (e) {
					cb(e);
				}
			}
			exports.create = QRCode.create;
			exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
			exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
			exports.toString = renderCanvas.bind(null, function(data, _, opts) {
				return SvgRenderer.render(data, opts);
			});
		})))(), 1);
		const css = ".keMsGa_section{width:min(100%,760px);color:var(--dsw-alias-label-primary);flex-direction:column;gap:20px;display:flex}.keMsGa_heading{flex-direction:column;gap:6px;display:flex}.keMsGa_title{margin:0;font-size:18px;font-weight:600;line-height:26px}.keMsGa_intro,.keMsGa_description,.keMsGa_defaultValue,.keMsGa_notice,.keMsGa_status{margin:0;font-size:13px;line-height:20px}.keMsGa_intro,.keMsGa_description,.keMsGa_defaultValue{color:var(--dsw-alias-label-tertiary)}.keMsGa_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex-direction:column;gap:14px;padding:18px;display:flex}.keMsGa_label{font-size:14px;font-weight:600;line-height:22px}.keMsGa_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:42px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:9px 12px;font-size:14px;line-height:22px}.keMsGa_input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);outline:none}.keMsGa_input:disabled{cursor:not-allowed;opacity:.55}.keMsGa_actions{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.keMsGa_status{min-height:20px;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-secondary))}.keMsGa_error{color:var(--dsw-alias-state-error-primary)}.keMsGa_notice{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:12px 14px}.keMsGa_developmentNotice{border:1px solid var(--dsw-alias-border-l1)}.keMsGa_accessNotice{border:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:3px;display:flex}.keMsGa_accessNotice strong{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.keMsGa_dangerZone{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 5%, var(--dsw-alias-bg-layer-3));border-radius:8px;flex-direction:column;align-items:flex-start;gap:14px;padding:18px;display:flex}.keMsGa_dangerCopy{flex-direction:column;gap:6px;display:flex}.keMsGa_dangerTitle,.keMsGa_dangerDescription,.keMsGa_clearWarning p,.keMsGa_confirmLabel{margin:0}.keMsGa_dangerTitle{color:var(--dsw-alias-state-error-primary);font-size:14px;font-weight:600;line-height:22px}.keMsGa_dangerDescription,.keMsGa_clearWarning,.keMsGa_confirmLabel{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}.keMsGa_dangerButton,.keMsGa_clearConfirmButton{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, var(--dsw-alias-border-l2));color:var(--dsw-alias-state-error-primary)}.keMsGa_dangerButton:hover:not(:disabled),.keMsGa_clearConfirmButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.keMsGa_clearDialog{width:min(480px,100%)}.keMsGa_clearWarning{background:var(--dsw-alias-interactive-bg-hover-danger);border-radius:8px;flex-direction:column;gap:10px;padding:12px 14px;display:flex}.keMsGa_clearWarning p:first-child{color:var(--dsw-alias-state-error-primary);font-weight:600}.keMsGa_confirmLabel{color:var(--dsw-alias-label-primary);margin-top:18px}.keMsGa_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);gap:4px;padding-bottom:1px;display:flex;overflow-x:auto}.keMsGa_tab{min-height:38px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;border-bottom:2px solid #0000;flex:none;padding:7px 12px;font-size:14px;line-height:22px}.keMsGa_tab:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.keMsGa_tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.keMsGa_tabActive{border-bottom-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);font-weight:600}.keMsGa_panel{flex-direction:column;gap:16px;min-width:0;display:flex}.keMsGa_panelHeader,.keMsGa_rechargeRow,.keMsGa_usageMain{justify-content:space-between;align-items:center;gap:12px;display:flex}.keMsGa_accountSummary,.keMsGa_usageMetrics{margin:0;display:grid}.keMsGa_accountSummary{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;grid-template-columns:repeat(2,minmax(0,1fr))}.keMsGa_accountSummaryDevelopment{grid-template-columns:repeat(3,minmax(0,1fr))}.keMsGa_accountSummary>div{flex-direction:column;gap:5px;min-width:0;padding:16px;display:flex}.keMsGa_accountSummary>div+div{border-left:1px solid var(--dsw-alias-border-l2)}.keMsGa_accountSummary dt,.keMsGa_accountSummary dd,.keMsGa_usageMetrics dt,.keMsGa_usageMetrics dd{margin:0}.keMsGa_accountSummary dt,.keMsGa_usageMetrics dt,.keMsGa_usageMain span,.keMsGa_orderStatus,.keMsGa_qrPayment p{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.keMsGa_accountSummary dd{overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:22px}.keMsGa_recharge{flex-direction:column;gap:8px;padding-top:2px;display:flex}.keMsGa_paymentPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex-direction:column;gap:14px;padding:16px;display:flex}.keMsGa_paymentHeader{justify-content:space-between;align-items:flex-start;gap:16px;display:flex}.keMsGa_paymentHeader h3,.keMsGa_paymentHeader p{margin:0}.keMsGa_paymentHeader h3{font-size:14px;font-weight:600;line-height:22px}.keMsGa_paymentHeader p{color:var(--dsw-alias-label-secondary);margin-top:3px;font-size:13px;line-height:20px}.keMsGa_paymentStatus{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:3px 8px;font-size:12px;line-height:18px}.keMsGa_rechargeRow .keMsGa_input{flex:1;min-width:0}.keMsGa_qrPayment{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex-direction:column;align-items:center;gap:8px;padding:16px;display:flex}.keMsGa_qrPayment img{aspect-ratio:1;width:min(220px,100%);height:auto;display:block}.keMsGa_qrPayment p,.keMsGa_orderStatus{margin:0}.keMsGa_usageList{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;display:flex}.keMsGa_usageRow{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;min-width:0;padding:14px 0;display:flex}.keMsGa_usageMain strong{overflow-wrap:anywhere;min-width:0;font-size:14px;line-height:22px}.keMsGa_usageMain span{flex:none}.keMsGa_usageMetrics{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.keMsGa_usageMetrics>div{min-width:0}.keMsGa_usageMetrics dd{overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin-top:2px;font-size:13px;line-height:20px}@media (width<=640px){.keMsGa_card{padding:16px}.keMsGa_actions>button{flex:1}.keMsGa_dangerButton{width:100%}.keMsGa_accountSummary{grid-template-columns:1fr}.keMsGa_accountSummary>div+div{border-top:1px solid var(--dsw-alias-border-l2);border-left:0}.keMsGa_panelHeader,.keMsGa_rechargeRow,.keMsGa_paymentHeader{flex-direction:column;align-items:stretch}.keMsGa_panelHeader>button,.keMsGa_rechargeRow>button{width:100%}.keMsGa_usageMetrics{grid-template-columns:1fr 1fr}}";
		const tagId = "@awiki/dsh-plugin/AwikiSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@awiki/dsh-plugin";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var _dsh_awiki_css_AwikiSettingsSection_module_css_default = {
			"accessNotice": "keMsGa_accessNotice",
			"accountSummary": "keMsGa_accountSummary",
			"accountSummaryDevelopment": "keMsGa_accountSummaryDevelopment",
			"actions": "keMsGa_actions",
			"card": "keMsGa_card",
			"clearConfirmButton": "keMsGa_clearConfirmButton",
			"clearDialog": "keMsGa_clearDialog",
			"clearWarning": "keMsGa_clearWarning",
			"confirmLabel": "keMsGa_confirmLabel",
			"dangerButton": "keMsGa_dangerButton",
			"dangerCopy": "keMsGa_dangerCopy",
			"dangerDescription": "keMsGa_dangerDescription",
			"dangerTitle": "keMsGa_dangerTitle",
			"dangerZone": "keMsGa_dangerZone",
			"defaultValue": "keMsGa_defaultValue",
			"description": "keMsGa_description",
			"developmentNotice": "keMsGa_developmentNotice",
			"error": "keMsGa_error",
			"heading": "keMsGa_heading",
			"input": "keMsGa_input",
			"intro": "keMsGa_intro",
			"label": "keMsGa_label",
			"notice": "keMsGa_notice",
			"orderStatus": "keMsGa_orderStatus",
			"panel": "keMsGa_panel",
			"panelHeader": "keMsGa_panelHeader",
			"paymentHeader": "keMsGa_paymentHeader",
			"paymentPanel": "keMsGa_paymentPanel",
			"paymentStatus": "keMsGa_paymentStatus",
			"qrPayment": "keMsGa_qrPayment",
			"recharge": "keMsGa_recharge",
			"rechargeRow": "keMsGa_rechargeRow",
			"section": "keMsGa_section",
			"status": "keMsGa_status",
			"tab": "keMsGa_tab",
			"tabActive": "keMsGa_tabActive",
			"tabs": "keMsGa_tabs",
			"title": "keMsGa_title",
			"usageList": "keMsGa_usageList",
			"usageMain": "keMsGa_usageMain",
			"usageMetrics": "keMsGa_usageMetrics",
			"usageRow": "keMsGa_usageRow"
		};
		//#endregion
		//#region lib/types/client/AwikiSettingsSection.js
		/** AWiki account, usage, and advanced settings contributed to DSH settings. */
		function hasDomainOverride(snapshot) {
			return typeof snapshot.user === "object" && snapshot.user !== null && !Array.isArray(snapshot.user) && Object.hasOwn(snapshot.user, "domain");
		}
		/** Render account controls, usage visibility, and existing advanced settings. */
		function AwikiSettingsSection(props) {
			const { t, useAwikiSettings, useAwikiModelProxy, useAwikiSession } = props;
			const settings = useAwikiSettings((value) => value);
			const models = useAwikiModelProxy((value) => value);
			const identity = useAwikiSession((value) => value);
			const [tab, setTab] = (0, react.useState)("account");
			const sessionActive = identity.status === "ready" && identity.sessionStatus === "active" && identity.identity !== null;
			(0, react.useEffect)(() => {
				if (identity.status === "cold") props.identity.loadSession();
			}, [identity.status, props.identity]);
			(0, react.useEffect)(() => {
				if (sessionActive) props.models.load();
			}, [props.models, sessionActive]);
			(0, react.useEffect)(() => {
				if (sessionActive && tab === "usage" && models.status === "ready") props.models.loadUsage();
			}, [
				models.status,
				props.models,
				sessionActive,
				tab
			]);
			return (0, react_jsx_runtime.jsxs)("section", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.heading,
						children: [(0, react_jsx_runtime.jsx)("h2", {
							className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.title,
							children: t("nav")
						}), (0, react_jsx_runtime.jsx)("p", {
							className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.intro,
							children: t("intro")
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.tabs,
						role: "tablist",
						"aria-label": t("nav"),
						children: [
							(0, react_jsx_runtime.jsx)(TabButton, {
								active: tab === "account",
								onClick: () => {
									setTab("account");
								},
								children: t("tabAccount")
							}),
							(0, react_jsx_runtime.jsx)(TabButton, {
								active: tab === "usage",
								onClick: () => {
									setTab("usage");
								},
								children: t("tabUsage")
							}),
							(0, react_jsx_runtime.jsx)(TabButton, {
								active: tab === "advanced",
								onClick: () => {
									setTab("advanced");
								},
								children: t("tabAdvanced")
							})
						]
					}),
					tab === "account" && (sessionActive ? (0, react_jsx_runtime.jsx)(AccountPanel, {
						...props,
						view: models
					}) : (0, react_jsx_runtime.jsx)(IdentityRequiredPanel, {
						...props,
						view: identity
					})),
					tab === "usage" && (sessionActive ? (0, react_jsx_runtime.jsx)(UsagePanel, {
						...props,
						view: models
					}) : (0, react_jsx_runtime.jsx)(IdentityRequiredPanel, {
						...props,
						view: identity
					})),
					tab === "advanced" && (0, react_jsx_runtime.jsx)(AdvancedPanel, {
						...props,
						settings
					})
				]
			});
		}
		function IdentityRequiredPanel(props) {
			const { t, view } = props;
			const [pending, setPending] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			if (view.status === "cold" || view.status === "loading") return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.status,
				children: t("identityLoading")
			});
			if (view.status === "error") return (0, react_jsx_runtime.jsx)("p", {
				className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.notice} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
				role: "alert",
				children: view.error ?? t("onboardingIdentityUnavailable")
			});
			const restore = async () => {
				setPending(true);
				setError(null);
				const result = await props.identity.login();
				if (!result.ok) setError(result.error);
				setPending(false);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.notice,
						children: view.sessionStatus === "signed-out" ? t("identitySignedOutRequired") : t("identityRegistrationRequired")
					}),
					view.sessionStatus === "signed-out" && (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.actions,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							disabled: pending,
							onClick: () => {
								restore();
							},
							children: pending ? t("identityRestoring") : t("onboardingRestore")
						})
					}),
					error !== null && (0, react_jsx_runtime.jsx)("p", {
						className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
						role: "alert",
						children: error
					})
				]
			});
		}
		function TabButton(props) {
			return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "tab",
				"aria-selected": props.active,
				className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.tab} ${props.active ? _dsh_awiki_css_AwikiSettingsSection_module_css_default.tabActive : ""}`,
				onClick: props.onClick,
				children: props.children
			});
		}
		function AccountPanel(props) {
			const { t, view } = props;
			const account = view.account?.account;
			const [amount, setAmount] = (0, react.useState)("1.00");
			const [qrDataUrl, setQrDataUrl] = (0, react.useState)(null);
			const [refreshingPayment, setRefreshingPayment] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(null);
			const order = view.account?.pending_recharge_order ?? null;
			(0, react.useEffect)(() => {
				let stopped = false;
				setQrDataUrl(null);
				if (order?.status !== "pending" || order.payment_action?.type !== "qr_code") return;
				import_browser.toDataURL(order.payment_action.data, {
					width: 220,
					margin: 1,
					errorCorrectionLevel: "M",
					color: {
						dark: "#111111ff",
						light: "#ffffffff"
					}
				}).then((value) => {
					if (!stopped) setQrDataUrl(value);
				}).catch(() => {
					if (!stopped) setMessage({
						kind: "error",
						text: t("paymentQrFailed")
					});
				});
				return () => {
					stopped = true;
				};
			}, [
				order?.out_trade_no,
				order?.payment_action?.data,
				order?.payment_action?.type,
				order?.status,
				t
			]);
			(0, react.useEffect)(() => {
				if (order?.status !== "pending") return;
				let stopped = false;
				let polling = false;
				const poll = async () => {
					if (polling) return;
					polling = true;
					try {
						const current = await props.models.rechargeStatus(order.out_trade_no);
						if (stopped) return;
						if (current.status === "paid") setMessage({
							kind: "saved",
							text: t("rechargePaid")
						});
						if (current.status === "closed") setMessage({
							kind: "error",
							text: t("rechargeClosed")
						});
					} catch (error) {
						if (!stopped) setMessage({
							kind: "error",
							text: displayError(error, t("rechargeStatusFailed"))
						});
					} finally {
						polling = false;
					}
				};
				const timer = window.setInterval(() => {
					poll();
				}, 2e3);
				return () => {
					stopped = true;
					window.clearInterval(timer);
				};
			}, [
				order?.out_trade_no,
				order?.status,
				props.models,
				t
			]);
			const setEnabled = async (enabled) => {
				setMessage(null);
				try {
					await props.models.setEnabled(enabled);
					setMessage({
						kind: "saved",
						text: enabled ? t("modelsEnabled") : t("modelsDisabled")
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: displayError(error, t("modelActionFailed"))
					});
				}
			};
			const createRecharge = async (event) => {
				event.preventDefault();
				const cents = parseAmountCents(amount);
				if (cents === void 0) {
					setMessage({
						kind: "error",
						text: t("invalidRechargeAmount")
					});
					return;
				}
				setMessage(null);
				try {
					const created = await props.models.createRecharge(cents);
					if (created.payment_action?.type === "redirect_url") {
						if (!openPaymentUrl(created.payment_action.data)) throw new Error(t("paymentWindowFailed"));
					}
					setMessage({
						kind: "saved",
						text: t("rechargeCreated")
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: displayError(error, t("rechargeFailed"))
					});
				}
			};
			const refreshPayment = async () => {
				if (order === null || refreshingPayment) return;
				setRefreshingPayment(true);
				setMessage(null);
				try {
					const current = await props.models.rechargeStatus(order.out_trade_no);
					if (current.status === "paid") setMessage({
						kind: "saved",
						text: t("rechargePaid")
					});
					if (current.status === "closed") setMessage({
						kind: "error",
						text: t("rechargeClosed")
					});
				} catch (error) {
					setMessage({
						kind: "error",
						text: displayError(error, t("rechargeStatusFailed"))
					});
				} finally {
					setRefreshingPayment(false);
				}
			};
			const continuePayment = () => {
				if (order?.payment_action?.type !== "redirect_url" || !openPaymentUrl(order.payment_action.data)) setMessage({
					kind: "error",
					text: t("paymentWindowFailed")
				});
			};
			if ((view.status === "idle" || view.status === "loading") && account === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.status,
				children: t("modelAccountLoading")
			});
			if (view.status === "unavailable" || account === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.notice} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
				role: "alert",
				children: view.error ?? t("modelAccountUnavailable")
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsxs)("dl", {
						className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.accountSummary} ${account.billing_mode === "development_bypass" ? _dsh_awiki_css_AwikiSettingsSection_module_css_default.accountSummaryDevelopment : ""}`,
						children: [
							(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("accountBalance") }), (0, react_jsx_runtime.jsxs)("dd", { children: [
								account.balance,
								" ",
								account.currency
							] })] }),
							(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("modelStatus") }), (0, react_jsx_runtime.jsx)("dd", { children: view.account?.enabled ? t("statusEnabled") : t("statusDisabled") })] }),
							account.billing_mode === "development_bypass" && (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("billingMode") }), (0, react_jsx_runtime.jsx)("dd", { children: t("billingBypass") })] })
						]
					}),
					account.billing_mode === "development_bypass" && (0, react_jsx_runtime.jsx)("p", {
						className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.notice} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.developmentNotice}`,
						children: t("billingBypassNotice")
					}),
					!account.model_access_available && (0, react_jsx_runtime.jsxs)("div", {
						className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.notice} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.accessNotice}`,
						role: "status",
						children: [(0, react_jsx_runtime.jsx)("strong", { children: account.model_access_reason === "insufficient_balance" ? t("insufficientBalanceTitle") : t("modelAccessUnavailableTitle") }), (0, react_jsx_runtime.jsx)("span", { children: account.model_access_reason === "insufficient_balance" ? t("insufficientBalanceDescription") : t("modelAccessUnavailable") })]
					}),
					account.model_access_available && (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.actions,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							...view.account?.enabled ? { variant: "outline" } : {},
							disabled: view.pending !== null || view.status === "loading",
							onClick: () => {
								setEnabled(view.account?.enabled !== true);
							},
							children: view.pending === "enable" ? t("enablingModels") : view.pending === "disable" ? t("disablingModels") : view.account?.enabled ? t("disableModels") : t("enableModels")
						})
					}),
					order !== null ? (0, react_jsx_runtime.jsxs)("section", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.paymentPanel,
						"aria-labelledby": "awiki-pending-recharge-title",
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.paymentHeader,
								children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h3", {
									id: "awiki-pending-recharge-title",
									children: t("pendingRechargeTitle")
								}), (0, react_jsx_runtime.jsx)("p", { children: t("pendingRechargeDescription", { amount: formatCents(order.amount_cents) }) })] }), (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.paymentStatus,
									children: t("orderPending")
								})]
							}),
							qrDataUrl !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.qrPayment,
								children: [(0, react_jsx_runtime.jsx)("img", {
									src: qrDataUrl,
									width: "220",
									height: "220",
									alt: t("paymentQrAlt")
								}), (0, react_jsx_runtime.jsx)("p", { children: t("paymentQrHint") })]
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.actions,
								children: [order.payment_action?.type === "redirect_url" && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "button",
									disabled: refreshingPayment,
									onClick: continuePayment,
									children: t("continuePayment")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "button",
									variant: "outline",
									disabled: refreshingPayment,
									onClick: () => {
										refreshPayment();
									},
									children: refreshingPayment ? t("refreshingPaymentStatus") : t("refreshPaymentStatus")
								})]
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.orderStatus,
								children: t("pendingRechargeLimit")
							})
						]
					}) : !account.payments_available ? (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.notice,
						children: t("paymentsUnavailable")
					}) : (0, react_jsx_runtime.jsxs)("form", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.recharge,
						onSubmit: (event) => {
							createRecharge(event);
						},
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.label,
							htmlFor: "awiki-recharge-amount",
							children: t("rechargeAmount")
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.rechargeRow,
							children: [(0, react_jsx_runtime.jsx)("input", {
								id: "awiki-recharge-amount",
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.input,
								value: amount,
								disabled: view.pending !== null,
								inputMode: "decimal",
								autoComplete: "off",
								onChange: (event) => {
									setAmount(event.target.value);
									setMessage(null);
								}
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "submit",
								...account.model_access_available ? { variant: "outline" } : {},
								disabled: view.pending !== null || view.status === "loading",
								children: view.pending === "recharge" ? t("creatingRecharge") : t("createRecharge")
							})]
						})]
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${message?.kind === "error" ? _dsh_awiki_css_AwikiSettingsSection_module_css_default.error : ""}`,
						role: message?.kind === "error" ? "alert" : "status",
						children: message?.text ?? view.error ?? ""
					})
				]
			});
		}
		function UsagePanel(props) {
			const { t, view } = props;
			if (view.status === "idle" || view.status === "loading" || view.usageLoading) return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.status,
				children: t("usageLoading")
			});
			if (view.status === "unavailable") return (0, react_jsx_runtime.jsx)("p", {
				className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.notice} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
				role: "alert",
				children: view.error ?? t("modelAccountUnavailable")
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.panelHeader,
						children: [(0, react_jsx_runtime.jsx)("p", {
							className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.description,
							children: view.account?.account.billing_mode === "development_bypass" ? t("usageDescriptionBypass") : t("usageDescription")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							disabled: view.usageLoading,
							onClick: () => {
								props.models.loadUsage();
							},
							children: t("reloadUsage")
						})]
					}),
					view.usage.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.notice,
						children: t("usageEmpty")
					}) : (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.usageList,
						children: view.usage.map((item) => (0, react_jsx_runtime.jsx)(UsageRow, {
							item,
							t
						}, item.id))
					}),
					view.error !== null && (0, react_jsx_runtime.jsx)("p", {
						className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
						role: "alert",
						children: view.error
					})
				]
			});
		}
		function UsageRow({ item, t }) {
			const tokens = item.cache_hit_tokens + item.cache_miss_tokens + item.completion_tokens;
			return (0, react_jsx_runtime.jsxs)("article", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.usageRow,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.usageMain,
					children: [(0, react_jsx_runtime.jsx)("strong", { children: item.model }), (0, react_jsx_runtime.jsx)("span", { children: formatDate(item.created_at) })]
				}), (0, react_jsx_runtime.jsxs)("dl", {
					className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.usageMetrics,
					children: [
						(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("usageTokens") }), (0, react_jsx_runtime.jsx)("dd", { children: tokens.toLocaleString() })] }),
						(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("usageCalculated") }), (0, react_jsx_runtime.jsx)("dd", { children: item.calculated_cost_micros === null ? t("usageNoPrice") : formatMicros(item.calculated_cost_micros) })] }),
						(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("usageCharged") }), (0, react_jsx_runtime.jsx)("dd", { children: formatMicros(item.charged_micros) })] })
					]
				})]
			});
		}
		function AdvancedPanel(props) {
			const { t, settings } = props;
			const current = settings.value?.domain ?? "awiki.ai";
			const overridden = hasDomainOverride(settings);
			const [draft, setDraft] = (0, react.useState)(current);
			const [edited, setEdited] = (0, react.useState)(false);
			const [pending, setPending] = (0, react.useState)(false);
			const [status, setStatus] = (0, react.useState)(null);
			const [clearOpen, setClearOpen] = (0, react.useState)(false);
			const [clearDraft, setClearDraft] = (0, react.useState)("");
			const [clearing, setClearing] = (0, react.useState)(false);
			const [clearStatus, setClearStatus] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!edited) setDraft(current);
			}, [current, edited]);
			if (settings.status === "loading") return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.status,
				children: t("loading")
			});
			const unavailable = settings.status !== "ready" || settings.mode !== "host";
			const disabled = unavailable || !settings.writable || pending;
			const save = async (event) => {
				event?.preventDefault();
				let normalized;
				try {
					normalized = normalizeAwikiDomain(draft);
				} catch {
					setStatus({
						kind: "error",
						text: t("invalidDomain")
					});
					return;
				}
				setPending(true);
				setStatus(null);
				try {
					await props.saveDomain(normalized);
					setDraft(normalized);
					setEdited(false);
					setStatus({
						kind: "saved",
						text: `${t("saved")} ${t("restartNotice")}`
					});
				} catch {
					setStatus({
						kind: "error",
						text: t("saveFailed")
					});
				} finally {
					setPending(false);
				}
			};
			const reset = async () => {
				setPending(true);
				setStatus(null);
				try {
					await props.resetDomain();
					setEdited(false);
					setStatus({
						kind: "saved",
						text: `${t("saved")} ${t("restartNotice")}`
					});
				} catch {
					setStatus({
						kind: "error",
						text: t("saveFailed")
					});
				} finally {
					setPending(false);
				}
			};
			const closeClear = () => {
				if (clearing) return;
				setClearOpen(false);
				setClearDraft("");
			};
			const clearLocalData = async () => {
				if (clearDraft !== t("clearConfirmationPhrase")) return;
				setClearing(true);
				setClearStatus(null);
				try {
					await props.clearLocalData();
					setClearOpen(false);
					setClearDraft("");
					setClearStatus({
						kind: "saved",
						text: t("clearSucceeded")
					});
				} catch {
					setClearStatus({
						kind: "error",
						text: t("clearFailed")
					});
				} finally {
					setClearing(false);
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsxs)("form", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.card,
						onSubmit: (event) => {
							save(event);
						},
						children: [
							(0, react_jsx_runtime.jsx)("label", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.label,
								htmlFor: "awiki-default-domain",
								children: t("domainLabel")
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.description,
								children: t("domainDescription")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								id: "awiki-default-domain",
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.input,
								value: draft,
								disabled,
								spellCheck: false,
								autoCapitalize: "none",
								autoCorrect: "off",
								inputMode: "url",
								placeholder: DEFAULT_AWIKI_DOMAIN,
								onChange: (event) => {
									setDraft(event.target.value);
									setEdited(true);
									setStatus(null);
								}
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.defaultValue,
								children: t("defaultValue", { domain: DEFAULT_AWIKI_DOMAIN })
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.actions,
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "submit",
									disabled: disabled || !edited || draft.trim() === "",
									children: pending ? t("saving") : t("save")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "button",
									variant: "outline",
									disabled: disabled || !overridden,
									onClick: () => {
										reset();
									},
									children: t("reset")
								})]
							}),
							unavailable ? (0, react_jsx_runtime.jsx)("p", {
								className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
								role: "alert",
								children: t("unavailable")
							}) : !settings.writable ? (0, react_jsx_runtime.jsx)("p", {
								className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
								role: "alert",
								children: t("readOnly")
							}) : (0, react_jsx_runtime.jsx)("p", {
								className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${status?.kind === "error" ? _dsh_awiki_css_AwikiSettingsSection_module_css_default.error : ""}`,
								role: "status",
								children: status?.text ?? ""
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.notice,
						children: t("identityNotice")
					}),
					(0, react_jsx_runtime.jsxs)("section", {
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.dangerZone,
						"aria-labelledby": "awiki-danger-zone-title",
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.dangerCopy,
								children: [(0, react_jsx_runtime.jsx)("h3", {
									id: "awiki-danger-zone-title",
									className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.dangerTitle,
									children: t("dangerTitle")
								}), (0, react_jsx_runtime.jsx)("p", {
									className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.dangerDescription,
									children: t("dangerDescription")
								})]
							}),
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								variant: "outline",
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.dangerButton,
								disabled: unavailable || clearing,
								onClick: () => {
									setClearStatus(null);
									setClearOpen(true);
								},
								children: t("clearLocalData")
							}),
							clearStatus?.kind === "saved" && (0, react_jsx_runtime.jsx)("p", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.status,
								role: "status",
								children: clearStatus.text
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: clearOpen,
						onClose: closeClear,
						title: t("clearDialogTitle"),
						closeLabel: t("cancel"),
						description: t("clearDialogDescription"),
						className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.clearDialog ?? "",
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							disabled: clearing,
							onClick: closeClear,
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.clearConfirmButton,
							disabled: clearing || clearDraft !== t("clearConfirmationPhrase"),
							onClick: () => {
								clearLocalData();
							},
							children: clearing ? t("clearing") : t("clearConfirm")
						})] }),
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.clearWarning,
								children: [(0, react_jsx_runtime.jsx)("p", { children: t("clearScope") }), (0, react_jsx_runtime.jsx)("p", { children: t("clearRemoteNotice") })]
							}),
							(0, react_jsx_runtime.jsx)("label", {
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.confirmLabel,
								htmlFor: "awiki-clear-confirmation",
								children: t("clearConfirmationLabel", { phrase: t("clearConfirmationPhrase") })
							}),
							(0, react_jsx_runtime.jsx)("input", {
								id: "awiki-clear-confirmation",
								className: _dsh_awiki_css_AwikiSettingsSection_module_css_default.input,
								value: clearDraft,
								disabled: clearing,
								autoComplete: "off",
								spellCheck: false,
								autoFocus: true,
								onChange: (event) => {
									setClearDraft(event.target.value);
								}
							}),
							clearStatus?.kind === "error" && (0, react_jsx_runtime.jsx)("p", {
								className: `${_dsh_awiki_css_AwikiSettingsSection_module_css_default.status} ${_dsh_awiki_css_AwikiSettingsSection_module_css_default.error}`,
								role: "alert",
								children: clearStatus.text
							})
						]
					})
				]
			});
		}
		function parseAmountCents(value) {
			const normalized = value.trim();
			if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/u.test(normalized)) return void 0;
			const [yuan = "0", decimal = ""] = normalized.split(".");
			const cents = Number(yuan) * 100 + Number(decimal.padEnd(2, "0"));
			return Number.isSafeInteger(cents) && cents > 0 ? cents : void 0;
		}
		function openPaymentUrl(value) {
			try {
				const url = new URL(value);
				if (url.protocol !== "https:") return false;
				return window.open(url.toString(), "_blank", "noopener,noreferrer") !== null;
			} catch {
				return false;
			}
		}
		function formatMicros(value) {
			return `${(value / 1e6).toFixed(6)} CNY`;
		}
		function formatCents(value) {
			return `${(value / 100).toFixed(2)} CNY`;
		}
		function formatDate(value) {
			const date = new Date(value);
			return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(void 0, {
				dateStyle: "short",
				timeStyle: "short"
			}).format(date);
		}
		function displayError(error, fallback) {
			return error instanceof Error && error.message !== "" ? error.message : fallback;
		}
		//#endregion
		//#region lib/types/model-proxy-contract.js
		/** Browser-safe contracts for the loopback AWiki-hosted DeepSeek proxy channel. */
		const AWIKI_MODEL_PROXY_RPC_CHANNEL = "/awiki-model-proxy";
		const AWIKI_MODEL_PROXY_RPC_ENDPOINTS = {
			status: "status",
			usage: "usage",
			setEnabled: "set-enabled",
			createRecharge: "create-recharge",
			rechargeStatus: "recharge-status"
		};
		function decodeModelProxyStatus(value) {
			if (!isRecord$1(value) || typeof value.enabled !== "boolean") return void 0;
			const account = decodeAccount(value.account);
			if (account === void 0) return void 0;
			const pendingRechargeOrder = value.pending_recharge_order === null ? null : decodeRechargeOrder(value.pending_recharge_order);
			if (pendingRechargeOrder === void 0 || pendingRechargeOrder !== null && pendingRechargeOrder.status !== "pending") return void 0;
			if (value.recommended_model !== "deepseek-v4-flash" || !Array.isArray(value.models) || value.models.length !== 2 || value.models[0] !== "deepseek-v4-flash" || value.models[1] !== "deepseek-v4-pro") return void 0;
			return {
				enabled: value.enabled,
				account,
				pending_recharge_order: pendingRechargeOrder,
				recommended_model: "deepseek-v4-flash",
				models: ["deepseek-v4-flash", "deepseek-v4-pro"]
			};
		}
		function decodeModelProxyUsage(value) {
			if (!Array.isArray(value)) return void 0;
			const usage = value.map(decodeUsage);
			return usage.every((item) => item !== void 0) ? usage : void 0;
		}
		function decodeRechargeOrder(value) {
			if (!isRecord$1(value) || typeof value.out_trade_no !== "string" || !Number.isSafeInteger(value.amount_cents) || ![
				"pending",
				"paid",
				"closed"
			].includes(String(value.status)) || typeof value.provider !== "string" || typeof value.payment_method !== "string" || typeof value.created_at !== "string") return void 0;
			if (value.payment_action !== void 0 && (!isRecord$1(value.payment_action) || !["redirect_url", "qr_code"].includes(String(value.payment_action.type)) || typeof value.payment_action.data !== "string")) return void 0;
			const action = value.payment_action;
			return {
				out_trade_no: value.out_trade_no,
				amount_cents: value.amount_cents,
				status: value.status,
				provider: value.provider,
				payment_method: value.payment_method,
				created_at: value.created_at,
				...action === void 0 ? {} : { payment_action: {
					type: action.type,
					data: action.data
				} }
			};
		}
		function decodeAccount(value) {
			if (!(isRecord$1(value) && typeof value.did === "string" && Number.isSafeInteger(value.balance_cents) && typeof value.balance === "string" && value.currency === "CNY" && typeof value.model_access_available === "boolean" && (value.model_access_reason === null || typeof value.model_access_reason === "string") && ["strict", "development_bypass"].includes(String(value.billing_mode)) && typeof value.payments_available === "boolean")) return void 0;
			return {
				did: value.did,
				balance_cents: value.balance_cents,
				balance: value.balance,
				currency: "CNY",
				model_access_available: value.model_access_available,
				model_access_reason: value.model_access_reason,
				billing_mode: value.billing_mode,
				payments_available: value.payments_available
			};
		}
		function decodeUsage(value) {
			if (!(isRecord$1(value) && Number.isSafeInteger(value.id) && typeof value.endpoint === "string" && typeof value.model === "string" && Number.isSafeInteger(value.cache_hit_tokens) && Number.isSafeInteger(value.cache_miss_tokens) && Number.isSafeInteger(value.completion_tokens) && ["strict", "development_bypass"].includes(String(value.billing_mode)) && (value.calculated_cost_micros === null || Number.isSafeInteger(value.calculated_cost_micros)) && Number.isSafeInteger(value.charged_micros) && typeof value.estimated === "boolean" && typeof value.created_at === "string")) return void 0;
			return {
				id: value.id,
				endpoint: value.endpoint,
				model: value.model,
				cache_hit_tokens: value.cache_hit_tokens,
				cache_miss_tokens: value.cache_miss_tokens,
				completion_tokens: value.completion_tokens,
				billing_mode: value.billing_mode,
				calculated_cost_micros: value.calculated_cost_micros,
				charged_micros: value.charged_micros,
				estimated: value.estimated,
				created_at: value.created_at
			};
		}
		function isRecord$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		//#endregion
		//#region lib/types/client/model-proxy-controller.js
		/** Reactive loopback client for browser-safe AWiki-hosted DeepSeek account operations. */
		const INITIAL = Object.freeze({
			status: "idle",
			account: null,
			usage: [],
			usageLoading: false,
			pending: null,
			error: null
		});
		var AwikiModelProxyController = class {
			connection;
			identity;
			view = INITIAL;
			listeners = /* @__PURE__ */ new Set();
			abort = new AbortController();
			sessionAbort = new AbortController();
			unsubscribeSession;
			sessionActive;
			disposed = false;
			generation = 0;
			constructor(connection, identity) {
				this.connection = connection;
				this.identity = identity;
				this.unsubscribeSession = identity.subscribe(() => {
					this.syncSession();
				});
				this.syncSession();
			}
			getSnapshot = () => this.view;
			subscribe = (listener) => {
				if (this.disposed) return () => {};
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			async load() {
				if (!this.active()) return;
				if (this.disposed || !this.connection.isLoopback) {
					this.publish({
						...this.view,
						status: "unavailable",
						error: "AWiki 托管模型账户仅能在本机管理。"
					});
					return;
				}
				const generation = ++this.generation;
				this.publish({
					...this.view,
					status: "loading",
					error: null
				});
				try {
					const account = decodeModelProxyStatus(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status, {}));
					if (account === void 0) throw new Error("账户响应格式无效");
					if (generation !== this.generation || this.disposed) return;
					this.publish({
						...this.view,
						status: "ready",
						account,
						error: null
					});
				} catch (error) {
					if (generation !== this.generation || this.disposed) return;
					this.publish({
						...this.view,
						status: "unavailable",
						account: null,
						error: message(error)
					});
				}
			}
			async loadUsage() {
				if (!this.active() || this.disposed || this.view.usageLoading) return;
				const generation = this.generation;
				this.publish({
					...this.view,
					usageLoading: true,
					error: null
				});
				try {
					const usage = decodeModelProxyUsage(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.usage, {}));
					if (usage === void 0) throw new Error("用量响应格式无效");
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						usage,
						usageLoading: false
					});
				} catch (error) {
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						usageLoading: false,
						error: message(error)
					});
				}
			}
			async setEnabled(enabled) {
				if (!this.active() || this.disposed || this.view.pending !== null) return;
				const generation = this.generation;
				this.publish({
					...this.view,
					pending: enabled ? "enable" : "disable",
					error: null
				});
				try {
					const account = decodeModelProxyStatus(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled, { enabled }));
					if (account === void 0) throw new Error("模型状态响应格式无效");
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						status: "ready",
						account,
						pending: null
					});
				} catch (error) {
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						pending: null,
						error: message(error)
					});
					throw error;
				}
			}
			async createRecharge(amountCents) {
				if (!this.active()) throw new Error("请先登录 AWiki 身份");
				if (this.disposed || this.view.pending !== null) throw new Error("已有操作正在进行");
				const generation = this.generation;
				this.publish({
					...this.view,
					pending: "recharge",
					error: null
				});
				try {
					const order = decodeRechargeOrder(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.createRecharge, { amount_cents: amountCents }));
					if (order === void 0 || order.payment_action === void 0) throw new Error("充值响应格式无效");
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						account: this.view.account === null ? null : {
							...this.view.account,
							pending_recharge_order: order
						},
						pending: null
					});
					return order;
				} catch (error) {
					if (error instanceof Error && error.message === "pending_recharge_order_exists") {
						await this.load();
						if (!this.disposed) this.publish({
							...this.view,
							pending: null
						});
						throw new Error("已有一笔待支付订单，请先完成支付或等待订单关闭。");
					}
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						pending: null,
						error: message(error)
					});
					throw error;
				}
			}
			async rechargeStatus(outTradeNo) {
				if (!this.active()) throw new Error("请先登录 AWiki 身份");
				const order = decodeRechargeOrder(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus, { out_trade_no: outTradeNo }));
				if (order === void 0) throw new Error("充值状态响应格式无效");
				const previous = this.view.account?.pending_recharge_order;
				const current = order.payment_action === void 0 && previous?.out_trade_no === order.out_trade_no && previous.payment_action !== void 0 ? {
					...order,
					payment_action: previous.payment_action
				} : order;
				if (order.status === "paid" || order.status === "closed") await this.load();
				else if (!this.disposed && this.view.account !== null) this.publish({
					...this.view,
					account: {
						...this.view.account,
						pending_recharge_order: current
					}
				});
				return current;
			}
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.generation += 1;
				this.unsubscribeSession();
				this.sessionAbort.abort();
				this.abort.abort();
				this.listeners.clear();
			}
			async call(endpoint, payload) {
				const result = await this.connection.rpc.call(AWIKI_MODEL_PROXY_RPC_CHANNEL, endpoint, payload, AbortSignal.any([this.abort.signal, this.sessionAbort.signal]));
				if (!result.ok) throw new Error(result.error.message);
				return result.value;
			}
			publish(next) {
				this.view = Object.freeze(next);
				for (const listener of [...this.listeners]) listener();
			}
			active() {
				return !this.disposed && this.sessionActive === true;
			}
			syncSession() {
				if (this.disposed) return;
				const view = this.identity.getSnapshot();
				const active = view.status === "ready" && view.sessionStatus === "active" && view.identity !== null;
				if (active === this.sessionActive) return;
				this.sessionActive = active;
				this.generation += 1;
				this.sessionAbort.abort();
				this.sessionAbort = new AbortController();
				this.publish(active ? INITIAL : {
					...INITIAL,
					status: "identity-required"
				});
			}
		};
		function message(error) {
			return error instanceof Error && error.message !== "" ? error.message : "AWiki 托管模型服务暂不可用。";
		}
		//#endregion
		//#region lib/types/client/store.js
		/** Root-scoped interaction state for the AWiki overlay. */
		/**
		* Create the overlay's root-scoped interaction store.
		* @returns a fresh framework store handle.
		*/
		function createAwikiOverlayStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({ open: false }),
				actions: {
					open: (draft) => {
						draft.open = true;
					},
					close: (draft) => {
						draft.open = false;
					},
					toggle: (draft) => {
						draft.open = !draft.open;
					}
				}
			});
		}
		//#endregion
		//#region lib/types/client/settings-locales.js
		/** Bilingual copy for the AWiki settings section. */
		/** Simplified Chinese dictionary. */
		const zh = {
			nav: "AWiki",
			intro: "管理 AWiki 托管模型账户、用量和身份高级设置。",
			tabAccount: "账户与充值",
			tabUsage: "用量明细",
			tabAdvanced: "高级设置",
			accountBalance: "账户余额",
			billingMode: "计费模式",
			billingStrict: "正式计费",
			billingBypass: "开发联调",
			billingBypassNotice: "当前为开发联调模式，模型调用不会扣减账户余额。",
			modelStatus: "AWiki 托管模型",
			statusEnabled: "已启用",
			statusDisabled: "未启用",
			enableModels: "启用 AWiki 托管模型",
			disableModels: "停用 AWiki 托管模型",
			enablingModels: "正在启用…",
			disablingModels: "正在停用…",
			modelsEnabled: "AWiki 托管模型已启用，默认模型为 DeepSeek V4 Flash。",
			modelsDisabled: "AWiki 托管模型已停用，并已恢复此前的默认模型。",
			modelActionFailed: "未能更新 AWiki 托管模型状态。",
			insufficientBalanceTitle: "余额不足",
			insufficientBalanceDescription: "充值到账后即可启用 AWiki 托管模型。充值不会自动启用模型或切换当前模型。",
			modelAccessUnavailableTitle: "暂时无法启用",
			modelAccessUnavailable: "当前账户暂不满足模型访问条件，请稍后刷新重试。",
			modelAccountLoading: "正在读取 AWiki 托管模型账户…",
			modelAccountUnavailable: "AWiki 托管模型账户暂不可用。",
			paymentsUnavailable: "开发环境暂未开放充值。",
			rechargeAmount: "充值金额（元）",
			createRecharge: "创建充值",
			creatingRecharge: "正在创建…",
			invalidRechargeAmount: "请输入大于 0 且最多两位小数的金额。",
			rechargeCreated: "充值订单已创建。支付完成后余额会自动刷新，但不会自动启用或切换模型。",
			rechargeFailed: "未能创建充值订单。",
			rechargePaid: "充值已到账。是否启用 AWiki 托管模型仍由你决定。",
			rechargeClosed: "充值订单已关闭。",
			rechargeStatusFailed: "暂时无法刷新充值状态。",
			paymentWindowFailed: "未能打开系统浏览器中的支付页面。",
			paymentQrAlt: "支付宝充值二维码",
			paymentQrHint: "请使用支付宝扫描二维码完成充值。",
			paymentQrFailed: "未能生成支付二维码，请刷新页面后重试。",
			pendingRechargeTitle: "等待完成充值",
			pendingRechargeDescription: "已有一笔 {amount} 的订单等待支付。",
			pendingRechargeLimit: "该订单支付或关闭前不能创建新的充值订单。支付到账后仍需由你明确启用模型。",
			continuePayment: "继续支付",
			refreshPaymentStatus: "刷新支付状态",
			refreshingPaymentStatus: "正在刷新…",
			rechargeOrderStatus: "订单状态：{status}",
			orderPending: "等待支付",
			orderPaid: "已支付",
			orderClosed: "已关闭",
			usageLoading: "正在读取模型用量…",
			usageDescription: "最近 100 条模型调用记录。",
			usageDescriptionBypass: "最近 100 条模型调用记录。开发联调模式仍记录 Token，但实际扣费为 0。",
			reloadUsage: "刷新用量",
			usageEmpty: "暂无模型调用记录。",
			usageTokens: "Token",
			usageCalculated: "计算费用",
			usageCharged: "实际扣费",
			usageNoPrice: "未配置价表",
			onboardingUseApiKey: "使用 API Key",
			onboardingLater: "稍后配置",
			onboardingClose: "关闭首次引导",
			onboardingConnectTitle: "连接 AWiki",
			onboardingIdentityUnavailable: "AWiki 身份服务暂不可用。",
			onboardingModelTitle: "使用 AWiki 托管模型",
			onboardingRegistrationDescription: "创建或使用当前设备的 AWiki 身份，即可通过 AWiki 托管代理服务访问 DeepSeek 模型。",
			onboardingRestoreTitle: "恢复 AWiki 身份",
			onboardingRestoreDescription: "这台设备保留了一个已退出的 AWiki 身份。恢复后可以继续使用原账户。",
			onboardingRestore: "恢复身份",
			onboardingEnableTitle: "启用 AWiki 托管模型",
			onboardingBypassDescription: "当前为开发联调模式，可直接启用模型，不会扣减账户余额。",
			onboardingStrictDescription: "启用后默认使用 DeepSeek V4 Flash，可随时在模型选择器中切换到 Pro。",
			onboardingInsufficientBalanceDescription: "当前余额不足，需要先充值。充值到账后，你可以再决定是否启用 AWiki 托管模型。",
			onboardingPendingRechargeDescription: "你有一笔充值订单等待支付。完成支付后，再由你明确启用 AWiki 托管模型。",
			goToRecharge: "前往充值",
			identityLoading: "正在读取 AWiki 身份状态…",
			identitySignedOutRequired: "当前 AWiki 身份已退出。恢复这台设备保留的身份后，才能查看账户余额、充值和用量。",
			identityRegistrationRequired: "请先通过 AWiki 面板创建身份，再查看账户余额、充值和用量。",
			identityRestoring: "正在恢复…",
			domainLabel: "默认域名",
			domainDescription: "输入纯域名，不要包含协议、路径或端口。",
			defaultValue: "默认值：{domain}",
			save: "保存",
			saving: "保存中…",
			reset: "恢复默认值",
			saved: "已保存。",
			restartNotice: "重启 DeepSeek Harness 后生效。",
			identityNotice: "此设置仅影响后续注册和短 Handle 的域名补全，不会改写已经注册的 DID 或 Handle。",
			invalidDomain: "请输入有效的域名，例如 awiki.ai。",
			saveFailed: "未能保存设置，请刷新后重试。",
			loading: "正在读取 AWiki 设置…",
			unavailable: "当前连接无法修改 Host 设置。请在运行 DeepSeek Harness 的本机打开此页面。",
			readOnly: "当前设置文件为只读。",
			dangerTitle: "危险区域",
			dangerDescription: "永久清除此安装中的 AWiki 身份与消息数据。此操作无法撤销。",
			clearLocalData: "清空本地 AWiki 数据",
			clearDialogTitle: "确认清空本地 AWiki 数据",
			clearDialogDescription: "这是不可恢复的危险操作。请确认你了解以下影响后再继续。",
			clearScope: "本地 DID、私钥、访问令牌、注册草稿、会话记录和附件索引都会被永久删除。",
			clearRemoteNotice: "服务端 AWiki 账号与 Handle 不会被删除；失去本地私钥后，本安装可能无法再使用原身份。",
			clearConfirmationLabel: "请输入“{phrase}”以确认：",
			clearConfirmationPhrase: "永久清空",
			clearConfirm: "永久清空",
			clearing: "正在清空…",
			clearSucceeded: "本地 AWiki 数据已清空，无法恢复。",
			clearFailed: "未能清空本地 AWiki 数据，未完成删除。请重试。",
			cancel: "取消"
		};
		/** English dictionary. */
		const en = {
			nav: "AWiki",
			intro: "Manage the AWiki-hosted DeepSeek account, usage, and advanced identity settings.",
			tabAccount: "Account & Recharge",
			tabUsage: "Usage",
			tabAdvanced: "Advanced",
			accountBalance: "Account balance",
			billingMode: "Billing mode",
			billingStrict: "Production billing",
			billingBypass: "Development",
			billingBypassNotice: "Development bypass is active. Model calls do not reduce the account balance.",
			modelStatus: "AWiki-hosted DeepSeek",
			statusEnabled: "Enabled",
			statusDisabled: "Disabled",
			enableModels: "Enable AWiki-hosted DeepSeek",
			disableModels: "Disable AWiki-hosted DeepSeek",
			enablingModels: "Enabling…",
			disablingModels: "Disabling…",
			modelsEnabled: "AWiki-hosted DeepSeek is enabled. DeepSeek V4 Flash is now the default.",
			modelsDisabled: "AWiki-hosted DeepSeek is disabled and the previous default model was restored.",
			modelActionFailed: "The AWiki-hosted DeepSeek setting could not be updated.",
			insufficientBalanceTitle: "Insufficient balance",
			insufficientBalanceDescription: "Recharge the account before enabling AWiki-hosted DeepSeek. Recharge never enables or switches models automatically.",
			modelAccessUnavailableTitle: "Temporarily unavailable",
			modelAccessUnavailable: "This account cannot access hosted models right now. Refresh and try again later.",
			modelAccountLoading: "Loading the AWiki-hosted DeepSeek account…",
			modelAccountUnavailable: "The AWiki-hosted DeepSeek account is unavailable.",
			paymentsUnavailable: "Recharge is not available in this development environment.",
			rechargeAmount: "Recharge amount (CNY)",
			createRecharge: "Create recharge",
			creatingRecharge: "Creating…",
			invalidRechargeAmount: "Enter an amount greater than zero with no more than two decimal places.",
			rechargeCreated: "The recharge order was created. Payment refreshes the balance but never enables or switches models automatically.",
			rechargeFailed: "The recharge order could not be created.",
			rechargePaid: "The recharge was credited. You still decide whether to enable AWiki-hosted DeepSeek.",
			rechargeClosed: "The recharge order was closed.",
			rechargeStatusFailed: "The recharge status could not be refreshed.",
			paymentWindowFailed: "The payment page could not be opened in the system browser.",
			paymentQrAlt: "Alipay recharge QR code",
			paymentQrHint: "Scan this QR code with Alipay to complete the recharge.",
			paymentQrFailed: "The payment QR code could not be generated. Refresh the page and try again.",
			pendingRechargeTitle: "Complete your recharge",
			pendingRechargeDescription: "A {amount} order is awaiting payment.",
			pendingRechargeLimit: "A new recharge cannot be created until this order is paid or closed. Payment never enables models automatically.",
			continuePayment: "Continue payment",
			refreshPaymentStatus: "Refresh payment status",
			refreshingPaymentStatus: "Refreshing…",
			rechargeOrderStatus: "Order status: {status}",
			orderPending: "Awaiting payment",
			orderPaid: "Paid",
			orderClosed: "Closed",
			usageLoading: "Loading model usage…",
			usageDescription: "The latest 100 model calls.",
			usageDescriptionBypass: "The latest 100 model calls. Development mode records tokens while charging zero.",
			reloadUsage: "Refresh usage",
			usageEmpty: "No model usage has been recorded.",
			usageTokens: "Tokens",
			usageCalculated: "Calculated",
			usageCharged: "Charged",
			usageNoPrice: "No active price",
			onboardingUseApiKey: "Use an API key",
			onboardingLater: "Configure later",
			onboardingClose: "Close onboarding",
			onboardingConnectTitle: "Connect AWiki",
			onboardingIdentityUnavailable: "The AWiki identity service is unavailable.",
			onboardingModelTitle: "Use AWiki-hosted DeepSeek",
			onboardingRegistrationDescription: "Create or use this device’s AWiki identity to access DeepSeek through AWiki’s hosted proxy service.",
			onboardingRestoreTitle: "Restore AWiki identity",
			onboardingRestoreDescription: "This device retains a signed-out AWiki identity. Restore it to continue using the existing account.",
			onboardingRestore: "Restore identity",
			onboardingEnableTitle: "Enable AWiki-hosted DeepSeek",
			onboardingBypassDescription: "Development bypass is active, so models can be enabled without reducing the account balance.",
			onboardingStrictDescription: "DeepSeek V4 Flash becomes the default. You can switch to Pro from the model selector.",
			onboardingInsufficientBalanceDescription: "The balance is insufficient. Recharge first, then decide whether to enable AWiki-hosted DeepSeek.",
			onboardingPendingRechargeDescription: "A recharge order is awaiting payment. After it is paid, you still explicitly choose whether to enable AWiki-hosted DeepSeek.",
			goToRecharge: "Go to recharge",
			identityLoading: "Loading the AWiki identity…",
			identitySignedOutRequired: "The AWiki identity is signed out. Restore the identity retained on this device to view the account, recharge, and usage.",
			identityRegistrationRequired: "Create an identity from the AWiki panel before viewing the account, recharge, and usage.",
			identityRestoring: "Restoring…",
			domainLabel: "Default domain",
			domainDescription: "Enter a bare domain without a protocol, path, or port.",
			defaultValue: "Default: {domain}",
			save: "Save",
			saving: "Saving…",
			reset: "Restore default",
			saved: "Saved.",
			restartNotice: "Restart DeepSeek Harness for the change to take effect.",
			identityNotice: "This affects future registrations and short-Handle completion. It does not rewrite an existing DID or Handle.",
			invalidDomain: "Enter a valid domain, such as awiki.ai.",
			saveFailed: "The setting could not be saved. Refresh and try again.",
			loading: "Loading AWiki settings…",
			unavailable: "This connection cannot edit Host settings. Open this page on the machine running DeepSeek Harness.",
			readOnly: "The settings document is read-only.",
			dangerTitle: "Danger zone",
			dangerDescription: "Permanently clear the AWiki identity and message data stored by this installation. This cannot be undone.",
			clearLocalData: "Clear local AWiki data",
			clearDialogTitle: "Clear local AWiki data?",
			clearDialogDescription: "This is an irreversible operation. Confirm that you understand the impact before continuing.",
			clearScope: "The local DID, private keys, access token, registration draft, conversations, and attachment index will be permanently deleted.",
			clearRemoteNotice: "The server-side AWiki account and Handle are not deleted. Without the local private key, this installation may lose access to the original identity.",
			clearConfirmationLabel: "Type “{phrase}” to confirm:",
			clearConfirmationPhrase: "PERMANENTLY CLEAR",
			clearConfirm: "Clear permanently",
			clearing: "Clearing…",
			clearSucceeded: "Local AWiki data was cleared and cannot be recovered.",
			clearFailed: "Local AWiki data could not be cleared. Deletion did not complete. Try again.",
			cancel: "Cancel"
		};
		//#endregion
		//#region lib/types/settings-rpc-contract.js
		/** Client-safe contract for AWiki's plugin-owned settings transport. */
		/** Dedicated Connection channel; the Host registers it with loopback authority. */
		const AWIKI_SETTINGS_RPC_CHANNEL = "/awiki-settings";
		/** Supported channel-relative operations. */
		const AWIKI_SETTINGS_RPC_ENDPOINTS = {
			describe: "describe",
			setDomain: "set-domain",
			resetDomain: "reset-domain"
		};
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function decodeLayer(value) {
			if (!isRecord(value)) return void 0;
			if (!Object.hasOwn(value, "domain")) return {};
			if (typeof value.domain !== "string") return void 0;
			try {
				const domain = normalizeAwikiDomain(value.domain);
				if (domain !== value.domain) return void 0;
				return { domain };
			} catch {
				return;
			}
		}
		/** Fail closed when the Host response is not exactly usable by the settings UI. */
		function decodeAwikiSettingsRpcView(value) {
			if (!isRecord(value) || !isRecord(value.value) || typeof value.value.domain !== "string" || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.writable !== "boolean") return void 0;
			let domain;
			try {
				domain = normalizeAwikiDomain(value.value.domain);
			} catch {
				return;
			}
			if (domain !== value.value.domain) return void 0;
			const base = value.base === void 0 ? void 0 : decodeLayer(value.base);
			const user = value.user === void 0 ? void 0 : decodeLayer(value.user);
			if (value.base !== void 0 && base === void 0 || value.user !== void 0 && user === void 0) return void 0;
			return {
				value: { domain },
				...base === void 0 ? {} : { base },
				...user === void 0 ? {} : { user },
				revision: value.revision,
				writable: value.writable
			};
		}
		//#endregion
		//#region lib/types/client/settings-controller.js
		/** Reactive browser mirror for AWiki's loopback-only settings channel. */
		const INITIAL_HOST_SNAPSHOT = {
			status: "loading",
			value: void 0,
			base: void 0,
			user: void 0,
			revision: void 0,
			writable: false,
			mode: "host"
		};
		const REMOTE_SNAPSHOT = {
			...INITIAL_HOST_SNAPSHOT,
			status: "unavailable",
			mode: "memory"
		};
		/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
		var AwikiSettingsController = class {
			connection;
			snapshot;
			listeners = /* @__PURE__ */ new Set();
			abort = new AbortController();
			disposeHostDescription;
			writeTail = Promise.resolve();
			requestVersion = 0;
			disposed = false;
			constructor(connection) {
				this.connection = connection;
				this.snapshot = connection.isLoopback ? INITIAL_HOST_SNAPSHOT : REMOTE_SNAPSHOT;
				this.disposeHostDescription = connection.isLoopback ? connection.hostDescription.subscribe(() => {
					this.load();
				}) : () => {};
			}
			getSnapshot() {
				return this.snapshot;
			}
			subscribe(listener) {
				if (this.disposed) return () => {};
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/** Load or reload the Host view; transport failures become a disabled UI state. */
			async load() {
				if (!this.connection.isLoopback || this.disposed) return;
				const version = ++this.requestVersion;
				try {
					const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS.describe, {}, this.abort.signal);
					const view = result.ok ? decodeAwikiSettingsRpcView(result.value) : void 0;
					if (view === void 0) throw new Error("AWiki settings view is unavailable");
					if (version !== this.requestVersion || this.disposed) return;
					this.publish({
						status: "ready",
						value: view.value,
						base: view.base,
						user: view.user,
						revision: view.revision,
						writable: view.writable,
						mode: "host"
					});
				} catch {
					if (version !== this.requestVersion || this.disposed) return;
					this.publish({
						...this.snapshot,
						status: "unavailable",
						writable: false,
						mode: "host"
					});
				}
			}
			set(field, value) {
				if (field !== "domain" || typeof value !== "string") return Promise.reject(/* @__PURE__ */ new TypeError("AWiki settings only supports a string domain field"));
				const domain = normalizeAwikiDomain(value);
				return this.enqueue(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, { domain });
			}
			unset(field) {
				if (field !== "domain") return Promise.reject(/* @__PURE__ */ new TypeError("AWiki settings only supports the domain field"));
				return this.enqueue(AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain, {});
			}
			/** Stop reconnect reads and cancel outstanding transport calls. */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.requestVersion += 1;
				this.abort.abort();
				this.disposeHostDescription();
				this.listeners.clear();
			}
			enqueue(endpoint, payload) {
				const run = this.writeTail.catch(() => void 0).then(() => this.write(endpoint, payload));
				this.writeTail = run;
				return run;
			}
			async write(endpoint, payload) {
				const revision = this.snapshot.revision;
				if (this.disposed || !this.connection.isLoopback || this.snapshot.status !== "ready" || !this.snapshot.writable || revision === void 0) throw new Error("AWiki settings are not writable");
				const version = ++this.requestVersion;
				try {
					const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, endpoint, {
						...payload,
						expectedRevision: revision
					}, this.abort.signal);
					const view = result.ok ? decodeAwikiSettingsRpcView(result.value) : void 0;
					if (view === void 0) throw new Error("AWiki settings change was rejected");
					if (version !== this.requestVersion || this.disposed) return;
					this.publish({
						status: "ready",
						value: view.value,
						base: view.base,
						user: view.user,
						revision: view.revision,
						writable: view.writable,
						mode: "host"
					});
				} catch {
					if (!this.disposed) await this.load();
					throw new Error("AWiki settings change was rejected");
				}
			}
			publish(next) {
				this.snapshot = next;
				for (const listener of [...this.listeners]) listener();
			}
		};
		//#endregion
		//#region lib/types/client/index.js
		/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */
		/** Required services: Remote, Connection transport, locale, and slot registry. */
		const inject = [
			"slots",
			"remote",
			"connection",
			"locale"
		];
		/**
		* Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
		* @param ctx - browser context carrying slots and Remote.
		* @returns disposer for the slot injection and AWiki Remote contribution.
		*/
		async function apply(ctx) {
			const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
			let disposeOverlay;
			let disposeSettings;
			let disposeOnboarding;
			let settingsController;
			let modelController;
			let awikiController;
			try {
				const remote = ctx.get("remote.awiki");
				if (remote === void 0) throw new Error("ui-awiki: mounted Remote namespace is unavailable");
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("ui-awiki: Connection service is unavailable");
				const settings = new AwikiSettingsController(connection);
				settingsController = settings;
				const awiki = new AwikiController(remote);
				awikiController = awiki;
				const models = new AwikiModelProxyController(connection, awiki);
				modelController = models;
				await settings.load();
				ctx.effect(() => {
					const disposeZh = ctx.locale.register("settings.awiki", "zh", zh);
					const disposeEn = ctx.locale.register("settings.awiki", "en", en);
					return () => {
						disposeEn();
						disposeZh();
					};
				}, "ui-awiki: settings dictionaries");
				disposeOverlay = ctx.slots.inject("shell.overlay", () => {
					return ctx.slots.register({
						name: "shell.overlay",
						id: "awiki",
						order: 20,
						store: createAwikiOverlayStore,
						inject: () => ({
							hooks: { awiki },
							open: () => awiki.open(),
							close: () => {
								awiki.close();
							},
							sendRegistrationOtp: (request) => awiki.sendRegistrationOtp(request),
							registerIdentity: (request) => awiki.registerIdentity(request),
							updateDisplayName: (displayName) => awiki.updateDisplayName(displayName),
							loadMoreConversations: () => awiki.loadMoreConversations(),
							startDirectChat: (handle) => awiki.startDirectChat(handle),
							selectConversation: (conversationId) => awiki.selectConversation(conversationId),
							markSelectedConversationRead: () => awiki.markSelectedConversationRead(),
							loadOlderHistory: () => awiki.loadOlderHistory(),
							summarizeConversation: () => awiki.summarizeConversation(),
							setSummaryCollapsed: (conversationId, collapsed) => {
								awiki.setSummaryCollapsed(conversationId, collapsed);
							},
							sendText: (text) => awiki.sendText(text),
							sendAttachment: (file) => awiki.sendAttachment(file),
							downloadAttachment: (messageId, attachmentId) => awiki.downloadAttachment(messageId, attachmentId),
							logout: () => awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }),
							login: () => awiki.login()
						})
					}, AwikiOverlay);
				});
				const injectedSettings = () => ({
					hooks: {
						awikiSettings: settings,
						awikiModelProxy: models,
						awikiSession: awiki
					},
					identity: awiki,
					models,
					saveDomain: async (raw) => {
						const domain = normalizeAwikiDomain(raw);
						await settings.set(AWIKI_DOMAIN_FIELD, domain);
						if (settings.getSnapshot().value?.domain !== domain) throw new Error("AWiki domain setting was not accepted");
					},
					resetDomain: async () => {
						await settings.unset(AWIKI_DOMAIN_FIELD);
						const snapshot = settings.getSnapshot();
						const base = typeof snapshot.base === "object" && snapshot.base !== null && !Array.isArray(snapshot.base) ? Reflect.get(snapshot.base, AWIKI_DOMAIN_FIELD) : void 0;
						if (typeof base === "string" && snapshot.value?.domain !== base) throw new Error("AWiki domain setting was not reset");
					},
					clearLocalData: async () => {
						const result = await awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION });
						if (!result.ok) throw new Error(result.error);
					}
				});
				disposeSettings = ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "awiki",
					order: 30,
					label: () => ctx.locale.bind("settings.awiki")("nav"),
					locale: "settings.awiki",
					inject: injectedSettings
				}, AwikiSettingsSection));
				disposeOnboarding = ctx.slots.inject("settings.onboarding", () => ctx.slots.register({
					name: "settings.onboarding",
					id: "awiki-model-proxy",
					order: -10,
					locale: "settings.awiki",
					inject: () => ({
						hooks: {
							awikiOnboarding: awiki,
							awikiModelProxy: models
						},
						identity: awiki,
						models
					})
				}, AwikiOnboarding));
			} catch (error) {
				disposeOnboarding?.();
				disposeSettings?.();
				disposeOverlay?.();
				modelController?.dispose();
				awikiController?.dispose();
				settingsController?.dispose();
				await disposeRemote();
				throw error;
			}
			return async () => {
				disposeOnboarding?.();
				disposeSettings?.();
				disposeOverlay?.();
				modelController?.dispose();
				awikiController?.dispose();
				settingsController?.dispose();
				await disposeRemote();
			};
		}
		//#endregion
		exports.apply = apply;
		exports.createAwikiOverlayStore = createAwikiOverlayStore;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map