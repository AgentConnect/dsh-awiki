window.__ModuleLoader__.load({
	id: "@awiki/dsh-model-proxy",
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
		//#region \0dsh-awiki-model-proxy-css:RechargeComingSoonDialog.module.css.mjs
		const css$2 = "._4Od8Qa_dialog{width:min(440px,100%)}._4Od8Qa_description{color:var(--dsw-alias-label-secondary);margin:0;font-size:14px;line-height:22px}";
		const tagId$2 = "@awiki/dsh-model-proxy/RechargeComingSoonDialog.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@awiki/dsh-model-proxy";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var _dsh_awiki_model_proxy_css_RechargeComingSoonDialog_module_css_default = {
			"description": "_4Od8Qa_description",
			"dialog": "_4Od8Qa_dialog"
		};
		//#endregion
		//#region lib/types/client/RechargeComingSoonDialog.js
		/** Model Proxy release-gate notice for every recharge entry point. */
		function RechargeComingSoonDialog({ open, onClose, t }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: t("rechargeComingSoonTitle"),
				closeLabel: t("rechargeComingSoonClose"),
				className: _dsh_awiki_model_proxy_css_RechargeComingSoonDialog_module_css_default.dialog ?? "",
				footer: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					type: "button",
					onClick: onClose,
					children: t("rechargeComingSoonAcknowledge")
				}),
				children: (0, react_jsx_runtime.jsx)("p", {
					className: _dsh_awiki_model_proxy_css_RechargeComingSoonDialog_module_css_default.description,
					children: t("rechargeComingSoonDescription")
				})
			});
		}
		//#endregion
		//#region \0dsh-awiki-model-proxy-css:AwikiOnboarding.module.css.mjs
		const css$1 = ".Ly1p-q_dialog{width:min(520px,100vw - 32px)}.Ly1p-q_modalContent{max-height:min(760px,100vh - 32px);overflow:auto}.Ly1p-q_content{color:var(--dsw-alias-label-primary);flex-direction:column;gap:18px;display:flex}.Ly1p-q_description,.Ly1p-q_notice,.Ly1p-q_error{margin:0}.Ly1p-q_description,.Ly1p-q_notice,.Ly1p-q_error,.Ly1p-q_accountRow{font-size:14px;line-height:22px}.Ly1p-q_description{color:var(--dsw-alias-label-secondary)}.Ly1p-q_notice{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:10px 12px}.Ly1p-q_error{color:var(--dsw-alias-state-error-primary)}.Ly1p-q_accountRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;justify-content:space-between;align-items:center;gap:16px;padding:14px;display:flex}.Ly1p-q_actions{flex-wrap:wrap;justify-content:flex-end;gap:8px;display:flex}@media (width<=520px){.Ly1p-q_actions>button{flex:100%}}";
		const tagId$1 = "@awiki/dsh-model-proxy/AwikiOnboarding.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@awiki/dsh-model-proxy";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default = {
			"accountRow": "Ly1p-q_accountRow",
			"actions": "Ly1p-q_actions",
			"content": "Ly1p-q_content",
			"description": "Ly1p-q_description",
			"dialog": "Ly1p-q_dialog",
			"error": "Ly1p-q_error",
			"modalContent": "Ly1p-q_modalContent",
			"notice": "Ly1p-q_notice"
		};
		//#endregion
		//#region lib/types/client/AwikiOnboarding.js
		/** Model Proxy opt-in step shown before the official API-key step. */
		function AwikiOnboarding(props) {
			const { t } = props;
			const dismiss = props.dismiss ?? props.complete;
			const IdentityAccess = props.IdentityAccess;
			const identity = props.useAwikiOnboarding((value) => value);
			const availability = props.useAwikiModelAvailability((value) => value);
			const models = props.useAwikiModelProxy((value) => value);
			const [rechargeComingSoonOpen, setRechargeComingSoonOpen] = (0, react.useState)(false);
			const shouldOffer = models.capability === "available" && availability.status === "ready" && !availability.usable;
			const openAccountSettings = () => {
				dismiss();
				props.openSection("awiki-model-proxy");
			};
			const requestRecharge = () => {
				if (!props.rechargeEnabled) {
					setRechargeComingSoonOpen(true);
					return;
				}
				openAccountSettings();
			};
			const enableModels = () => {
				props.models.setEnabled(true).catch(() => void 0);
			};
			const identityAccess = (sessionStatus) => (0, react_jsx_runtime.jsx)(IdentityAccess, {
				sessionStatus,
				identity: identity.identity,
				recoveryOperationId: identity.recoveryOperationId ?? null,
				recoveryProgress: identity.recoveryProgress ?? null,
				pending: identity.pending !== null,
				autoFocusHandle: sessionStatus === "unregistered",
				inspectIdentityAccess: (request) => props.identity.inspectIdentityAccess(request),
				sendRegistrationOtp: (request) => props.identity.sendRegistrationOtp(request),
				registerIdentity: (request) => props.identity.registerIdentity(request),
				login: () => props.identity.login(),
				clearLocalIdentity: props.clearLocalIdentity,
				sendRecoveryOtp: (request) => props.identity.sendRecoveryOtp(request),
				prepareRecovery: (request) => props.identity.prepareRecovery(request),
				activateRecovery: () => props.identity.activateRecovery(),
				refreshRecoveryStatus: () => props.identity.refreshRecoveryStatus(),
				resumeRecovery: () => props.identity.resumeRecovery(),
				discardRecovery: () => props.identity.discardRecovery()
			});
			(0, react.useEffect)(() => {
				if (availability.status === "idle") props.availability.load();
			}, [availability.status, props.availability]);
			(0, react.useEffect)(() => {
				if (models.capability === "unavailable" || models.status === "unavailable" || availability.status === "unavailable" || availability.status === "ready" && availability.usable) props.complete();
			}, [
				availability.status,
				availability.usable,
				models.capability,
				models.status,
				props.complete
			]);
			(0, react.useEffect)(() => {
				if (shouldOffer && identity.status === "cold") props.identity.loadSession();
			}, [
				identity.status,
				props.identity,
				shouldOffer
			]);
			(0, react.useEffect)(() => {
				if (shouldOffer && identity.status === "ready" && identity.sessionStatus === "active") props.models.load();
			}, [
				identity.sessionStatus,
				identity.status,
				props.models,
				shouldOffer
			]);
			(0, react.useEffect)(() => {
				if (shouldOffer && models.account?.enabled === true) props.complete();
			}, [
				models.account?.enabled,
				props.complete,
				shouldOffer
			]);
			if (rechargeComingSoonOpen) return (0, react_jsx_runtime.jsx)(RechargeComingSoonDialog, {
				open: true,
				onClose: () => {
					setRechargeComingSoonOpen(false);
				},
				t
			});
			if (!shouldOffer || models.status === "unavailable" || identity.status === "cold" || identity.status === "loading" || models.account?.enabled === true) return null;
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
					className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.description,
					children: identity.error ?? t("onboardingIdentityUnavailable")
				}), (0, react_jsx_runtime.jsx)("div", {
					className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.actions,
					children: alternatives
				})]
			});
			if (identity.sessionStatus === "unregistered") return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingModelTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.description,
						children: t("onboardingRegistrationDescription")
					}),
					identityAccess("unregistered"),
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.actions,
						children: alternatives
					})
				]
			});
			if (identity.sessionStatus === "signed-out") return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingRestoreTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.description,
						children: t("onboardingRestoreDescription")
					}),
					identityAccess("signed-out"),
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.actions,
						children: alternatives
					})
				]
			});
			if (identity.sessionStatus === "recovery-required") return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingRecoveryRequiredTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.description,
						children: t("onboardingRecoveryRequiredDescription")
					}),
					identityAccess("recovery-required"),
					(0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.actions,
						children: alternatives
					})
				]
			});
			if ((models.status === "idle" || models.status === "loading") && models.account === null) return null;
			const account = models.account?.account;
			const pendingOrder = props.rechargeEnabled ? models.account?.pending_recharge_order ?? null : null;
			const accessUnavailable = account?.model_access_available === false;
			return (0, react_jsx_runtime.jsxs)(OnboardingModal, {
				title: t("onboardingEnableTitle"),
				closeLabel: t("onboardingClose"),
				onClose: dismiss,
				children: [account === void 0 ? (0, react_jsx_runtime.jsx)("p", {
					className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.error,
					role: "alert",
					children: models.error ?? t("modelAccountUnavailable")
				}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.accountRow,
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("accountBalance") }), (0, react_jsx_runtime.jsxs)("strong", { children: [
							account.balance,
							" ",
							account.currency
						] })]
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.description,
						children: account.billing_mode === "development_bypass" ? t("onboardingBypassDescription") : pendingOrder !== null ? t("onboardingPendingRechargeDescription") : account.model_access_reason === "insufficient_balance" ? t("onboardingInsufficientBalanceDescription") : t("onboardingStrictDescription")
					}),
					props.rechargeEnabled && !account.payments_available && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.notice,
						children: t("paymentsUnavailable")
					}),
					models.error !== null && (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.error,
						role: "alert",
						children: models.error
					})
				] }), (0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.actions,
					children: [pendingOrder !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						onClick: requestRecharge,
						children: t("continuePayment")
					}) : accessUnavailable ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						disabled: props.rechargeEnabled && account?.payments_available !== true,
						onClick: requestRecharge,
						children: t("goToRecharge")
					}) : account !== void 0 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						disabled: models.pending !== null || models.status === "loading",
						onClick: enableModels,
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
				className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.dialog ?? "",
				contentClassName: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.modalContent,
				children: (0, react_jsx_runtime.jsx)("div", {
					className: _dsh_awiki_model_proxy_css_AwikiOnboarding_module_css_default.content,
					children
				})
			});
		}
		//#endregion
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/can-promise.js
		var require_can_promise = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = function() {
				return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/utils.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-level.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-buffer.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/bit-matrix.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alignment-pattern.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/finder-pattern.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mask-pattern.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/error-correction-code.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/galois-field.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/polynomial.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/reed-solomon-encoder.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version-check.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/regex.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/mode.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/version.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/format-info.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/numeric-data.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/alphanumeric-data.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/byte-data.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/kanji-data.js
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
		//#region ../../node_modules/.pnpm/dijkstrajs@1.0.3/node_modules/dijkstrajs/dijkstra.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/segments.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/core/qrcode.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/utils.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/canvas.js
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
		//#region ../../node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/renderer/svg-tag.js
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
		//#region \0dsh-awiki-model-proxy-css:ModelProxySettingsSection.module.css.mjs
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
		const css = ".ARqgaq_section{width:min(100%,760px);color:var(--dsw-alias-label-primary);flex-direction:column;gap:20px;display:flex}.ARqgaq_heading{flex-direction:column;gap:6px;display:flex}.ARqgaq_title{margin:0;font-size:18px;font-weight:600;line-height:26px}.ARqgaq_intro,.ARqgaq_description,.ARqgaq_defaultValue,.ARqgaq_notice,.ARqgaq_status{margin:0;font-size:13px;line-height:20px}.ARqgaq_intro,.ARqgaq_description,.ARqgaq_defaultValue{color:var(--dsw-alias-label-tertiary)}.ARqgaq_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex-direction:column;gap:14px;padding:18px;display:flex}.ARqgaq_label{font-size:14px;font-weight:600;line-height:22px}.ARqgaq_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:42px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:9px 12px;font-size:14px;line-height:22px}.ARqgaq_input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);outline:none}.ARqgaq_input:disabled{cursor:not-allowed;opacity:.55}.ARqgaq_actions{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ARqgaq_status{min-height:20px;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-secondary))}.ARqgaq_error{color:var(--dsw-alias-state-error-primary)}.ARqgaq_notice{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:12px 14px}.ARqgaq_developmentNotice{border:1px solid var(--dsw-alias-border-l1)}.ARqgaq_accessNotice{border:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:3px;display:flex}.ARqgaq_accessNotice strong{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.ARqgaq_dangerZone{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 5%, var(--dsw-alias-bg-layer-3));border-radius:8px;flex-direction:column;align-items:flex-start;gap:14px;padding:18px;display:flex}.ARqgaq_dangerCopy{flex-direction:column;gap:6px;display:flex}.ARqgaq_dangerTitle,.ARqgaq_dangerDescription,.ARqgaq_clearWarning p,.ARqgaq_confirmLabel{margin:0}.ARqgaq_dangerTitle{color:var(--dsw-alias-state-error-primary);font-size:14px;font-weight:600;line-height:22px}.ARqgaq_dangerDescription,.ARqgaq_clearWarning,.ARqgaq_confirmLabel{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}.ARqgaq_dangerButton,.ARqgaq_clearConfirmButton{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, var(--dsw-alias-border-l2));color:var(--dsw-alias-state-error-primary)}.ARqgaq_dangerButton:hover:not(:disabled),.ARqgaq_clearConfirmButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.ARqgaq_clearDialog{width:min(480px,100%)}.ARqgaq_compactModal.ARqgaq_compactModal{max-height:calc(100vh - 48px)}.ARqgaq_compactModalContent{min-height:0;overflow-y:auto}.ARqgaq_cancelRechargeWarning{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:8px;margin:0;padding:12px 14px;font-size:13px;line-height:20px}.ARqgaq_cancelRechargeConfirm{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l2));color:var(--dsw-alias-state-error-primary)}.ARqgaq_cancelRechargeConfirm:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.ARqgaq_clearWarning{background:var(--dsw-alias-interactive-bg-hover-danger);border-radius:8px;flex-direction:column;gap:10px;padding:12px 14px;display:flex}.ARqgaq_clearWarning p:first-child{color:var(--dsw-alias-state-error-primary);font-weight:600}.ARqgaq_confirmLabel{color:var(--dsw-alias-label-primary);margin-top:18px}.ARqgaq_tabs{border-bottom:1px solid var(--dsw-alias-border-l2);gap:4px;padding-bottom:1px;display:flex;overflow-x:auto}.ARqgaq_tab{min-height:38px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;border-bottom:2px solid #0000;flex:none;padding:7px 12px;font-size:14px;line-height:22px}.ARqgaq_tab:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.ARqgaq_tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.ARqgaq_tabActive{border-bottom-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);font-weight:600}.ARqgaq_panel{flex-direction:column;gap:16px;min-width:0;display:flex;container-type:inline-size}.ARqgaq_panelHeader,.ARqgaq_rechargeRow,.ARqgaq_usageMain{justify-content:space-between;align-items:center;gap:12px;display:flex}.ARqgaq_accountSummary,.ARqgaq_usageMetrics{margin:0;display:grid}.ARqgaq_accountSummary{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;grid-template-columns:repeat(2,minmax(0,1fr))}.ARqgaq_accountSummaryDevelopment{grid-template-columns:repeat(3,minmax(0,1fr))}.ARqgaq_accountSummary>div{flex-direction:column;gap:5px;min-width:0;padding:16px;display:flex}.ARqgaq_accountSummary>div+div{border-left:1px solid var(--dsw-alias-border-l2)}.ARqgaq_accountSummary dt,.ARqgaq_accountSummary dd,.ARqgaq_usageMetrics dt,.ARqgaq_usageMetrics dd{margin:0}.ARqgaq_accountSummary dt,.ARqgaq_usageMetrics dt,.ARqgaq_usageMain span,.ARqgaq_orderStatus,.ARqgaq_qrPayment p{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.ARqgaq_accountSummary dd{overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:22px}.ARqgaq_accountSummary .ARqgaq_modelControl{overflow-wrap:normal;justify-content:space-between;align-items:center;gap:12px;display:flex}.ARqgaq_modelState{white-space:nowrap;flex:none;align-items:center;display:inline-flex}.ARqgaq_modelStateEnabled{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-primary))}.ARqgaq_modelStateDisabled{color:var(--dsw-alias-label-secondary)}.ARqgaq_modelControl>button{flex:0 auto;min-width:64px;max-width:100%}.ARqgaq_modelAction{border:1px solid var(--dsw-alias-border-l1);overflow-wrap:anywhere;text-align:center;white-space:normal;cursor:pointer;border-radius:999px;min-height:36px;padding:6px 10px;font-size:13px;font-weight:600;line-height:20px}.ARqgaq_modelActionEnable{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-layer-1)}.ARqgaq_modelActionDisable{color:var(--dsw-alias-label-primary);background:0 0}.ARqgaq_modelAction:hover:not(:disabled){filter:brightness(.94)}.ARqgaq_modelAction:focus-visible{outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);outline-offset:2px}.ARqgaq_modelAction:disabled{cursor:not-allowed;opacity:.55}.ARqgaq_modelSourceNotice{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-border-l2));background:color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, var(--dsw-alias-bg-layer-3));color:var(--dsw-alias-label-secondary);border-radius:8px;margin:0;padding:11px 14px;font-size:13px;line-height:20px}.ARqgaq_recharge{flex-direction:column;gap:8px;padding-top:2px;display:flex}.ARqgaq_paymentPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex-direction:column;gap:14px;padding:16px;display:flex}.ARqgaq_paymentHeader{justify-content:space-between;align-items:flex-start;gap:16px;display:flex}.ARqgaq_paymentHeader h3,.ARqgaq_paymentHeader p{margin:0}.ARqgaq_paymentHeader h3{font-size:14px;font-weight:600;line-height:22px}.ARqgaq_paymentHeader p{color:var(--dsw-alias-label-secondary);margin-top:3px;font-size:13px;line-height:20px}.ARqgaq_paymentStatus{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:3px 8px;font-size:12px;line-height:18px}.ARqgaq_rechargeRow .ARqgaq_input{flex:1;min-width:0}.ARqgaq_qrPayment{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex-direction:column;align-items:center;gap:8px;padding:16px;display:flex}.ARqgaq_qrPayment img{aspect-ratio:1;width:min(220px,100%);height:auto;display:block}.ARqgaq_qrPayment p,.ARqgaq_orderStatus{margin:0}.ARqgaq_usageList{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;display:flex}.ARqgaq_usageRow{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;min-width:0;padding:14px 0;display:flex}.ARqgaq_usageMain strong{overflow-wrap:anywhere;min-width:0;font-size:14px;line-height:22px}.ARqgaq_usageMain span{flex:none}.ARqgaq_usageMetrics{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ARqgaq_usageMetrics>div{min-width:0}.ARqgaq_usageMetrics dd{overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin-top:2px;font-size:13px;line-height:20px}@container (width<=480px){.ARqgaq_accountSummary{grid-template-columns:1fr}.ARqgaq_accountSummary>div+div{border-top:1px solid var(--dsw-alias-border-l2);border-left:0}}@media (width<=640px){.ARqgaq_card{padding:16px}.ARqgaq_actions>button{flex:1}.ARqgaq_dangerButton{width:100%}.ARqgaq_accountSummary{grid-template-columns:1fr}.ARqgaq_accountSummary>div+div{border-top:1px solid var(--dsw-alias-border-l2);border-left:0}.ARqgaq_accountSummary .ARqgaq_modelControl{flex-direction:column;align-items:stretch}.ARqgaq_modelControl>button{width:100%}.ARqgaq_panelHeader,.ARqgaq_rechargeRow,.ARqgaq_paymentHeader{flex-direction:column;align-items:stretch}.ARqgaq_panelHeader>button,.ARqgaq_rechargeRow>button{width:100%}.ARqgaq_usageMetrics{grid-template-columns:1fr 1fr}}";
		const tagId = "@awiki/dsh-model-proxy/ModelProxySettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@awiki/dsh-model-proxy";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default = {
			"accessNotice": "ARqgaq_accessNotice",
			"accountSummary": "ARqgaq_accountSummary",
			"accountSummaryDevelopment": "ARqgaq_accountSummaryDevelopment",
			"actions": "ARqgaq_actions",
			"cancelRechargeConfirm": "ARqgaq_cancelRechargeConfirm",
			"cancelRechargeWarning": "ARqgaq_cancelRechargeWarning",
			"card": "ARqgaq_card",
			"clearConfirmButton": "ARqgaq_clearConfirmButton",
			"clearDialog": "ARqgaq_clearDialog",
			"clearWarning": "ARqgaq_clearWarning",
			"compactModal": "ARqgaq_compactModal",
			"compactModalContent": "ARqgaq_compactModalContent",
			"confirmLabel": "ARqgaq_confirmLabel",
			"dangerButton": "ARqgaq_dangerButton",
			"dangerCopy": "ARqgaq_dangerCopy",
			"dangerDescription": "ARqgaq_dangerDescription",
			"dangerTitle": "ARqgaq_dangerTitle",
			"dangerZone": "ARqgaq_dangerZone",
			"defaultValue": "ARqgaq_defaultValue",
			"description": "ARqgaq_description",
			"developmentNotice": "ARqgaq_developmentNotice",
			"error": "ARqgaq_error",
			"heading": "ARqgaq_heading",
			"input": "ARqgaq_input",
			"intro": "ARqgaq_intro",
			"label": "ARqgaq_label",
			"modelAction": "ARqgaq_modelAction",
			"modelActionDisable": "ARqgaq_modelActionDisable",
			"modelActionEnable": "ARqgaq_modelActionEnable",
			"modelControl": "ARqgaq_modelControl",
			"modelSourceNotice": "ARqgaq_modelSourceNotice",
			"modelState": "ARqgaq_modelState",
			"modelStateDisabled": "ARqgaq_modelStateDisabled",
			"modelStateEnabled": "ARqgaq_modelStateEnabled",
			"notice": "ARqgaq_notice",
			"orderStatus": "ARqgaq_orderStatus",
			"panel": "ARqgaq_panel",
			"panelHeader": "ARqgaq_panelHeader",
			"paymentHeader": "ARqgaq_paymentHeader",
			"paymentPanel": "ARqgaq_paymentPanel",
			"paymentStatus": "ARqgaq_paymentStatus",
			"qrPayment": "ARqgaq_qrPayment",
			"recharge": "ARqgaq_recharge",
			"rechargeRow": "ARqgaq_rechargeRow",
			"section": "ARqgaq_section",
			"status": "ARqgaq_status",
			"tab": "ARqgaq_tab",
			"tabActive": "ARqgaq_tabActive",
			"tabs": "ARqgaq_tabs",
			"title": "ARqgaq_title",
			"usageList": "ARqgaq_usageList",
			"usageMain": "ARqgaq_usageMain",
			"usageMetrics": "ARqgaq_usageMetrics",
			"usageRow": "ARqgaq_usageRow"
		};
		//#endregion
		//#region lib/types/client/ModelProxySettingsSection.js
		/** Model Proxy account, recharge, and usage settings contributed to DSH settings. */
		/** Render Model Proxy account, recharge, model state, and usage controls. */
		function ModelProxySettingsSection(props) {
			const { t, useAwikiModelProxy, useAwikiSession } = props;
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
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.heading,
						children: [(0, react_jsx_runtime.jsx)("h2", {
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.title,
							children: t("nav")
						}), (0, react_jsx_runtime.jsx)("p", {
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.intro,
							children: t("intro")
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.tabs,
						role: "tablist",
						"aria-label": t("nav"),
						children: [(0, react_jsx_runtime.jsx)(TabButton, {
							active: tab === "account",
							onClick: () => {
								setTab("account");
							},
							children: t("tabAccount")
						}), (0, react_jsx_runtime.jsx)(TabButton, {
							active: tab === "usage",
							onClick: () => {
								setTab("usage");
							},
							children: t("tabUsage")
						})]
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
					}))
				]
			});
		}
		function IdentityRequiredPanel(props) {
			const { t, view } = props;
			const [pending, setPending] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			if (view.status === "cold" || view.status === "loading") return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.status,
				children: t("identityLoading")
			});
			if (view.status === "error") return (0, react_jsx_runtime.jsx)("p", {
				className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.error}`,
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
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice,
						children: view.sessionStatus === "recovery-required" ? t("identityRecoveryRequired") : view.sessionStatus === "signed-out" ? t("identitySignedOutRequired") : t("identityRegistrationRequired")
					}),
					view.sessionStatus === "signed-out" && (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.actions,
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
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.status} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.error}`,
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
				className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.tab} ${props.active ? _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.tabActive : ""}`,
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
			const [cancelRechargeOpen, setCancelRechargeOpen] = (0, react.useState)(false);
			const [rechargeComingSoonOpen, setRechargeComingSoonOpen] = (0, react.useState)(false);
			const [focusRechargeAmount, setFocusRechargeAmount] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(null);
			const amountInput = (0, react.useRef)(null);
			const order = props.rechargeEnabled ? view.account?.pending_recharge_order ?? null : null;
			const cancellingRecharge = view.pending === "close-recharge";
			const paymentBusy = refreshingPayment || view.pending !== null;
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
			(0, react.useEffect)(() => {
				if (order !== null) return;
				setCancelRechargeOpen(false);
				if (!focusRechargeAmount) return;
				amountInput.current?.focus();
				amountInput.current?.select();
				setFocusRechargeAmount(false);
			}, [focusRechargeAmount, order]);
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
				if (!props.rechargeEnabled) {
					setMessage(null);
					setRechargeComingSoonOpen(true);
					return;
				}
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
			const closeCancelRecharge = () => {
				if (!cancellingRecharge) setCancelRechargeOpen(false);
			};
			const cancelRecharge = async () => {
				if (order === null || cancellingRecharge) return;
				const amountCents = order.amount_cents;
				setMessage(null);
				try {
					const outcome = await props.models.closeRecharge(order.out_trade_no);
					setCancelRechargeOpen(false);
					if (outcome === "paid") {
						setMessage({
							kind: "saved",
							text: t("rechargePaid")
						});
						return;
					}
					setAmount((amountCents / 100).toFixed(2));
					setFocusRechargeAmount(true);
					setMessage({
						kind: "saved",
						text: t("rechargeCancelled")
					});
				} catch {
					setMessage({
						kind: "error",
						text: t("rechargeCancelFailed")
					});
				}
			};
			if ((view.status === "idle" || view.status === "loading") && account === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.status,
				children: t("modelAccountLoading")
			});
			if (view.status === "unavailable" || account === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.error}`,
				role: "alert",
				children: view.error ?? t("modelAccountUnavailable")
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsxs)("dl", {
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.accountSummary} ${account.billing_mode === "development_bypass" ? _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.accountSummaryDevelopment : ""}`,
						children: [
							(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("accountBalance") }), (0, react_jsx_runtime.jsxs)("dd", { children: [
								account.balance,
								" ",
								account.currency
							] })] }),
							(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("modelStatus") }), (0, react_jsx_runtime.jsxs)("dd", {
								className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelControl,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelState} ${view.account?.enabled ? _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelStateEnabled : _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelStateDisabled}`,
									children: view.account?.enabled ? t("statusEnabled") : t("statusDisabled")
								}), account.model_access_available && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "button",
									className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelAction} ${view.account?.enabled ? _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelActionDisable : _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelActionEnable}`,
									...view.account?.enabled ? { variant: "outline" } : {},
									disabled: view.pending !== null || view.status === "loading",
									onClick: () => {
										setEnabled(view.account?.enabled !== true);
									},
									children: view.pending === "enable" ? t("enablingModels") : view.pending === "disable" ? t("disablingModels") : view.account?.enabled ? t("disableModels") : t("enableModels")
								})]
							})] }),
							account.billing_mode === "development_bypass" && (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("billingMode") }), (0, react_jsx_runtime.jsx)("dd", { children: t("billingBypass") })] })
						]
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.modelSourceNotice,
						children: t("modelSourceNotice")
					}),
					account.billing_mode === "development_bypass" && (0, react_jsx_runtime.jsx)("p", {
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.developmentNotice}`,
						children: t("billingBypassNotice")
					}),
					!account.model_access_available && (0, react_jsx_runtime.jsxs)("div", {
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.accessNotice}`,
						role: "status",
						children: [(0, react_jsx_runtime.jsx)("strong", { children: account.model_access_reason === "insufficient_balance" ? t("insufficientBalanceTitle") : t("modelAccessUnavailableTitle") }), (0, react_jsx_runtime.jsx)("span", { children: account.model_access_reason === "insufficient_balance" ? t("insufficientBalanceDescription") : t("modelAccessUnavailable") })]
					}),
					order !== null ? (0, react_jsx_runtime.jsxs)("section", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.paymentPanel,
						"aria-labelledby": "awiki-pending-recharge-title",
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.paymentHeader,
								children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h3", {
									id: "awiki-pending-recharge-title",
									children: t("pendingRechargeTitle")
								}), (0, react_jsx_runtime.jsx)("p", { children: t("pendingRechargeDescription", { amount: formatCents(order.amount_cents) }) })] }), (0, react_jsx_runtime.jsx)("span", {
									className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.paymentStatus,
									children: t("orderPending")
								})]
							}),
							qrDataUrl !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.qrPayment,
								children: [(0, react_jsx_runtime.jsx)("img", {
									src: qrDataUrl,
									width: "220",
									height: "220",
									alt: t("paymentQrAlt")
								}), (0, react_jsx_runtime.jsx)("p", { children: t("paymentQrHint") })]
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.actions,
								children: [
									order.payment_action?.type === "redirect_url" && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										type: "button",
										disabled: paymentBusy,
										onClick: continuePayment,
										children: t("continuePayment")
									}),
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										type: "button",
										...order.payment_action?.type === "redirect_url" ? { variant: "outline" } : {},
										disabled: paymentBusy,
										onClick: () => {
											refreshPayment();
										},
										children: refreshingPayment ? t("refreshingPaymentStatus") : t("refreshPaymentStatus")
									}),
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										type: "button",
										variant: "outline",
										disabled: paymentBusy,
										onClick: () => {
											setMessage(null);
											setCancelRechargeOpen(true);
										},
										children: t("changeRechargeAmount")
									})
								]
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.orderStatus,
								children: t("pendingRechargeLimit")
							})
						]
					}) : props.rechargeEnabled && !account.payments_available ? (0, react_jsx_runtime.jsx)("p", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice,
						children: t("paymentsUnavailable")
					}) : (0, react_jsx_runtime.jsxs)("form", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.recharge,
						onSubmit: (event) => {
							createRecharge(event);
						},
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.label,
							htmlFor: "awiki-recharge-amount",
							children: t("rechargeAmount")
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.rechargeRow,
							children: [(0, react_jsx_runtime.jsx)("input", {
								id: "awiki-recharge-amount",
								ref: amountInput,
								className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.input,
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
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.status} ${message?.kind === "error" ? _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.error : ""}`,
						role: message?.kind === "error" ? "alert" : "status",
						children: message?.text ?? view.error ?? ""
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: cancelRechargeOpen && order !== null,
						onClose: closeCancelRecharge,
						title: t("cancelRechargeDialogTitle"),
						closeLabel: t("cancel"),
						description: t("cancelRechargeDialogDescription", { amount: formatCents(order?.amount_cents ?? 0) }),
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.clearDialog ?? ""} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.compactModal ?? ""}`,
						contentClassName: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.compactModalContent ?? "",
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							disabled: cancellingRecharge,
							onClick: closeCancelRecharge,
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.cancelRechargeConfirm,
							disabled: cancellingRecharge,
							onClick: () => {
								cancelRecharge();
							},
							children: cancellingRecharge ? t("cancellingRecharge") : t("confirmCancelRecharge")
						})] }),
						children: (0, react_jsx_runtime.jsx)("p", {
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.cancelRechargeWarning,
							children: t("cancelRechargeWarning")
						})
					}),
					(0, react_jsx_runtime.jsx)(RechargeComingSoonDialog, {
						open: rechargeComingSoonOpen,
						onClose: () => {
							setRechargeComingSoonOpen(false);
						},
						t
					})
				]
			});
		}
		function UsagePanel(props) {
			const { t, view } = props;
			if (view.status === "idle" || view.status === "loading" || view.usageLoading) return (0, react_jsx_runtime.jsx)("p", {
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.status,
				children: t("usageLoading")
			});
			if (view.status === "unavailable") return (0, react_jsx_runtime.jsx)("p", {
				className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.error}`,
				role: "alert",
				children: view.error ?? t("modelAccountUnavailable")
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.panel,
				role: "tabpanel",
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.panelHeader,
						children: [(0, react_jsx_runtime.jsx)("p", {
							className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.description,
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
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.notice,
						children: t("usageEmpty")
					}) : (0, react_jsx_runtime.jsx)("div", {
						className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.usageList,
						children: view.usage.map((item) => (0, react_jsx_runtime.jsx)(UsageRow, {
							item,
							t
						}, item.id))
					}),
					view.error !== null && (0, react_jsx_runtime.jsx)("p", {
						className: `${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.status} ${_dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.error}`,
						role: "alert",
						children: view.error
					})
				]
			});
		}
		function UsageRow({ item, t }) {
			const tokens = item.cache_hit_tokens + item.cache_miss_tokens + item.completion_tokens;
			return (0, react_jsx_runtime.jsxs)("article", {
				className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.usageRow,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.usageMain,
					children: [(0, react_jsx_runtime.jsx)("strong", { children: item.model }), (0, react_jsx_runtime.jsx)("span", { children: formatDate(item.created_at) })]
				}), (0, react_jsx_runtime.jsxs)("dl", {
					className: _dsh_awiki_model_proxy_css_ModelProxySettingsSection_module_css_default.usageMetrics,
					children: [
						(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("usageTokens") }), (0, react_jsx_runtime.jsx)("dd", { children: tokens.toLocaleString() })] }),
						(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("usageCalculated") }), (0, react_jsx_runtime.jsx)("dd", { children: item.calculated_cost_micros === null ? t("usageNoPrice") : formatMicros(item.calculated_cost_micros) })] }),
						(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: t("usageCharged") }), (0, react_jsx_runtime.jsx)("dd", { children: formatMicros(item.charged_micros) })] })
					]
				})]
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
		//#region lib/types/client/model-availability-controller.js
		/** Model Proxy projection of whether any Harness model provider can serve requests. */
		const INITIAL$1 = Object.freeze({
			status: "idle",
			usable: false,
			error: null
		});
		/**
		* Join the public provider, settings, and credential APIs into one onboarding fact.
		* Active routes without a credential reference authenticate through their provider's own path.
		*/
		var ModelAvailabilityController = class {
			connection;
			view = INITIAL$1;
			listeners = /* @__PURE__ */ new Set();
			generation = 0;
			disposed = false;
			constructor(connection) {
				this.connection = connection;
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
				if (this.disposed) return;
				const generation = ++this.generation;
				this.publish({
					...this.view,
					status: "loading",
					error: null
				});
				try {
					const [providersResponse, settingsResponse] = await Promise.all([this.connection.api.llm.providers({}), this.connection.api.settings.describe({})]);
					if (!providersResponse.result.ok) throw new Error(providersResponse.result.error.message);
					if (!settingsResponse.result.ok) throw new Error(settingsResponse.result.error.message);
					const namespaces = new Map(settingsResponse.result.value.namespaces.map((namespace) => [namespace.ns, namespace]));
					const credentialRefs = providersResponse.result.value.providers.filter((provider) => provider.active).map((provider) => credentialRef(provider, namespaces));
					let usable = credentialRefs.some((ref) => ref === void 0);
					if (!usable) {
						const refs = [...new Set(credentialRefs.filter((ref) => ref !== void 0))];
						if (refs.length > 0) {
							const credentialsResult = (await this.connection.api.credentials.describe({ refs })).result;
							if (!credentialsResult.ok) throw new Error(credentialsResult.error.message);
							const credentials = credentialsResult.value.credentials;
							usable = refs.some((ref) => credentials[ref]?.configured === true);
						}
					}
					if (generation !== this.generation || this.disposed) return;
					this.publish({
						status: "ready",
						usable,
						error: null
					});
				} catch (error) {
					if (generation !== this.generation || this.disposed) return;
					this.publish({
						status: "unavailable",
						usable: false,
						error: message$1(error)
					});
				}
			}
			refreshIfLoaded() {
				if (this.view.status === "idle") return;
				this.load();
			}
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.generation += 1;
				this.listeners.clear();
			}
			publish(view) {
				if (this.disposed) return;
				this.view = view;
				for (const listener of this.listeners) listener();
			}
		};
		function credentialRef(provider, namespaces) {
			const namespace = namespaces.get(provider.settingsNs);
			if (namespace === void 0) return void 0;
			const profile = valueAtPath(namespace.value, provider.settingsPath);
			if (!isRecord$1(profile)) return void 0;
			const value = profile.apiKeyEnv;
			return typeof value === "string" && value.length > 0 ? value : void 0;
		}
		function valueAtPath(value, path) {
			let current = value;
			for (const segment of path) {
				if (!isRecord$1(current)) return void 0;
				current = current[segment];
			}
			return current;
		}
		function isRecord$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function message$1(error) {
			return error instanceof Error && error.message !== "" ? error.message : "模型可用性暂时无法确认";
		}
		//#endregion
		//#region ../../lib/types/model-proxy-contract.js
		/** Browser-safe contracts for the loopback AWiki-hosted DeepSeek proxy channel. */
		const AWIKI_MODEL_PROXY_RPC_CHANNEL = "/awiki-model-proxy";
		const AWIKI_MODEL_PROXY_RPC_ENDPOINTS = {
			capability: "capability",
			status: "status",
			usage: "usage",
			setEnabled: "set-enabled",
			createRecharge: "create-recharge",
			rechargeStatus: "recharge-status",
			closeRecharge: "close-recharge"
		};
		function decodeModelProxyCapability(value) {
			return isRecord(value) && value.available === true && value.protocol === 1 ? {
				available: true,
				protocol: 1
			} : void 0;
		}
		function decodeModelProxyStatus(value) {
			if (!isRecord(value) || typeof value.enabled !== "boolean") return void 0;
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
			if (!isRecord(value) || typeof value.out_trade_no !== "string" || !Number.isSafeInteger(value.amount_cents) || ![
				"pending",
				"paid",
				"closed"
			].includes(String(value.status)) || typeof value.provider !== "string" || typeof value.payment_method !== "string" || typeof value.created_at !== "string") return void 0;
			if (value.payment_action !== void 0 && (!isRecord(value.payment_action) || !["redirect_url", "qr_code"].includes(String(value.payment_action.type)) || typeof value.payment_action.data !== "string")) return void 0;
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
		function decodeCloseRechargeResult(value) {
			return isRecord(value) && value.closed === true ? { closed: true } : void 0;
		}
		function decodeAccount(value) {
			if (!(isRecord(value) && typeof value.did === "string" && Number.isSafeInteger(value.balance_cents) && typeof value.balance === "string" && value.currency === "CNY" && typeof value.model_access_available === "boolean" && (value.model_access_reason === null || typeof value.model_access_reason === "string") && ["strict", "development_bypass"].includes(String(value.billing_mode)) && typeof value.payments_available === "boolean")) return void 0;
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
			if (!(isRecord(value) && Number.isSafeInteger(value.id) && typeof value.endpoint === "string" && typeof value.model === "string" && Number.isSafeInteger(value.cache_hit_tokens) && Number.isSafeInteger(value.cache_miss_tokens) && Number.isSafeInteger(value.completion_tokens) && ["strict", "development_bypass"].includes(String(value.billing_mode)) && (value.calculated_cost_micros === null || Number.isSafeInteger(value.calculated_cost_micros)) && Number.isSafeInteger(value.charged_micros) && typeof value.estimated === "boolean" && typeof value.created_at === "string")) return void 0;
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
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		//#endregion
		//#region lib/types/client/recharge-availability.js
		/** Stable internal error used when a caller bypasses the guarded UI. */
		const AWIKI_RECHARGE_DISABLED_ERROR = "awiki_recharge_disabled";
		//#endregion
		//#region lib/types/client/model-proxy-controller.js
		/** Reactive loopback client owned by Model Proxy for browser-safe account operations. */
		const INITIAL = Object.freeze({
			capability: "unknown",
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
			rechargeEnabled;
			view = INITIAL;
			listeners = /* @__PURE__ */ new Set();
			abort = new AbortController();
			sessionAbort = new AbortController();
			unsubscribeSession;
			sessionActive;
			capabilityProbe;
			disposed = false;
			generation = 0;
			constructor(connection, identity, rechargeEnabled = true) {
				this.connection = connection;
				this.identity = identity;
				this.rechargeEnabled = rechargeEnabled;
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
			async probe() {
				if (this.disposed || this.view.capability === "available") return;
				if (this.capabilityProbe !== void 0) return this.capabilityProbe;
				const pending = this.probeOnce();
				this.capabilityProbe = pending;
				try {
					await pending;
				} finally {
					if (this.capabilityProbe === pending) this.capabilityProbe = void 0;
				}
			}
			async probeOnce() {
				if (!this.connection.isLoopback) {
					this.publish({
						...this.view,
						capability: "unavailable",
						status: "unavailable",
						error: null
					});
					return;
				}
				this.publish({
					...this.view,
					capability: "checking",
					error: null
				});
				try {
					if (decodeModelProxyCapability(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability, {}, "plugin")) === void 0) throw new Error("invalid model proxy capability response");
					if (this.disposed) return;
					this.publish({
						...this.view,
						capability: "available",
						status: this.sessionActive === true ? "idle" : "identity-required",
						error: null
					});
				} catch {
					if (this.disposed) return;
					this.publish({
						...this.view,
						capability: "unavailable",
						status: "unavailable",
						account: null,
						usage: [],
						usageLoading: false,
						pending: null,
						error: null
					});
				}
			}
			async load() {
				if (this.view.capability === "unknown") await this.probe();
				if (this.view.capability !== "available") return;
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
				if (!this.rechargeEnabled) throw new Error(AWIKI_RECHARGE_DISABLED_ERROR);
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
				const generation = this.generation;
				const order = decodeRechargeOrder(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.rechargeStatus, { out_trade_no: outTradeNo }));
				if (order === void 0) throw new Error("充值状态响应格式无效");
				const previous = this.view.account?.pending_recharge_order;
				const current = order.payment_action === void 0 && previous?.out_trade_no === order.out_trade_no && previous.payment_action !== void 0 ? {
					...order,
					payment_action: previous.payment_action
				} : order;
				if (generation !== this.generation || this.disposed) return current;
				if (order.status === "paid" || order.status === "closed") await this.load();
				else if (this.view.account !== null) this.publish({
					...this.view,
					account: {
						...this.view.account,
						pending_recharge_order: current
					}
				});
				return current;
			}
			async closeRecharge(outTradeNo) {
				if (!this.active()) throw new Error("请先登录 AWiki 身份");
				if (this.disposed || this.view.pending !== null) throw new Error("已有操作正在进行");
				const generation = ++this.generation;
				this.publish({
					...this.view,
					pending: "close-recharge",
					error: null
				});
				try {
					if (decodeCloseRechargeResult(await this.call(AWIKI_MODEL_PROXY_RPC_ENDPOINTS.closeRecharge, { out_trade_no: outTradeNo })) === void 0) throw new Error("取消充值响应格式无效");
					if (generation === this.generation && !this.disposed) {
						this.generation += 1;
						this.publish({
							...this.view,
							account: this.view.account === null ? null : {
								...this.view.account,
								pending_recharge_order: null
							},
							pending: null,
							error: null
						});
					}
					return "closed";
				} catch (error) {
					if (error instanceof Error && error.message === "recharge_order_already_paid") {
						await this.load();
						if (!this.disposed) this.publish({
							...this.view,
							pending: null
						});
						return "paid";
					}
					if (generation === this.generation && !this.disposed) this.publish({
						...this.view,
						pending: null,
						error: message(error)
					});
					throw error;
				}
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
			async call(endpoint, payload, lifetime = "session") {
				const signal = lifetime === "plugin" ? this.abort.signal : AbortSignal.any([this.abort.signal, this.sessionAbort.signal]);
				const result = await this.connection.rpc.call(AWIKI_MODEL_PROXY_RPC_CHANNEL, endpoint, payload, signal);
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
				const capability = this.view.capability;
				this.publish(active ? {
					...INITIAL,
					capability,
					status: capability === "unavailable" ? "unavailable" : "idle"
				} : {
					...INITIAL,
					capability,
					status: capability === "unavailable" ? "unavailable" : "identity-required"
				});
			}
		};
		function message(error) {
			return error instanceof Error && error.message !== "" ? error.message : "AWiki 托管模型服务暂不可用。";
		}
		//#endregion
		//#region lib/types/client/settings-locales.js
		/** Bilingual copy for the Model Proxy settings and onboarding surfaces. */
		/** Simplified Chinese dictionary. */
		const zh = {
			nav: "快速充值",
			intro: "管理 AWiki 托管模型、账户充值与用量明细。",
			tabAccount: "账户与充值",
			tabUsage: "用量明细",
			accountBalance: "账户余额",
			billingMode: "计费模式",
			billingStrict: "正式计费",
			billingBypass: "开发联调",
			billingBypassNotice: "当前为开发联调模式，模型调用不会扣减账户余额。",
			modelStatus: "AWiki 托管模型",
			modelSourceNotice: "Awiki托管的模型来自DeepSeek官方API，收费标准与DeepSeek官方保持一致",
			statusEnabled: "已启用",
			statusDisabled: "未启用",
			enableModels: "启用",
			disableModels: "停用",
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
			rechargeComingSoonTitle: "充值功能正在开通中",
			rechargeComingSoonDescription: "我们正在完善充值服务，暂时无法创建充值订单，敬请期待。",
			rechargeComingSoonAcknowledge: "知道了",
			rechargeComingSoonClose: "关闭提示",
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
			changeRechargeAmount: "取消并修改金额",
			cancelRechargeDialogTitle: "取消当前充值订单？",
			cancelRechargeDialogDescription: "当前 {amount} 订单及二维码将立即失效。关闭后可以重新选择充值金额。",
			cancelRechargeWarning: "如果你已经完成支付，请先返回并刷新支付状态。",
			confirmCancelRecharge: "确认取消",
			cancellingRecharge: "正在取消…",
			rechargeCancelled: "订单已取消，现在可以修改充值金额。",
			rechargeCancelFailed: "未能取消充值订单，当前支付入口仍然有效。",
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
			onboardingRecoveryRequiredTitle: "需要重新恢复 AWiki 身份",
			onboardingRecoveryRequiredDescription: "当前设备的旧身份凭证已失效。验证原绑定手机号并恢复后，才能继续使用 AWiki 账户和托管模型。",
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
			identityRecoveryRequired: "当前设备的 AWiki 身份凭证已失效。请在 AWiki 面板验证绑定手机号并恢复身份后，再查看账户余额、充值和用量。",
			identityRestoring: "正在恢复…",
			cancel: "取消"
		};
		/** English dictionary. */
		const en = {
			nav: "Quick Recharge",
			intro: "Manage AWiki-hosted models, account recharge, and usage.",
			tabAccount: "Account & Recharge",
			tabUsage: "Usage",
			accountBalance: "Account balance",
			billingMode: "Billing mode",
			billingStrict: "Production billing",
			billingBypass: "Development",
			billingBypassNotice: "Development bypass is active. Model calls do not reduce the account balance.",
			modelStatus: "AWiki-hosted DeepSeek",
			modelSourceNotice: "Our hosted models use the official DeepSeek API, with pricing aligned to DeepSeek’s official rates.",
			statusEnabled: "Enabled",
			statusDisabled: "Disabled",
			enableModels: "Enable",
			disableModels: "Disable",
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
			rechargeComingSoonTitle: "Recharge is coming soon",
			rechargeComingSoonDescription: "We are preparing the recharge service. New recharge orders are temporarily unavailable. Please stay tuned.",
			rechargeComingSoonAcknowledge: "Got it",
			rechargeComingSoonClose: "Close notice",
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
			changeRechargeAmount: "Cancel and change amount",
			cancelRechargeDialogTitle: "Cancel this recharge order?",
			cancelRechargeDialogDescription: "The current {amount} order and payment code will stop working. You can then choose a new amount.",
			cancelRechargeWarning: "If you have already paid, go back and refresh the payment status first.",
			confirmCancelRecharge: "Cancel order",
			cancellingRecharge: "Cancelling…",
			rechargeCancelled: "The order was cancelled. You can now change the recharge amount.",
			rechargeCancelFailed: "The recharge order could not be cancelled. Its payment action is still available.",
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
			onboardingRecoveryRequiredTitle: "Recover the AWiki identity again",
			onboardingRecoveryRequiredDescription: "The previous identity credential on this device is no longer valid. Verify the bound phone and recover it before using the AWiki account or hosted models.",
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
			identityRecoveryRequired: "The AWiki credential on this device is no longer valid. Recover the identity from the AWiki panel before viewing the account, recharge, and usage.",
			identityRestoring: "Restoring…",
			cancel: "Cancel"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Model Proxy browser plugin: Quick Recharge settings and hosted-model onboarding. */
		/** Required services supplied by the main AWiki client and DSH browser runtime. */
		const inject = [
			"slots",
			"remote",
			"connection",
			"locale",
			"awikiClient"
		];
		/** Register Model Proxy-owned Browser surfaces only when this package is installed. */
		async function apply(ctx) {
			const connection = ctx.get("connection");
			if (connection === void 0) throw new Error("ui-awiki-model-proxy: Connection service is unavailable");
			const awikiClient = ctx.get("awikiClient");
			if (awikiClient === void 0) throw new Error("ui-awiki-model-proxy: AWiki client bridge is unavailable");
			const identity = awikiClient.identity;
			const availability = new ModelAvailabilityController(connection);
			const models = new AwikiModelProxyController(connection, identity, true);
			let disposeSettings;
			let disposeOnboarding;
			try {
				await models.probe();
				ctx.effect(() => {
					const disposeZh = ctx.locale.register("settings.awiki-model-proxy", "zh", zh);
					const disposeEn = ctx.locale.register("settings.awiki-model-proxy", "en", en);
					return () => {
						disposeEn();
						disposeZh();
					};
				}, "ui-awiki-model-proxy: settings dictionaries");
				ctx.effect(() => {
					const refresh = () => {
						availability.refreshIfLoaded();
					};
					const disposers = [
						ctx.remote.$on("settings/document-updated", refresh),
						ctx.remote.$on("credentials/updated", refresh),
						ctx.remote.$on("llm/adapters-updated", refresh),
						ctx.on("connection/reset", refresh)
					];
					return () => {
						for (const dispose of disposers) dispose();
					};
				}, "ui-awiki-model-proxy: model availability invalidations");
				disposeSettings = ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "awiki-model-proxy",
					order: 31,
					label: () => ctx.locale.bind("settings.awiki-model-proxy")("nav"),
					locale: "settings.awiki-model-proxy",
					inject: () => ({
						hooks: {
							awikiModelProxy: models,
							awikiSession: identity
						},
						identity,
						models,
						rechargeEnabled: true
					})
				}, ModelProxySettingsSection));
				disposeOnboarding = ctx.slots.inject("settings.onboarding", () => ctx.slots.register({
					name: "settings.onboarding",
					id: "awiki-model-proxy",
					order: -10,
					locale: "settings.awiki-model-proxy",
					inject: () => ({
						hooks: {
							awikiOnboarding: identity,
							awikiModelAvailability: availability,
							awikiModelProxy: models
						},
						identity,
						IdentityAccess: awikiClient.IdentityAccess,
						clearLocalIdentity: awikiClient.clearLocalIdentity,
						availability,
						models,
						rechargeEnabled: true
					})
				}, AwikiOnboarding));
			} catch (error) {
				throw combineSetupAndCleanupErrors(error, cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability));
			}
			return () => {
				throwCleanupErrors(cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability));
			};
		}
		function cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability) {
			const errors = [];
			for (const dispose of [
				disposeOnboarding,
				disposeSettings,
				() => {
					models.dispose();
				},
				() => {
					availability.dispose();
				}
			]) {
				if (dispose === void 0) continue;
				try {
					dispose();
				} catch (error) {
					errors.push(error);
				}
			}
			return errors;
		}
		function combineSetupAndCleanupErrors(setupError, cleanupErrors) {
			if (cleanupErrors.length === 0) return setupError;
			return new AggregateError([setupError, ...cleanupErrors], "ui-awiki-model-proxy setup failed and cleanup also failed", { cause: setupError });
		}
		function throwCleanupErrors(errors) {
			if (errors.length === 0) return;
			if (errors.length === 1) throw errors[0];
			throw new AggregateError(errors, "ui-awiki-model-proxy cleanup failed");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map