window.__ModuleLoader__.load({
	id: "dsh-awiki",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
		const _deepseek_ai_dsh_awiki_awiki_downloadAttachment_parameter_0$schema = object({
			"attachmentId": intersection(string(), unknown()).readonly(),
			"messageId": intersection(string(), unknown()).readonly()
		});
		const _deepseek_ai_dsh_awiki_awiki_downloadAttachment_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_getConfig_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_getHistory_parameter_0$schema = object({
			"conversationId": intersection(string(), unknown()).readonly(),
			"cursor": intersection(string(), unknown()).readonly().optional(),
			"limit": number().readonly().optional()
		});
		const _deepseek_ai_dsh_awiki_awiki_getHistory_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_getIdentity_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_listConversations_parameter_0$schema = union([_undefined(), object({
			"cursor": intersection(string(), unknown()).readonly().optional(),
			"limit": number().readonly().optional()
		})]);
		const _deepseek_ai_dsh_awiki_awiki_listConversations_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_markConversationRead_parameter_0$schema = object({ "conversationId": intersection(string(), unknown()).readonly() });
		const _deepseek_ai_dsh_awiki_awiki_markConversationRead_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
					literal("network"),
					literal("remote")
				]).readonly(),
				"message": string().readonly()
			}).readonly()
		}), object({
			"ok": literal(true).readonly(),
			"value": number().readonly()
		})]);
		const _deepseek_ai_dsh_awiki_awiki_registerIdentity_parameter_0$schema = object({
			"handle": string().readonly(),
			"phone": string().readonly(),
			"otp": string().readonly()
		});
		const _deepseek_ai_dsh_awiki_awiki_registerIdentity_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_resolvePeer_parameter_0$schema = object({ "peer": string().readonly() });
		const _deepseek_ai_dsh_awiki_awiki_resolvePeer_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_sendAttachment_parameter_0$schema = object({
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
		const _deepseek_ai_dsh_awiki_awiki_sendAttachment_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_sendRegistrationOtp_parameter_0$schema = object({
			"handle": string().readonly(),
			"phone": string().readonly()
		});
		const _deepseek_ai_dsh_awiki_awiki_sendRegistrationOtp_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_sendText_parameter_0$schema = object({
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
		const _deepseek_ai_dsh_awiki_awiki_sendText_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
		const _deepseek_ai_dsh_awiki_awiki_updateDisplayName_parameter_0$schema = object({ "displayName": string().readonly() });
		const _deepseek_ai_dsh_awiki_awiki_updateDisplayName_result$schema = union([object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([
					literal("not-registered"),
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
			package: "dsh-awiki",
			descriptors: [
				{
					id: "dsh-awiki#awiki/downloadAttachment",
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
							typeSymbol: "dsh-awiki/client#AwikiDownloadAttachmentRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_downloadAttachment_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_downloadAttachment_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 437,
						"column": 9
					}
				},
				{
					id: "dsh-awiki#awiki/getConfig",
					service: "awiki",
					namespace: "awiki",
					method: "getConfig",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_getConfig_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 311,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/getHistory",
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
							typeSymbol: "dsh-awiki/client#AwikiHistoryRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_getHistory_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_getHistory_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 386,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/getIdentity",
					service: "awiki",
					namespace: "awiki",
					method: "getIdentity",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_getIdentity_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 326,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/listConversations",
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
							typeSymbol: "dsh-awiki/client#AwikiPageRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_listConversations_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_listConversations_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 376,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/markConversationRead",
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
							typeSymbol: "dsh-awiki/client#AwikiMarkConversationReadRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_markConversationRead_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_markConversationRead_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 396,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/registerIdentity",
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
							typeSymbol: "dsh-awiki/client#AwikiRegistrationRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_registerIdentity_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_registerIdentity_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 346,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/resolvePeer",
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
							typeSymbol: "dsh-awiki/client#AwikiResolvePeerRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_resolvePeer_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_resolvePeer_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 366,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/sendAttachment",
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
							typeSymbol: "dsh-awiki/client#AwikiSendAttachmentRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_sendAttachment_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_sendAttachment_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 416,
						"column": 9
					}
				},
				{
					id: "dsh-awiki#awiki/sendRegistrationOtp",
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
							typeSymbol: "dsh-awiki/client#AwikiRegistrationOtpRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_sendRegistrationOtp_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_sendRegistrationOtp_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 336,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/sendText",
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
							typeSymbol: "dsh-awiki/client#AwikiSendTextRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_sendText_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_sendText_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 406,
						"column": 3
					}
				},
				{
					id: "dsh-awiki#awiki/updateDisplayName",
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
							typeSymbol: "dsh-awiki/client#AwikiUpdateDisplayNameRequest",
							schema: _deepseek_ai_dsh_awiki_awiki_updateDisplayName_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "dsh-awiki/client#AwikiResult",
						schema: _deepseek_ai_dsh_awiki_awiki_updateDisplayName_result$schema
					},
					sourceLocation: {
						"file": "packages/awiki/awiki/src/index.ts",
						"line": 356,
						"column": 3
					}
				}
			]
		};
		//#endregion
		//#region lib/types/client/controller.js
		/** React-free browser controller for the deployment's one AWiki identity. */
		const INITIAL_VIEW = Object.freeze({
			status: "cold",
			identity: null,
			conversations: Object.freeze([]),
			conversationsHasMore: false,
			selectedConversationId: null,
			messages: Object.freeze([]),
			historyHasMore: false,
			pending: null,
			error: null,
			attachmentMaxBytes: 0
		});
		/** Flatten the carrier and business result once for every controller caller. */
		async function call(operation) {
			try {
				const carried = await operation();
				if (!carried.ok) return {
					ok: false,
					error: `连接 AWiki Host 失败：${carried.error.message}`
				};
				if (!carried.value.ok) return {
					ok: false,
					error: `${carried.value.error.code}：${carried.value.error.message}`
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
			/**
			* Load Host policy and identity, then start polling while the drawer remains open.
			* @returns successful readiness or one display-safe Host failure.
			*/
			async open() {
				if (this.disposed) return {
					ok: false,
					error: "AWiki 插件已卸载"
				};
				this.close();
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
				const identity = await call(() => this.remote.getIdentity());
				if (!this.current(generation)) return {
					ok: true,
					value: void 0
				};
				if (!identity.ok) return this.fail(identity.error);
				this.publish({
					...this.view,
					status: "ready",
					identity: identity.value,
					error: null,
					attachmentMaxBytes: config.value.attachmentMaxBytes
				});
				if (identity.value !== null) {
					const listed = await this.refreshConversations(generation);
					if (!listed.ok) return listed;
				}
				if (this.current(generation)) this.timer = setInterval(() => {
					this.poll(generation);
				}, this.config.pollIntervalMs);
				return {
					ok: true,
					value: void 0
				};
			}
			/** Stop polling and invalidate all in-flight drawer work. */
			close() {
				this.generation += 1;
				if (this.timer !== void 0) clearInterval(this.timer);
				this.timer = void 0;
				this.polling = false;
			}
			/**
			* Request one phone verification challenge.
			* @param request - desired Handle and verification phone number.
			* @returns challenge retry metadata or one display-safe failure.
			*/
			async sendRegistrationOtp(request) {
				return this.withPending("发送验证码", () => call(() => this.remote.sendRegistrationOtp(request)));
			}
			/**
			* Register the deployment identity and populate the initial conversation list.
			* @param request - verified Handle, phone number, and one-time code.
			* @returns the registered public identity or one display-safe failure.
			*/
			async registerIdentity(request) {
				const generation = this.generation;
				const result = await this.withPending("注册身份", () => call(() => this.remote.registerIdentity(request)));
				if (!result.ok) return result;
				if (!this.current(generation)) return result;
				this.publish({
					...this.view,
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
				const marked = await call(() => this.remote.markConversationRead({ conversationId }));
				if (!marked.ok) return this.fail(marked.error);
				if (!this.current(generation) || this.view.selectedConversationId !== conversationId) return {
					ok: true,
					value: void 0
				};
				this.publish({
					...this.view,
					conversations: this.view.conversations.map((conversation) => conversation.id === conversationId ? {
						...conversation,
						unreadCount: 0
					} : conversation),
					error: null
				});
				return {
					ok: true,
					value: void 0
				};
			}
			/**
			* Load one older history page before the currently rendered messages.
			* @returns successful pagination or one display-safe failure.
			*/
			loadOlderHistory() {
				return this.loadHistory(true);
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
				this.publish({
					...this.view,
					messages: older ? prependUnique(this.view.messages, result.value.items, (value) => value.id) : result.value.items,
					historyHasMore: result.value.hasMore && result.value.nextCursor !== void 0
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
					this.publish({
						...this.view,
						messages: appendUnique(this.view.messages, result.value.items, (value) => value.id)
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
				this.publish({
					...this.view,
					messages: appendUnique(this.view.messages, [message], (value) => value.id),
					error: null
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
		//#region \0dsh-awiki-css:/Users/howard/awiki-dsh/dsh-awiki/src/client/AwikiOverlay.module.css.mjs
		const css = ".AziYCW_trigger{z-index:2;border:1px solid var(--dsw-alias-border-l2);width:48px;height:48px;color:var(--dsw-alias-brand-primary);box-shadow:var(--dsw-shadow-lv2);cursor:grab;font:inherit;touch-action:none;user-select:none;background:#fff;border-radius:50%;place-items:center;padding:0;display:grid;position:fixed;overflow:visible}.AziYCW_trigger:hover{box-shadow:var(--dsw-shadow-lv3);background:#fff}.AziYCW_trigger:active,.AziYCW_trigger[data-dragging]{cursor:grabbing}.AziYCW_launcherIcon{object-fit:cover;pointer-events:none;border-radius:50%;width:100%;height:100%;display:block}.AziYCW_unreadBadge{border:2px solid var(--dsw-alias-bg-base);background:var(--dsw-alias-state-error-primary);color:#fff;box-sizing:border-box;pointer-events:none;border-radius:10px;place-items:center;min-width:20px;height:20px;padding:0 5px;font-size:11px;font-weight:600;line-height:16px;display:grid;position:absolute;top:-5px;right:-5px}.AziYCW_trigger:focus-visible,.AziYCW_drawer button:focus-visible,.AziYCW_drawer input:focus-visible,.AziYCW_drawer textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.AziYCW_drawer{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);z-index:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:min(720px,100vw - 80px);min-width:min(360px,100vw - 80px);height:min(720px,100vh - 16px);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv3);border-radius:16px;flex-direction:column;display:flex;position:fixed;overflow:hidden}.AziYCW_drawerHeader{border-bottom:1px solid var(--dsw-alias-border-l1);cursor:grab;touch-action:none;user-select:none;flex:none;align-items:center;gap:8px;height:58px;padding:0 14px 0 18px;display:flex}.AziYCW_drawerHeader[data-dragging]{cursor:grabbing}.AziYCW_drawerHeader>div{flex:1;align-items:center;gap:8px;display:flex}.AziYCW_drawerHeader h2{margin:0;font-size:16px;line-height:24px}.AziYCW_drawerHeader button,.AziYCW_back{cursor:pointer;width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:9px;place-items:center;padding:0;display:grid}.AziYCW_drawerHeader button:hover,.AziYCW_back:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.AziYCW_centerState,.AziYCW_registration,.AziYCW_threadEmpty{text-align:center;color:var(--dsw-alias-label-secondary);flex-direction:column;flex:1;justify-content:center;align-items:center;gap:14px;padding:32px;display:flex}.AziYCW_centerState p{overflow-wrap:anywhere;max-width:420px;margin:0}.AziYCW_registration{box-sizing:border-box;align-items:stretch;width:min(360px,100%);margin:0 auto}.AziYCW_registration h3{text-align:center;color:var(--dsw-alias-label-primary);margin:0}.AziYCW_registration>p{margin:0;font-size:13px;line-height:20px}.AziYCW_registrationIcon{background:var(--dsw-alias-interactive-bg-active);width:48px;height:48px;color:var(--dsw-alias-brand-primary);border-radius:50%;align-self:center;place-items:center;display:grid}.AziYCW_registration label{text-align:left;color:var(--dsw-alias-label-secondary);gap:6px;font-size:13px;line-height:20px;display:grid}.AziYCW_registration input,.AziYCW_fileDraft input,.AziYCW_composeRow textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:10px}.AziYCW_registration input{height:40px;padding:0 12px}.AziYCW_primary,.AziYCW_more,.AziYCW_fileDraft button{background:var(--dsw-alias-button-primary-fill);min-height:36px;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;font:inherit;border:0;border-radius:10px;padding:0 14px}.AziYCW_primary:hover,.AziYCW_fileDraft button:hover{background:var(--dsw-alias-button-primary-hover)}.AziYCW_primary:disabled,.AziYCW_fileDraft button:disabled{opacity:.5;cursor:default}.AziYCW_secondary{border:1px solid var(--dsw-alias-border-l2);min-height:36px;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;background:0 0;border-radius:10px;padding:0 14px}.AziYCW_secondary:hover{background:var(--dsw-alias-interactive-bg-hover)}.AziYCW_composeBackdrop{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 72%, transparent);place-items:center;padding:24px;display:grid;position:absolute;inset:58px 0 0}.AziYCW_composeCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:min(360px,100%);box-shadow:var(--dsw-shadow-lv3);border-radius:14px;gap:12px;padding:20px;display:grid}.AziYCW_composeCard h3{margin:0;font-size:16px;line-height:24px}.AziYCW_composeCard p{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}.AziYCW_composeCard label{color:var(--dsw-alias-label-secondary);gap:6px;font-size:13px;line-height:20px;display:grid}.AziYCW_composeCard input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:40px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:10px;padding:0 12px}.AziYCW_composeActions{justify-content:flex-end;gap:8px;display:flex}.AziYCW_linkButton{color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:0}.AziYCW_notice{color:var(--dsw-alias-state-success-primary);text-align:center}.AziYCW_chat{flex:1;grid-template-columns:240px minmax(0,1fr);min-height:0;display:grid}.AziYCW_roster{border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);flex-direction:column;min-width:0;display:flex}.AziYCW_identityCard{background:var(--dsw-alias-bg-layer-3);border-radius:12px;flex-direction:column;gap:2px;margin:14px;padding:12px;display:flex}.AziYCW_identityNameRow{align-items:center;min-width:0;min-height:24px;display:flex}.AziYCW_identityName{min-width:0;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:text;background:0 0;border:0;flex:1;padding:0;font-size:16px;font-weight:600;line-height:24px;overflow:hidden}.AziYCW_identityName:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:4px}.AziYCW_identityEdit{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;visibility:hidden;background:0 0;border:0;border-radius:6px;flex:none;place-items:center;margin-left:4px;padding:0;transition:opacity .12s;display:grid}.AziYCW_identityNameRow:hover .AziYCW_identityEdit,.AziYCW_identityNameRow:focus-within .AziYCW_identityEdit{opacity:1;visibility:visible}.AziYCW_identityEdit:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.AziYCW_identityEditor{flex:1;align-items:center;gap:4px;min-width:0;display:flex}.AziYCW_identityEditor input{border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);min-width:0;height:28px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:7px;outline:none;flex:1;padding:0 8px;font-size:13px}.AziYCW_identityEditor button{width:26px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;place-items:center;padding:0;display:grid}.AziYCW_identityEditor button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.AziYCW_identityEditor button:disabled,.AziYCW_identityName:disabled{cursor:default;opacity:.5}.AziYCW_identityEdit:disabled{cursor:default}.AziYCW_identityHandle{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}.AziYCW_identityStatus{color:var(--dsw-alias-state-success-primary);margin-top:4px;font-size:12px;line-height:18px}.AziYCW_identityError{color:var(--dsw-alias-state-error-primary);margin-top:4px;font-size:11px;line-height:16px}.AziYCW_identityCard i{background:var(--dsw-alias-state-success-primary);border-radius:50%;width:6px;height:6px;margin-right:5px;display:inline-block}.AziYCW_rosterTitle{color:var(--dsw-alias-label-tertiary);padding:4px 16px 8px;font-size:12px;line-height:18px}.AziYCW_conversationList{flex:1;min-height:0;padding:0 8px;overflow:auto}.AziYCW_conversationRow{width:100%;color:inherit;cursor:pointer;text-align:left;background:0 0;border:0;border-radius:10px;align-items:center;gap:10px;padding:9px;display:flex}.AziYCW_conversationRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.AziYCW_conversationRow[data-active]{background:var(--dsw-alias-interactive-bg-active)}.AziYCW_avatar{background:var(--dsw-alias-interactive-bg-active);width:34px;height:34px;color:var(--dsw-alias-brand-primary);border-radius:50%;flex:none;place-items:center;font-size:12px;line-height:18px;display:grid;position:relative;overflow:visible}.AziYCW_conversationUnreadBadge{border:2px solid var(--dsw-alias-bg-layer-2);background:var(--dsw-alias-state-error-primary);min-width:18px;height:18px;color:var(--dsw-alias-label-primary-inverted);box-sizing:border-box;pointer-events:none;border-radius:9px;place-items:center;padding:0 4px;font-size:10px;font-weight:600;line-height:14px;display:grid;position:absolute;top:-6px;right:-7px}.AziYCW_conversationText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.AziYCW_conversationHeader{align-items:center;gap:8px;min-width:0;display:flex}.AziYCW_conversationHeader strong{flex:1;min-width:0}.AziYCW_conversationTime{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;font-weight:400;line-height:16px}.AziYCW_conversationText strong,.AziYCW_conversationText small{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.AziYCW_conversationText strong{font-size:13px;line-height:20px}.AziYCW_conversationText small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.AziYCW_more{background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-secondary);margin:8px}.AziYCW_more:hover{background:var(--dsw-alias-interactive-bg-hover)}.AziYCW_thread{flex-direction:column;min-width:0;min-height:0;display:flex}.AziYCW_threadHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:8px;height:56px;padding:0 14px;display:flex}.AziYCW_threadHeader>div{flex-direction:column;display:flex}.AziYCW_threadHeader small{color:var(--dsw-alias-label-tertiary)}.AziYCW_back{display:none}.AziYCW_history{flex-direction:column;flex:1;gap:12px;min-height:0;padding:16px;display:flex;overflow:auto}.AziYCW_message{align-self:flex-start;max-width:min(78%,420px)}.AziYCW_message[data-outgoing]{align-self:flex-end}.AziYCW_messageMeta{color:var(--dsw-alias-label-tertiary);justify-content:space-between;gap:10px;margin-bottom:3px;font-size:11px;line-height:16px;display:flex}.AziYCW_message p,.AziYCW_attachment{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;border-radius:12px;margin:0;padding:9px 11px;line-height:20px}.AziYCW_message[data-outgoing] p,.AziYCW_message[data-outgoing] .AziYCW_attachment{background:var(--dsw-alias-interactive-bg-active)}.AziYCW_attachment{cursor:pointer;font:inherit;text-align:left;align-items:center;gap:12px;display:flex}.AziYCW_attachment span{flex-direction:column;min-width:0;display:flex}.AziYCW_attachment strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.AziYCW_attachment small{color:var(--dsw-alias-label-tertiary)}.AziYCW_attachment:disabled{cursor:default}.AziYCW_imageAttachment{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:280px;max-width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;text-align:left;border-radius:12px;margin:0;padding:0;display:block;overflow:hidden}.AziYCW_imageAttachment img{background:var(--dsw-alias-bg-layer-1);object-fit:contain;width:100%;max-height:280px;display:block}.AziYCW_imageAttachment span{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:0 10px;padding:7px 9px;display:grid}.AziYCW_imageAttachment strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.AziYCW_imageAttachment small{color:var(--dsw-alias-label-tertiary);grid-column:1}.AziYCW_imageAttachment svg{grid-area:1/2/span 2}.AziYCW_message .AziYCW_caption{color:var(--dsw-alias-label-secondary);background:0 0;margin-top:4px;padding:4px 8px;font-size:12px}.AziYCW_inlineError{color:var(--dsw-alias-state-error-primary);margin-top:4px;display:block}.AziYCW_empty{color:var(--dsw-alias-label-tertiary);text-align:center;margin:auto;padding:20px}.AziYCW_composer{border-top:1px solid var(--dsw-alias-border-l1);flex:none;gap:8px;padding:10px 14px 14px;display:grid}.AziYCW_filePicker{border:1px solid var(--dsw-alias-border-l2);width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:50%;flex:none;place-items:center;padding:0;display:grid}.AziYCW_filePicker:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.AziYCW_filePicker:disabled{opacity:.45;cursor:default}.AziYCW_fileInput{display:none}.AziYCW_composeInput{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;gap:6px;min-width:0;padding:9px 10px 8px;display:grid}.AziYCW_composeInput:focus-within{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.AziYCW_composeInput textarea{resize:none;background:0 0;border:0;border-radius:0;outline:0;min-width:0;min-height:42px;padding:0}.AziYCW_composeInput textarea:focus-visible{outline:0}.AziYCW_composeActions{justify-content:space-between;align-items:center;min-height:32px;display:flex}.AziYCW_filePreview{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;align-items:center;gap:8px;width:min(240px,100% - 8px);min-height:36px;padding:5px 28px 5px 8px;display:flex;position:relative}.AziYCW_filePreview[data-image]{width:72px;height:72px;min-height:0;padding:0}.AziYCW_filePreview img{object-fit:cover;border-radius:9px;width:72px;height:72px;display:block}.AziYCW_filePreviewIcon{color:var(--dsw-alias-label-secondary);flex:none;place-items:center;display:grid}.AziYCW_filePreviewName{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}.AziYCW_removeFile{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-floating-fill);width:22px;height:22px;color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1);cursor:pointer;border-radius:50%;place-items:center;padding:0;display:grid;position:absolute;top:-7px;right:-7px}.AziYCW_removeFile:hover{background:var(--dsw-alias-button-floating-hover)}.AziYCW_send{background:var(--dsw-alias-button-primary-fill);width:32px;height:32px;color:var(--dsw-alias-label-primary-inverted);cursor:pointer;border:0;border-radius:50%;flex:none;place-items:center;padding:0;display:grid}.AziYCW_send:disabled{opacity:.45;cursor:default}.AziYCW_error{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;flex:none;padding:8px 14px;font-size:12px;line-height:18px}.AziYCW_pending{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);box-shadow:var(--dsw-shadow-lv2);border-radius:9px;padding:7px 10px;font-size:12px;line-height:18px;position:absolute;bottom:14px;right:14px}@media (width<=620px){.AziYCW_trigger span{display:none}.AziYCW_trigger{justify-content:center;width:36px;padding:0}.AziYCW_drawer{width:calc(100vw - 56px);min-width:0}.AziYCW_chat{grid-template-columns:1fr}.AziYCW_thread{display:none}.AziYCW_thread[data-visible]{display:flex}.AziYCW_roster[data-hidden]{display:none}.AziYCW_back{display:grid}}@media (prefers-reduced-motion:reduce){.AziYCW_drawer{scroll-behavior:auto}}";
		const tagId = "dsh-awiki/AwikiOverlay.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-awiki";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var AwikiOverlay_module_css_default = {
			"filePreviewIcon": "AziYCW_filePreviewIcon",
			"conversationList": "AziYCW_conversationList",
			"fileDraft": "AziYCW_fileDraft",
			"rosterTitle": "AziYCW_rosterTitle",
			"composeActions": "AziYCW_composeActions",
			"registrationIcon": "AziYCW_registrationIcon",
			"drawerHeader": "AziYCW_drawerHeader",
			"identityEdit": "AziYCW_identityEdit",
			"linkButton": "AziYCW_linkButton",
			"fileInput": "AziYCW_fileInput",
			"filePreviewName": "AziYCW_filePreviewName",
			"conversationRow": "AziYCW_conversationRow",
			"removeFile": "AziYCW_removeFile",
			"conversationHeader": "AziYCW_conversationHeader",
			"attachment": "AziYCW_attachment",
			"threadEmpty": "AziYCW_threadEmpty",
			"notice": "AziYCW_notice",
			"trigger": "AziYCW_trigger",
			"conversationTime": "AziYCW_conversationTime",
			"imageAttachment": "AziYCW_imageAttachment",
			"drawer": "AziYCW_drawer",
			"roster": "AziYCW_roster",
			"identityStatus": "AziYCW_identityStatus",
			"composer": "AziYCW_composer",
			"secondary": "AziYCW_secondary",
			"primary": "AziYCW_primary",
			"chat": "AziYCW_chat",
			"history": "AziYCW_history",
			"avatar": "AziYCW_avatar",
			"identityNameRow": "AziYCW_identityNameRow",
			"identityEditor": "AziYCW_identityEditor",
			"caption": "AziYCW_caption",
			"thread": "AziYCW_thread",
			"error": "AziYCW_error",
			"conversationText": "AziYCW_conversationText",
			"send": "AziYCW_send",
			"composeInput": "AziYCW_composeInput",
			"pending": "AziYCW_pending",
			"messageMeta": "AziYCW_messageMeta",
			"threadHeader": "AziYCW_threadHeader",
			"inlineError": "AziYCW_inlineError",
			"identityName": "AziYCW_identityName",
			"back": "AziYCW_back",
			"message": "AziYCW_message",
			"launcherIcon": "AziYCW_launcherIcon",
			"filePreview": "AziYCW_filePreview",
			"unreadBadge": "AziYCW_unreadBadge",
			"composeRow": "AziYCW_composeRow",
			"identityCard": "AziYCW_identityCard",
			"registration": "AziYCW_registration",
			"empty": "AziYCW_empty",
			"centerState": "AziYCW_centerState",
			"composeCard": "AziYCW_composeCard",
			"identityHandle": "AziYCW_identityHandle",
			"composeBackdrop": "AziYCW_composeBackdrop",
			"more": "AziYCW_more",
			"identityError": "AziYCW_identityError",
			"conversationUnreadBadge": "AziYCW_conversationUnreadBadge",
			"filePicker": "AziYCW_filePicker"
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
		function Registration(props) {
			const [phone, setPhone] = (0, react.useState)("");
			const [handle, setHandle] = (0, react.useState)("");
			const [otp, setOtp] = (0, react.useState)("");
			const [otpSent, setOtpSent] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)(null);
			const requestOtp = async () => {
				const result = await props.sendRegistrationOtp({
					handle: handle.trim(),
					phone: phone.trim()
				});
				if (!result.ok) return;
				setOtpSent(true);
				setNotice(`验证码已发送；${result.value.retryAfterSeconds} 秒后可重新获取。`);
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
				className: AwikiOverlay_module_css_default.registration,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: AwikiOverlay_module_css_default.registrationIcon,
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
						placeholder: "例如 alice"
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
						className: AwikiOverlay_module_css_default.primary,
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
							className: AwikiOverlay_module_css_default.primary,
							disabled: props.pending || handle.trim() === "" || otp.trim() === "",
							onClick: () => {
								register();
							},
							children: "注册身份"
						}),
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: AwikiOverlay_module_css_default.linkButton,
							disabled: props.pending,
							onClick: () => {
								setOtpSent(false);
								setOtp("");
								setNotice(null);
							},
							children: "重新获取验证码"
						})
					] }),
					notice !== null && (0, react_jsx_runtime.jsx)("p", {
						className: AwikiOverlay_module_css_default.notice,
						role: "status",
						children: notice
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
				className: AwikiOverlay_module_css_default.identityCard,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: AwikiOverlay_module_css_default.identityNameRow,
						children: editing ? (0, react_jsx_runtime.jsxs)("form", {
							className: AwikiOverlay_module_css_default.identityEditor,
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
								className: AwikiOverlay_module_css_default.identityName,
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
								className: AwikiOverlay_module_css_default.identityEdit,
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
						className: AwikiOverlay_module_css_default.identityHandle,
						children: props.identity.handle
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: AwikiOverlay_module_css_default.identityStatus,
						children: [(0, react_jsx_runtime.jsx)("i", {}), "在线"]
					}),
					error !== null && (0, react_jsx_runtime.jsx)("small", {
						className: AwikiOverlay_module_css_default.identityError,
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
				className: AwikiOverlay_module_css_default.conversationRow,
				"data-active": props.active || void 0,
				"aria-label": unreadCount > 0 ? `${label}，${unreadCount} 条未读消息` : void 0,
				onClick: props.onSelect,
				children: [(0, react_jsx_runtime.jsxs)("span", {
					className: AwikiOverlay_module_css_default.avatar,
					children: [props.conversation.kind === "direct" ? "私" : "群", unreadCount > 0 && (0, react_jsx_runtime.jsx)("span", {
						className: AwikiOverlay_module_css_default.conversationUnreadBadge,
						"aria-hidden": "true",
						children: unreadLabel
					})]
				}), (0, react_jsx_runtime.jsxs)("span", {
					className: AwikiOverlay_module_css_default.conversationText,
					children: [(0, react_jsx_runtime.jsxs)("span", {
						className: AwikiOverlay_module_css_default.conversationHeader,
						children: [(0, react_jsx_runtime.jsx)("strong", { children: label }), props.conversation.lastMessageAt !== void 0 && (0, react_jsx_runtime.jsx)("time", {
							className: AwikiOverlay_module_css_default.conversationTime,
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
				className: AwikiOverlay_module_css_default.message,
				"data-outgoing": props.message.outgoing || void 0,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: AwikiOverlay_module_css_default.messageMeta,
						children: [(0, react_jsx_runtime.jsx)("span", { children: senderLabel(props.message, props.peerLabel) }), (0, react_jsx_runtime.jsx)("time", { children: time(props.message.sentAt) })]
					}),
					props.message.content.kind === "text" ? (0, react_jsx_runtime.jsx)("p", { children: props.message.content.text }) : preview !== null ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: AwikiOverlay_module_css_default.imageAttachment,
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
						className: AwikiOverlay_module_css_default.caption,
						children: props.message.content.caption
					})] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: AwikiOverlay_module_css_default.attachment,
						disabled: previewLoading,
						onClick: () => {
							download();
						},
						children: [(0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("strong", { children: props.message.content.attachment.fileName }), (0, react_jsx_runtime.jsx)("small", { children: previewLoading ? "正在加载图片预览…" : `${props.message.content.attachment.size} 字节` })] }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 16 })]
					}), props.message.content.caption !== void 0 && (0, react_jsx_runtime.jsx)("p", {
						className: AwikiOverlay_module_css_default.caption,
						children: props.message.content.caption
					})] }),
					error !== null && (0, react_jsx_runtime.jsx)("small", {
						className: AwikiOverlay_module_css_default.inlineError,
						children: error
					})
				]
			});
		}
		/** Render the conversation roster, history, composer, and one-file picker. */
		function Chat(props) {
			const { view } = props;
			const [text, setText] = (0, react.useState)("");
			const [file, setFile] = (0, react.useState)(null);
			const [previewUrl, setPreviewUrl] = (0, react.useState)(null);
			const [fileError, setFileError] = (0, react.useState)(null);
			const input = (0, react.useRef)(null);
			const history = (0, react.useRef)(null);
			const previousConversationId = (0, react.useRef)(null);
			const conversationAwaitingBottom = (0, react.useRef)(null);
			const pendingInitialImages = (0, react.useRef)(/* @__PURE__ */ new Set());
			const selected = view.conversations.find((value) => value.id === view.selectedConversationId);
			(0, react.useLayoutEffect)(() => {
				const conversationId = view.selectedConversationId;
				if (conversationId !== previousConversationId.current) {
					previousConversationId.current = conversationId;
					conversationAwaitingBottom.current = conversationId;
					pendingInitialImages.current.clear();
				}
				if (conversationId === null || conversationAwaitingBottom.current !== conversationId || view.messages.length === 0 || history.current === null) return;
				pendingInitialImages.current = new Set(view.messages.flatMap((message) => message.content.kind === "attachment" && message.content.attachment.mimeType.startsWith("image/") ? [message.id] : []));
				history.current.scrollTop = history.current.scrollHeight;
				if (pendingInitialImages.current.size === 0) conversationAwaitingBottom.current = null;
			}, [view.messages, view.selectedConversationId]);
			const scrollAfterInitialImage = (messageId) => {
				if (selected === void 0 || conversationAwaitingBottom.current !== selected.id) return;
				if (!pendingInitialImages.current.delete(messageId)) return;
				if (history.current !== null) history.current.scrollTop = history.current.scrollHeight;
				if (pendingInitialImages.current.size === 0) conversationAwaitingBottom.current = null;
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
				const draft = text.trim();
				if (file === null) {
					/* v8 ignore next -- the only invocation control is disabled while both text and attachment are empty. */
					if (draft === "") return;
					if ((await props.sendText(draft)).ok) setText("");
					return;
				}
				if (file.size > view.attachmentMaxBytes) {
					setFileError(`附件不能超过 ${view.attachmentMaxBytes} 字节。`);
					return;
				}
				setFileError(null);
				const bytesBase64 = await fileToBase64(file);
				if ((await props.sendAttachment({
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					bytesBase64,
					...draft === "" ? {} : { caption: draft }
				})).ok) {
					clearFile();
					setText("");
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: AwikiOverlay_module_css_default.chat,
				children: [(0, react_jsx_runtime.jsxs)("aside", {
					className: AwikiOverlay_module_css_default.roster,
					"data-hidden": selected !== void 0 || void 0,
					children: [
						(0, react_jsx_runtime.jsx)(IdentityCard, {
							identity: view.identity,
							pending: view.pending !== null,
							updateDisplayName: props.updateDisplayName
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: AwikiOverlay_module_css_default.rosterTitle,
							children: "会话"
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: AwikiOverlay_module_css_default.conversationList,
							children: [view.conversations.map((conversation) => (0, react_jsx_runtime.jsx)(ConversationRow, {
								conversation,
								active: conversation.id === view.selectedConversationId,
								onSelect: () => {
									props.selectConversation(conversation.id);
								}
							}, conversation.id)), view.conversations.length === 0 && (0, react_jsx_runtime.jsx)("p", {
								className: AwikiOverlay_module_css_default.empty,
								children: "还没有可用的私聊或群聊。"
							})]
						}),
						view.conversationsHasMore && (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: AwikiOverlay_module_css_default.more,
							onClick: () => {
								props.loadMoreConversations();
							},
							children: "加载更多会话"
						})
					]
				}), (0, react_jsx_runtime.jsx)("section", {
					className: AwikiOverlay_module_css_default.thread,
					"data-visible": selected !== void 0 || void 0,
					children: selected === void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: AwikiOverlay_module_css_default.threadEmpty,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 28 }), (0, react_jsx_runtime.jsx)("p", { children: "选择一个私聊或群聊查看消息。" })]
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsxs)("header", {
							className: AwikiOverlay_module_css_default.threadHeader,
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: AwikiOverlay_module_css_default.back,
								"aria-label": "返回会话列表",
								onClick: () => {
									props.selectConversation(null);
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
							}), (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("strong", { children: conversationLabel(selected) }), (0, react_jsx_runtime.jsx)("small", { children: selected.kind === "direct" ? "私聊" : "群聊" })] })]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							ref: history,
							className: AwikiOverlay_module_css_default.history,
							role: "log",
							"aria-label": "消息记录",
							children: [
								view.historyHasMore && (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: AwikiOverlay_module_css_default.more,
									onClick: () => {
										props.loadOlderHistory();
									},
									children: "加载更早消息"
								}),
								view.messages.map((message) => (0, react_jsx_runtime.jsx)(MessageRow, {
									message,
									peerLabel: selected.kind === "direct" ? conversationLabel(selected) : void 0,
									download: props.downloadAttachment,
									onImageLoad: scrollAfterInitialImage
								}, message.id)),
								view.messages.length === 0 && (0, react_jsx_runtime.jsx)("p", {
									className: AwikiOverlay_module_css_default.empty,
									children: "暂无消息。"
								})
							]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: AwikiOverlay_module_css_default.composer,
							children: [fileError !== null && (0, react_jsx_runtime.jsx)("small", {
								className: AwikiOverlay_module_css_default.inlineError,
								role: "alert",
								children: fileError
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: AwikiOverlay_module_css_default.composeInput,
								children: [
									file !== null && (0, react_jsx_runtime.jsxs)("div", {
										className: AwikiOverlay_module_css_default.filePreview,
										"data-image": previewUrl !== null || void 0,
										children: [
											previewUrl === null ? (0, react_jsx_runtime.jsx)("span", {
												className: AwikiOverlay_module_css_default.filePreviewIcon,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {})
											}) : (0, react_jsx_runtime.jsx)("img", {
												src: previewUrl,
												alt: file.name
											}),
											previewUrl === null && (0, react_jsx_runtime.jsx)("span", {
												className: AwikiOverlay_module_css_default.filePreviewName,
												children: file.name
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: AwikiOverlay_module_css_default.removeFile,
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
										placeholder: "输入消息",
										rows: 2
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: AwikiOverlay_module_css_default.composeActions,
										children: [
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: "添加附件",
												side: "top",
												children: (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: AwikiOverlay_module_css_default.filePicker,
													"aria-label": "添加附件",
													disabled: view.pending !== null,
													onClick: () => {
														input.current?.click();
													},
													children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {})
												})
											}),
											(0, react_jsx_runtime.jsx)("input", {
												ref: input,
												type: "file",
												className: AwikiOverlay_module_css_default.fileInput,
												"aria-label": "选择一个附件",
												onChange: (event) => {
													setFile(event.target.files?.[0] ?? null);
													setFileError(null);
												}
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: AwikiOverlay_module_css_default.send,
												"aria-label": "发送消息",
												disabled: view.pending !== null || file === null && text.trim() === "",
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
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [composeDirect, setComposeDirect] = (0, react.useState)(false);
			const [peerHandle, setPeerHandle] = (0, react.useState)("");
			const [composeError, setComposeError] = (0, react.useState)(null);
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
					if (composeDirect) {
						setComposeDirect(false);
						return;
					}
					if (menuOpen) {
						setMenuOpen(false);
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
				composeDirect,
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
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
				ref: launcherRef,
				type: "button",
				className: AwikiOverlay_module_css_default.trigger,
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
					className: AwikiOverlay_module_css_default.launcherIcon,
					src: AWIKI_ME_APP_ICON_DATA_URL,
					alt: "",
					"aria-hidden": "true",
					draggable: "false"
				}), unreadCount > 0 && (0, react_jsx_runtime.jsx)("span", {
					className: AwikiOverlay_module_css_default.unreadBadge,
					"aria-hidden": "true",
					children: unreadLabel
				})]
			}), open && (0, react_jsx_runtime.jsxs)("div", {
				className: AwikiOverlay_module_css_default.drawer,
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
						className: AwikiOverlay_module_css_default.drawerHeader,
						"data-dragging": drawerDragging || void 0,
						title: "长按拖动 AWiki",
						onPointerDown: onDrawerPointerDown,
						onPointerMove: onDrawerPointerMove,
						onPointerUp: finishDrawerDrag,
						onPointerCancel: finishDrawerDrag,
						children: [
							(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 18 }), (0, react_jsx_runtime.jsx)("h2", {
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
						className: AwikiOverlay_module_css_default.centerState,
						role: "status",
						children: "正在连接 AWiki…"
					}),
					view.status === "error" && (0, react_jsx_runtime.jsxs)("div", {
						className: AwikiOverlay_module_css_default.centerState,
						children: [(0, react_jsx_runtime.jsx)("p", { children: view.error }), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: AwikiOverlay_module_css_default.primary,
							onClick: () => {
								props.open();
							},
							children: "重试"
						})]
					}),
					view.status === "ready" && view.identity === null && (0, react_jsx_runtime.jsx)(Registration, {
						...props,
						pending: view.pending !== null
					}),
					view.status === "ready" && view.identity !== null && (0, react_jsx_runtime.jsx)(Chat, {
						...props,
						selectConversation,
						view: {
							...view,
							identity: view.identity
						}
					}),
					composeDirect && (0, react_jsx_runtime.jsx)("div", {
						className: AwikiOverlay_module_css_default.composeBackdrop,
						children: (0, react_jsx_runtime.jsxs)("form", {
							className: AwikiOverlay_module_css_default.composeCard,
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
									className: AwikiOverlay_module_css_default.inlineError,
									role: "alert",
									children: composeError
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: AwikiOverlay_module_css_default.composeActions,
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: AwikiOverlay_module_css_default.secondary,
										onClick: () => {
											setComposeDirect(false);
											setComposeError(null);
										},
										children: "取消"
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "submit",
										className: AwikiOverlay_module_css_default.primary,
										disabled: view.pending !== null || peerHandle.trim() === "",
										children: "打开会话"
									})]
								})
							]
						})
					}),
					view.error !== null && view.status !== "error" && (0, react_jsx_runtime.jsx)("div", {
						className: AwikiOverlay_module_css_default.error,
						role: "alert",
						children: view.error
					}),
					view.pending !== null && (0, react_jsx_runtime.jsxs)("div", {
						className: AwikiOverlay_module_css_default.pending,
						role: "status",
						children: [view.pending, "…"]
					})
				]
			})] });
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
		//#region lib/types/client/index.js
		/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */
		/** Required services: slot registry and the Client Remote carrier. */
		const inject = ["slots", "remote"];
		/**
		* Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
		* @param ctx - browser context carrying slots and Remote.
		* @returns disposer for the slot injection and AWiki Remote contribution.
		*/
		async function apply(ctx) {
			const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
			let disposeSlot;
			try {
				const remote = ctx.get("remote.awiki");
				if (remote === void 0) throw new Error("ui-awiki: mounted Remote namespace is unavailable");
				disposeSlot = ctx.slots.inject("shell.overlay", () => {
					const controller = new AwikiController(remote);
					const dispose = ctx.slots.register({
						name: "shell.overlay",
						id: "awiki",
						order: 20,
						store: createAwikiOverlayStore,
						inject: () => ({
							hooks: { awiki: controller },
							open: () => controller.open(),
							close: () => {
								controller.close();
							},
							sendRegistrationOtp: (request) => controller.sendRegistrationOtp(request),
							registerIdentity: (request) => controller.registerIdentity(request),
							updateDisplayName: (displayName) => controller.updateDisplayName(displayName),
							loadMoreConversations: () => controller.loadMoreConversations(),
							startDirectChat: (handle) => controller.startDirectChat(handle),
							selectConversation: (conversationId) => controller.selectConversation(conversationId),
							loadOlderHistory: () => controller.loadOlderHistory(),
							sendText: (text) => controller.sendText(text),
							sendAttachment: (file) => controller.sendAttachment(file),
							downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId)
						})
					}, AwikiOverlay);
					return () => {
						dispose();
						controller.dispose();
					};
				});
			} catch (error) {
				await disposeRemote();
				throw error;
			}
			return async () => {
				disposeSlot();
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