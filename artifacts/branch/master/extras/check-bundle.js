import * as worker_threads from "worker_threads";
import { EventEmitter } from "events";
import { cpus } from "os";
import * as path from "path";
import { fileURLToPath } from "url";
let __non_webpack_require__ = () => worker_threads;
const DefaultErrorSerializer = {
  deserialize(t) {
    return Object.assign(Error(t.message), {
      name: t.name,
      stack: t.stack
    });
  },
  serialize(t) {
    return {
      __error_marker: "$$error",
      message: t.message,
      name: t.name,
      stack: t.stack
    };
  }
}, isSerializedError = (t) => t && typeof t == "object" && "__error_marker" in t && t.__error_marker === "$$error", DefaultSerializer = {
  deserialize(t) {
    return isSerializedError(t) ? DefaultErrorSerializer.deserialize(t) : t;
  },
  serialize(t) {
    return t instanceof Error ? DefaultErrorSerializer.serialize(t) : t;
  }
};
let registeredSerializer = DefaultSerializer;
function deserialize(t) {
  return registeredSerializer.deserialize(t);
}
function serialize(t) {
  return registeredSerializer.serialize(t);
}
let bundleURL;
function getBundleURLCached() {
  return bundleURL || (bundleURL = getBundleURL()), bundleURL;
}
function getBundleURL() {
  try {
    throw new Error();
  } catch (t) {
    const e = ("" + t.stack).match(/(https?|file|ftp|chrome-extension|moz-extension):\/\/[^)\n]+/g);
    if (e)
      return getBaseURL(e[0]);
  }
  return "/";
}
function getBaseURL(t) {
  return ("" + t).replace(/^((?:https?|file|ftp|chrome-extension|moz-extension):\/\/.+)?\/[^/]+(?:\?.*)?$/, "$1") + "/";
}
const isAbsoluteURL = (t) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t);
function createSourceBlobURL(t) {
  const e = new Blob([t], { type: "application/javascript" });
  return URL.createObjectURL(e);
}
function selectWorkerImplementation$1() {
  if (typeof Worker > "u")
    return class {
      constructor() {
        throw Error("No web worker implementation available. You might have tried to spawn a worker within a worker in a browser that doesn't support workers in workers.");
      }
    };
  class t extends Worker {
    constructor(r, s) {
      var o, i;
      typeof r == "string" && s && s._baseURL ? r = new URL(r, s._baseURL) : typeof r == "string" && !isAbsoluteURL(r) && getBundleURLCached().match(/^file:\/\//i) && (r = new URL(r, getBundleURLCached().replace(/\/[^\/]+$/, "/")), (!((o = s?.CORSWorkaround) !== null && o !== void 0) || o) && (r = createSourceBlobURL(`importScripts(${JSON.stringify(r)});`))), typeof r == "string" && isAbsoluteURL(r) && (!((i = s?.CORSWorkaround) !== null && i !== void 0) || i) && (r = createSourceBlobURL(`importScripts(${JSON.stringify(r)});`)), super(r, s);
    }
  }
  class e extends t {
    constructor(r, s) {
      const o = window.URL.createObjectURL(r);
      super(o, s);
    }
    static fromText(r, s) {
      const o = new window.Blob([r], { type: "text/javascript" });
      return new e(o, s);
    }
  }
  return {
    blob: e,
    default: t
  };
}
let implementation$3;
function getWorkerImplementation$2() {
  return implementation$3 || (implementation$3 = selectWorkerImplementation$1()), implementation$3;
}
const BrowserImplementation = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getWorkerImplementation: getWorkerImplementation$2
}, Symbol.toStringTag, { value: "Module" })), getCallsites = {};
let tsNodeAvailable;
cpus().length;
function detectTsNode() {
  if (typeof __non_webpack_require__ == "function")
    return !1;
  if (tsNodeAvailable)
    return tsNodeAvailable;
  try {
    eval("require").resolve("ts-node"), tsNodeAvailable = !0;
  } catch (t) {
    if (t && t.code === "MODULE_NOT_FOUND")
      tsNodeAvailable = !1;
    else
      throw t;
  }
  return tsNodeAvailable;
}
function createTsNodeModule(t) {
  return `
    require("ts-node/register/transpile-only");
    require(${JSON.stringify(t)});
  `;
}
function rebaseScriptPath(t, e) {
  const n = getCallsites().find((i) => {
    const u = i.getFileName();
    return !!(u && !u.match(e) && !u.match(/[\/\\]master[\/\\]implementation/) && !u.match(/^internal\/process/));
  }), r = n ? n.getFileName() : null;
  let s = r || null;
  return s && s.startsWith("file:") && (s = fileURLToPath(s)), s ? path.join(path.dirname(s), t) : t;
}
function resolveScriptPath(scriptPath, baseURL) {
  const makeRelative = (filePath) => path.isAbsolute(filePath) ? filePath : path.join(baseURL || eval("__dirname"), filePath), workerFilePath = typeof __non_webpack_require__ == "function" ? __non_webpack_require__.resolve(makeRelative(scriptPath)) : eval("require").resolve(makeRelative(rebaseScriptPath(scriptPath, /[\/\\]worker_threads[\/\\]/)));
  return workerFilePath;
}
function initWorkerThreadsWorker() {
  const NativeWorker = typeof __non_webpack_require__ == "function" ? __non_webpack_require__("worker_threads").Worker : eval("require")("worker_threads").Worker;
  let allWorkers = [];
  class Worker extends NativeWorker {
    constructor(e, n) {
      const r = n && n.fromSource ? null : resolveScriptPath(e, (n || {})._baseURL);
      if (r)
        r.match(/\.tsx?$/i) && detectTsNode() ? super(createTsNodeModule(r), Object.assign(Object.assign({}, n), { eval: !0 })) : r.match(/\.asar[\/\\]/) ? super(r.replace(/\.asar([\/\\])/, ".asar.unpacked$1"), n) : super(r, n);
      else {
        const s = e;
        super(s, Object.assign(Object.assign({}, n), { eval: !0 }));
      }
      this.mappedEventListeners = /* @__PURE__ */ new WeakMap(), allWorkers.push(this);
    }
    addEventListener(e, n) {
      const r = (s) => {
        n({ data: s });
      };
      this.mappedEventListeners.set(n, r), this.on(e, r);
    }
    removeEventListener(e, n) {
      const r = this.mappedEventListeners.get(n) || n;
      this.off(e, r);
    }
  }
  const terminateWorkersAndMaster = () => {
    Promise.all(allWorkers.map((t) => t.terminate())).then(() => process.exit(0), () => process.exit(1)), allWorkers = [];
  };
  process.on("SIGINT", () => terminateWorkersAndMaster()), process.on("SIGTERM", () => terminateWorkersAndMaster());
  class BlobWorker extends Worker {
    constructor(e, n) {
      super(Buffer.from(e).toString("utf-8"), Object.assign(Object.assign({}, n), { fromSource: !0 }));
    }
    static fromText(e, n) {
      return new Worker(e, Object.assign(Object.assign({}, n), { fromSource: !0 }));
    }
  }
  return {
    blob: BlobWorker,
    default: Worker
  };
}
function initTinyWorker() {
  const t = require("tiny-worker");
  let e = [];
  class n extends t {
    constructor(i, u) {
      const l = u && u.fromSource ? null : process.platform === "win32" ? `file:///${resolveScriptPath(i).replace(/\\/g, "/")}` : resolveScriptPath(i);
      if (l)
        l.match(/\.tsx?$/i) && detectTsNode() ? super(new Function(createTsNodeModule(resolveScriptPath(i))), [], { esm: !0 }) : l.match(/\.asar[\/\\]/) ? super(l.replace(/\.asar([\/\\])/, ".asar.unpacked$1"), [], { esm: !0 }) : super(l, [], { esm: !0 });
      else {
        const a = i;
        super(new Function(a), [], { esm: !0 });
      }
      e.push(this), this.emitter = new EventEmitter(), this.onerror = (a) => this.emitter.emit("error", a), this.onmessage = (a) => this.emitter.emit("message", a);
    }
    addEventListener(i, u) {
      this.emitter.addListener(i, u);
    }
    removeEventListener(i, u) {
      this.emitter.removeListener(i, u);
    }
    terminate() {
      return e = e.filter((i) => i !== this), super.terminate();
    }
  }
  const r = () => {
    Promise.all(e.map((o) => o.terminate())).then(() => process.exit(0), () => process.exit(1)), e = [];
  };
  process.on("SIGINT", () => r()), process.on("SIGTERM", () => r());
  class s extends n {
    constructor(i, u) {
      super(Buffer.from(i).toString("utf-8"), Object.assign(Object.assign({}, u), { fromSource: !0 }));
    }
    static fromText(i, u) {
      return new n(i, Object.assign(Object.assign({}, u), { fromSource: !0 }));
    }
  }
  return {
    blob: s,
    default: n
  };
}
let implementation$2, isTinyWorker;
function selectWorkerImplementation() {
  try {
    return isTinyWorker = !1, initWorkerThreadsWorker();
  } catch {
    return console.debug("Node worker_threads not available. Trying to fall back to tiny-worker polyfill..."), isTinyWorker = !0, initTinyWorker();
  }
}
function getWorkerImplementation$1() {
  return implementation$2 || (implementation$2 = selectWorkerImplementation()), implementation$2;
}
const NodeImplementation = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getWorkerImplementation: getWorkerImplementation$1
}, Symbol.toStringTag, { value: "Module" })), runningInNode$1 = typeof process < "u" && process.arch !== "browser" && "pid" in process, implementation$1 = runningInNode$1 ? NodeImplementation : BrowserImplementation, getWorkerImplementation = implementation$1.getWorkerImplementation;
function getDefaultExportFromCjs(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var browser = { exports: {} }, ms, hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var t = 1e3, e = t * 60, n = e * 60, r = n * 24, s = r * 7, o = r * 365.25;
  ms = function(c, f) {
    f = f || {};
    var d = typeof c;
    if (d === "string" && c.length > 0)
      return i(c);
    if (d === "number" && isFinite(c))
      return f.long ? l(c) : u(c);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(c)
    );
  };
  function i(c) {
    if (c = String(c), !(c.length > 100)) {
      var f = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        c
      );
      if (f) {
        var d = parseFloat(f[1]), p = (f[2] || "ms").toLowerCase();
        switch (p) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return d * o;
          case "weeks":
          case "week":
          case "w":
            return d * s;
          case "days":
          case "day":
          case "d":
            return d * r;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return d * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return d * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return d * t;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return d;
          default:
            return;
        }
      }
    }
  }
  function u(c) {
    var f = Math.abs(c);
    return f >= r ? Math.round(c / r) + "d" : f >= n ? Math.round(c / n) + "h" : f >= e ? Math.round(c / e) + "m" : f >= t ? Math.round(c / t) + "s" : c + "ms";
  }
  function l(c) {
    var f = Math.abs(c);
    return f >= r ? a(c, f, r, "day") : f >= n ? a(c, f, n, "hour") : f >= e ? a(c, f, e, "minute") : f >= t ? a(c, f, t, "second") : c + " ms";
  }
  function a(c, f, d, p) {
    var g = f >= d * 1.5;
    return Math.round(c / d) + " " + p + (g ? "s" : "");
  }
  return ms;
}
var common, hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function t(e) {
    r.debug = r, r.default = r, r.coerce = a, r.disable = u, r.enable = o, r.enabled = l, r.humanize = requireMs(), r.destroy = c, Object.keys(e).forEach((f) => {
      r[f] = e[f];
    }), r.names = [], r.skips = [], r.formatters = {};
    function n(f) {
      let d = 0;
      for (let p = 0; p < f.length; p++)
        d = (d << 5) - d + f.charCodeAt(p), d |= 0;
      return r.colors[Math.abs(d) % r.colors.length];
    }
    r.selectColor = n;
    function r(f) {
      let d, p = null, g, h;
      function m(...y) {
        if (!m.enabled)
          return;
        const b = m, _ = Number(/* @__PURE__ */ new Date()), E = _ - (d || _);
        b.diff = E, b.prev = d, b.curr = _, d = _, y[0] = r.coerce(y[0]), typeof y[0] != "string" && y.unshift("%O");
        let w = 0;
        y[0] = y[0].replace(/%([a-zA-Z%])/g, (v, I) => {
          if (v === "%%")
            return "%";
          w++;
          const T = r.formatters[I];
          if (typeof T == "function") {
            const S = y[w];
            v = T.call(b, S), y.splice(w, 1), w--;
          }
          return v;
        }), r.formatArgs.call(b, y), (b.log || r.log).apply(b, y);
      }
      return m.namespace = f, m.useColors = r.useColors(), m.color = r.selectColor(f), m.extend = s, m.destroy = r.destroy, Object.defineProperty(m, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => p !== null ? p : (g !== r.namespaces && (g = r.namespaces, h = r.enabled(f)), h),
        set: (y) => {
          p = y;
        }
      }), typeof r.init == "function" && r.init(m), m;
    }
    function s(f, d) {
      const p = r(this.namespace + (typeof d > "u" ? ":" : d) + f);
      return p.log = this.log, p;
    }
    function o(f) {
      r.save(f), r.namespaces = f, r.names = [], r.skips = [];
      const d = (typeof f == "string" ? f : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const p of d)
        p[0] === "-" ? r.skips.push(p.slice(1)) : r.names.push(p);
    }
    function i(f, d) {
      let p = 0, g = 0, h = -1, m = 0;
      for (; p < f.length; )
        if (g < d.length && (d[g] === f[p] || d[g] === "*"))
          d[g] === "*" ? (h = g, m = p, g++) : (p++, g++);
        else if (h !== -1)
          g = h + 1, m++, p = m;
        else
          return !1;
      for (; g < d.length && d[g] === "*"; )
        g++;
      return g === d.length;
    }
    function u() {
      const f = [
        ...r.names,
        ...r.skips.map((d) => "-" + d)
      ].join(",");
      return r.enable(""), f;
    }
    function l(f) {
      for (const d of r.skips)
        if (i(f, d))
          return !1;
      for (const d of r.names)
        if (i(f, d))
          return !0;
      return !1;
    }
    function a(f) {
      return f instanceof Error ? f.stack || f.message : f;
    }
    function c() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return r.enable(r.load()), r;
  }
  return common = t, common;
}
var hasRequiredBrowser;
function requireBrowser() {
  return hasRequiredBrowser || (hasRequiredBrowser = 1, (function(t, e) {
    e.formatArgs = r, e.save = s, e.load = o, e.useColors = n, e.storage = i(), e.destroy = /* @__PURE__ */ (() => {
      let l = !1;
      return () => {
        l || (l = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let l;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (l = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(l[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function r(l) {
      if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + t.exports.humanize(this.diff), !this.useColors)
        return;
      const a = "color: " + this.color;
      l.splice(1, 0, a, "color: inherit");
      let c = 0, f = 0;
      l[0].replace(/%[a-zA-Z%]/g, (d) => {
        d !== "%%" && (c++, d === "%c" && (f = c));
      }), l.splice(f, 0, a);
    }
    e.log = console.debug || console.log || (() => {
    });
    function s(l) {
      try {
        l ? e.storage.setItem("debug", l) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function o() {
      let l;
      try {
        l = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !l && typeof process < "u" && "env" in process && (l = process.env.DEBUG), l;
    }
    function i() {
      try {
        return localStorage;
      } catch {
      }
    }
    t.exports = requireCommon()(e);
    const { formatters: u } = t.exports;
    u.j = function(l) {
      try {
        return JSON.stringify(l);
      } catch (a) {
        return "[UnexpectedJSONParseError]: " + a.message;
      }
    };
  })(browser, browser.exports)), browser.exports;
}
var browserExports = requireBrowser();
const DebugLogger = /* @__PURE__ */ getDefaultExportFromCjs(browserExports), hasSymbols = () => typeof Symbol == "function", hasSymbol = (t) => hasSymbols() && !!Symbol[t], getSymbol = (t) => hasSymbol(t) ? Symbol[t] : "@@" + t;
hasSymbol("asyncIterator") || (Symbol.asyncIterator = Symbol.asyncIterator || /* @__PURE__ */ Symbol.for("Symbol.asyncIterator"));
const SymbolIterator = getSymbol("iterator"), SymbolObservable = getSymbol("observable"), SymbolSpecies = getSymbol("species");
function getMethod(t, e) {
  const n = t[e];
  if (n != null) {
    if (typeof n != "function")
      throw new TypeError(n + " is not a function");
    return n;
  }
}
function getSpecies(t) {
  let e = t.constructor;
  return e !== void 0 && (e = e[SymbolSpecies], e === null && (e = void 0)), e !== void 0 ? e : Observable;
}
function isObservable(t) {
  return t instanceof Observable;
}
function hostReportError(t) {
  hostReportError.log ? hostReportError.log(t) : setTimeout(() => {
    throw t;
  }, 0);
}
function enqueue(t) {
  Promise.resolve().then(() => {
    try {
      t();
    } catch (e) {
      hostReportError(e);
    }
  });
}
function cleanupSubscription(t) {
  const e = t._cleanup;
  if (e !== void 0 && (t._cleanup = void 0, !!e))
    try {
      if (typeof e == "function")
        e();
      else {
        const n = getMethod(e, "unsubscribe");
        n && n.call(e);
      }
    } catch (n) {
      hostReportError(n);
    }
}
function closeSubscription(t) {
  t._observer = void 0, t._queue = void 0, t._state = "closed";
}
function flushSubscription(t) {
  const e = t._queue;
  if (e) {
    t._queue = void 0, t._state = "ready";
    for (const n of e)
      if (notifySubscription(t, n.type, n.value), t._state === "closed")
        break;
  }
}
function notifySubscription(t, e, n) {
  t._state = "running";
  const r = t._observer;
  try {
    const s = r ? getMethod(r, e) : void 0;
    switch (e) {
      case "next":
        s && s.call(r, n);
        break;
      case "error":
        if (closeSubscription(t), s)
          s.call(r, n);
        else
          throw n;
        break;
      case "complete":
        closeSubscription(t), s && s.call(r);
        break;
    }
  } catch (s) {
    hostReportError(s);
  }
  t._state === "closed" ? cleanupSubscription(t) : t._state === "running" && (t._state = "ready");
}
function onNotify(t, e, n) {
  if (t._state !== "closed") {
    if (t._state === "buffering") {
      t._queue = t._queue || [], t._queue.push({ type: e, value: n });
      return;
    }
    if (t._state !== "ready") {
      t._state = "buffering", t._queue = [{ type: e, value: n }], enqueue(() => flushSubscription(t));
      return;
    }
    notifySubscription(t, e, n);
  }
}
class Subscription {
  constructor(e, n) {
    this._cleanup = void 0, this._observer = e, this._queue = void 0, this._state = "initializing";
    const r = new SubscriptionObserver(this);
    try {
      this._cleanup = n.call(void 0, r);
    } catch (s) {
      r.error(s);
    }
    this._state === "initializing" && (this._state = "ready");
  }
  get closed() {
    return this._state === "closed";
  }
  unsubscribe() {
    this._state !== "closed" && (closeSubscription(this), cleanupSubscription(this));
  }
}
class SubscriptionObserver {
  constructor(e) {
    this._subscription = e;
  }
  get closed() {
    return this._subscription._state === "closed";
  }
  next(e) {
    onNotify(this._subscription, "next", e);
  }
  error(e) {
    onNotify(this._subscription, "error", e);
  }
  complete() {
    onNotify(this._subscription, "complete");
  }
}
class Observable {
  constructor(e) {
    if (!(this instanceof Observable))
      throw new TypeError("Observable cannot be called as a function");
    if (typeof e != "function")
      throw new TypeError("Observable initializer must be a function");
    this._subscriber = e;
  }
  subscribe(e, n, r) {
    return (typeof e != "object" || e === null) && (e = {
      next: e,
      error: n,
      complete: r
    }), new Subscription(e, this._subscriber);
  }
  pipe(e, ...n) {
    let r = this;
    for (const s of [e, ...n])
      r = s(r);
    return r;
  }
  tap(e, n, r) {
    const s = typeof e != "object" || e === null ? {
      next: e,
      error: n,
      complete: r
    } : e;
    return new Observable((o) => this.subscribe({
      next(i) {
        s.next && s.next(i), o.next(i);
      },
      error(i) {
        s.error && s.error(i), o.error(i);
      },
      complete() {
        s.complete && s.complete(), o.complete();
      },
      start(i) {
        s.start && s.start(i);
      }
    }));
  }
  forEach(e) {
    return new Promise((n, r) => {
      if (typeof e != "function") {
        r(new TypeError(e + " is not a function"));
        return;
      }
      function s() {
        o.unsubscribe(), n(void 0);
      }
      const o = this.subscribe({
        next(i) {
          try {
            e(i, s);
          } catch (u) {
            r(u), o.unsubscribe();
          }
        },
        error(i) {
          r(i);
        },
        complete() {
          n(void 0);
        }
      });
    });
  }
  map(e) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const n = getSpecies(this);
    return new n((r) => this.subscribe({
      next(s) {
        let o = s;
        try {
          o = e(s);
        } catch (i) {
          return r.error(i);
        }
        r.next(o);
      },
      error(s) {
        r.error(s);
      },
      complete() {
        r.complete();
      }
    }));
  }
  filter(e) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const n = getSpecies(this);
    return new n((r) => this.subscribe({
      next(s) {
        try {
          if (!e(s))
            return;
        } catch (o) {
          return r.error(o);
        }
        r.next(s);
      },
      error(s) {
        r.error(s);
      },
      complete() {
        r.complete();
      }
    }));
  }
  reduce(e, n) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const r = getSpecies(this), s = arguments.length > 1;
    let o = !1, i = n;
    return new r((u) => this.subscribe({
      next(l) {
        const a = !o;
        if (o = !0, !a || s)
          try {
            i = e(i, l);
          } catch (c) {
            return u.error(c);
          }
        else
          i = l;
      },
      error(l) {
        u.error(l);
      },
      complete() {
        if (!o && !s)
          return u.error(new TypeError("Cannot reduce an empty sequence"));
        u.next(i), u.complete();
      }
    }));
  }
  concat(...e) {
    const n = getSpecies(this);
    return new n((r) => {
      let s, o = 0;
      function i(u) {
        s = u.subscribe({
          next(l) {
            r.next(l);
          },
          error(l) {
            r.error(l);
          },
          complete() {
            o === e.length ? (s = void 0, r.complete()) : i(n.from(e[o++]));
          }
        });
      }
      return i(this), () => {
        s && (s.unsubscribe(), s = void 0);
      };
    });
  }
  flatMap(e) {
    if (typeof e != "function")
      throw new TypeError(e + " is not a function");
    const n = getSpecies(this);
    return new n((r) => {
      const s = [], o = this.subscribe({
        next(u) {
          let l;
          if (e)
            try {
              l = e(u);
            } catch (c) {
              return r.error(c);
            }
          else
            l = u;
          const a = n.from(l).subscribe({
            next(c) {
              r.next(c);
            },
            error(c) {
              r.error(c);
            },
            complete() {
              const c = s.indexOf(a);
              c >= 0 && s.splice(c, 1), i();
            }
          });
          s.push(a);
        },
        error(u) {
          r.error(u);
        },
        complete() {
          i();
        }
      });
      function i() {
        o.closed && s.length === 0 && r.complete();
      }
      return () => {
        s.forEach((u) => u.unsubscribe()), o.unsubscribe();
      };
    });
  }
  [SymbolObservable]() {
    return this;
  }
  static from(e) {
    const n = typeof this == "function" ? this : Observable;
    if (e == null)
      throw new TypeError(e + " is not an object");
    const r = getMethod(e, SymbolObservable);
    if (r) {
      const s = r.call(e);
      if (Object(s) !== s)
        throw new TypeError(s + " is not an object");
      return isObservable(s) && s.constructor === n ? s : new n((o) => s.subscribe(o));
    }
    if (hasSymbol("iterator")) {
      const s = getMethod(e, SymbolIterator);
      if (s)
        return new n((o) => {
          enqueue(() => {
            if (!o.closed) {
              for (const i of s.call(e))
                if (o.next(i), o.closed)
                  return;
              o.complete();
            }
          });
        });
    }
    if (Array.isArray(e))
      return new n((s) => {
        enqueue(() => {
          if (!s.closed) {
            for (const o of e)
              if (s.next(o), s.closed)
                return;
            s.complete();
          }
        });
      });
    throw new TypeError(e + " is not observable");
  }
  static of(...e) {
    const n = typeof this == "function" ? this : Observable;
    return new n((r) => {
      enqueue(() => {
        if (!r.closed) {
          for (const s of e)
            if (r.next(s), r.closed)
              return;
          r.complete();
        }
      });
    });
  }
  static get [SymbolSpecies]() {
    return this;
  }
}
hasSymbols() && Object.defineProperty(Observable, /* @__PURE__ */ Symbol("extensions"), {
  value: {
    symbol: SymbolObservable,
    hostReportError
  },
  configurable: !0
});
function unsubscribe(t) {
  typeof t == "function" ? t() : t && typeof t.unsubscribe == "function" && t.unsubscribe();
}
class MulticastSubject extends Observable {
  constructor() {
    super((e) => (this._observers.add(e), () => this._observers.delete(e))), this._observers = /* @__PURE__ */ new Set();
  }
  next(e) {
    for (const n of this._observers)
      n.next(e);
  }
  error(e) {
    for (const n of this._observers)
      n.error(e);
  }
  complete() {
    for (const e of this._observers)
      e.complete();
  }
}
function multicast(t) {
  const e = new MulticastSubject();
  let n, r = 0;
  return new Observable((s) => {
    n || (n = t.subscribe(e));
    const o = e.subscribe(s);
    return r++, () => {
      r--, o.unsubscribe(), r === 0 && (unsubscribe(n), n = void 0);
    };
  });
}
const $errors = /* @__PURE__ */ Symbol("thread.errors"), $events = /* @__PURE__ */ Symbol("thread.events"), $terminate = /* @__PURE__ */ Symbol("thread.terminate"), $transferable = /* @__PURE__ */ Symbol("thread.transferable"), $worker = /* @__PURE__ */ Symbol("thread.worker");
function fail$1(t) {
  throw Error(t);
}
const Thread = {
  /** Return an observable that can be used to subscribe to all errors happening in the thread. */
  errors(t) {
    return t[$errors] || fail$1("Error observable not found. Make sure to pass a thread instance as returned by the spawn() promise.");
  },
  /** Return an observable that can be used to subscribe to internal events happening in the thread. Useful for debugging. */
  events(t) {
    return t[$events] || fail$1("Events observable not found. Make sure to pass a thread instance as returned by the spawn() promise.");
  },
  /** Terminate a thread. Remember to terminate every thread when you are done using it. */
  terminate(t) {
    return t[$terminate]();
  }
}, doNothing$1 = () => {
};
function createPromiseWithResolver() {
  let t = !1, e, n = doNothing$1;
  return [new Promise((o) => {
    t ? o(e) : n = o;
  }), (o) => {
    t = !0, e = o, n(e);
  }];
}
var WorkerEventType;
(function(t) {
  t.internalError = "internalError", t.message = "message", t.termination = "termination";
})(WorkerEventType || (WorkerEventType = {}));
const doNothing = () => {
}, returnInput = (t) => t, runDeferred = (t) => Promise.resolve().then(t);
function fail(t) {
  throw t;
}
function isThenable(t) {
  return t && typeof t.then == "function";
}
class ObservablePromise extends Observable {
  constructor(e) {
    super((n) => {
      const r = this, s = Object.assign(Object.assign({}, n), {
        complete() {
          n.complete(), r.onCompletion();
        },
        error(o) {
          n.error(o), r.onError(o);
        },
        next(o) {
          n.next(o), r.onNext(o);
        }
      });
      try {
        return this.initHasRun = !0, e(s);
      } catch (o) {
        s.error(o);
      }
    }), this.initHasRun = !1, this.fulfillmentCallbacks = [], this.rejectionCallbacks = [], this.firstValueSet = !1, this.state = "pending";
  }
  onNext(e) {
    this.firstValueSet || (this.firstValue = e, this.firstValueSet = !0);
  }
  onError(e) {
    this.state = "rejected", this.rejection = e;
    for (const n of this.rejectionCallbacks)
      runDeferred(() => n(e));
  }
  onCompletion() {
    this.state = "fulfilled";
    for (const e of this.fulfillmentCallbacks)
      runDeferred(() => e(this.firstValue));
  }
  then(e, n) {
    const r = e || returnInput, s = n || fail;
    let o = !1;
    return new Promise((i, u) => {
      const l = (c) => {
        if (!o) {
          o = !0;
          try {
            i(s(c));
          } catch (f) {
            u(f);
          }
        }
      }, a = (c) => {
        try {
          i(r(c));
        } catch (f) {
          l(f);
        }
      };
      if (this.initHasRun || this.subscribe({ error: l }), this.state === "fulfilled")
        return i(r(this.firstValue));
      if (this.state === "rejected")
        return o = !0, i(s(this.rejection));
      this.fulfillmentCallbacks.push(a), this.rejectionCallbacks.push(l);
    });
  }
  catch(e) {
    return this.then(void 0, e);
  }
  finally(e) {
    const n = e || doNothing;
    return this.then((r) => (n(), r), () => n());
  }
  static from(e) {
    return isThenable(e) ? new ObservablePromise((n) => {
      const r = (o) => {
        n.next(o), n.complete();
      }, s = (o) => {
        n.error(o);
      };
      e.then(r, s);
    }) : super.from(e);
  }
}
function isTransferable(t) {
  return !(!t || typeof t != "object");
}
function isTransferDescriptor(t) {
  return t && typeof t == "object" && t[$transferable];
}
function Transfer(t, e) {
  if (!e) {
    if (!isTransferable(t))
      throw Error();
    e = [t];
  }
  return {
    [$transferable]: !0,
    send: t,
    transferables: e
  };
}
var MasterMessageType;
(function(t) {
  t.cancel = "cancel", t.run = "run";
})(MasterMessageType || (MasterMessageType = {}));
var WorkerMessageType;
(function(t) {
  t.error = "error", t.init = "init", t.result = "result", t.running = "running", t.uncaughtError = "uncaughtError";
})(WorkerMessageType || (WorkerMessageType = {}));
const debugMessages$1 = DebugLogger("threads:master:messages");
let nextJobUID = 1;
const dedupe = (t) => Array.from(new Set(t)), isJobErrorMessage = (t) => t && t.type === WorkerMessageType.error, isJobResultMessage = (t) => t && t.type === WorkerMessageType.result, isJobStartMessage = (t) => t && t.type === WorkerMessageType.running;
function createObservableForJob(t, e) {
  return new Observable((n) => {
    let r;
    const s = ((o) => {
      if (debugMessages$1("Message from worker:", o.data), !(!o.data || o.data.uid !== e)) {
        if (isJobStartMessage(o.data))
          r = o.data.resultType;
        else if (isJobResultMessage(o.data))
          r === "promise" ? (typeof o.data.payload < "u" && n.next(deserialize(o.data.payload)), n.complete(), t.removeEventListener("message", s)) : (o.data.payload && n.next(deserialize(o.data.payload)), o.data.complete && (n.complete(), t.removeEventListener("message", s)));
        else if (isJobErrorMessage(o.data)) {
          const i = deserialize(o.data.error);
          n.error(i), t.removeEventListener("message", s);
        }
      }
    });
    return t.addEventListener("message", s), () => {
      if (r === "observable" || !r) {
        const o = {
          type: MasterMessageType.cancel,
          uid: e
        };
        t.postMessage(o);
      }
      t.removeEventListener("message", s);
    };
  });
}
function prepareArguments(t) {
  if (t.length === 0)
    return {
      args: [],
      transferables: []
    };
  const e = [], n = [];
  for (const r of t)
    isTransferDescriptor(r) ? (e.push(serialize(r.send)), n.push(...r.transferables)) : e.push(serialize(r));
  return {
    args: e,
    transferables: n.length === 0 ? n : dedupe(n)
  };
}
function createProxyFunction(t, e) {
  return ((...n) => {
    const r = nextJobUID++, { args: s, transferables: o } = prepareArguments(n), i = {
      type: MasterMessageType.run,
      uid: r,
      method: e,
      args: s
    };
    debugMessages$1("Sending command to run function to worker:", i);
    try {
      t.postMessage(i, o);
    } catch (u) {
      return ObservablePromise.from(Promise.reject(u));
    }
    return ObservablePromise.from(multicast(createObservableForJob(t, r)));
  });
}
function createProxyModule(t, e) {
  const n = {};
  for (const r of e)
    n[r] = createProxyFunction(t, r);
  return n;
}
var __awaiter$2 = function(t, e, n, r) {
  function s(o) {
    return o instanceof n ? o : new n(function(i) {
      i(o);
    });
  }
  return new (n || (n = Promise))(function(o, i) {
    function u(c) {
      try {
        a(r.next(c));
      } catch (f) {
        i(f);
      }
    }
    function l(c) {
      try {
        a(r.throw(c));
      } catch (f) {
        i(f);
      }
    }
    function a(c) {
      c.done ? o(c.value) : s(c.value).then(u, l);
    }
    a((r = r.apply(t, e || [])).next());
  });
};
const debugMessages = DebugLogger("threads:master:messages"), debugSpawn = DebugLogger("threads:master:spawn"), debugThreadUtils = DebugLogger("threads:master:thread-utils"), isInitMessage = (t) => t && t.type === "init", isUncaughtErrorMessage = (t) => t && t.type === "uncaughtError", initMessageTimeout = typeof process < "u" && process.env.THREADS_WORKER_INIT_TIMEOUT ? Number.parseInt(process.env.THREADS_WORKER_INIT_TIMEOUT, 10) : 1e4;
function withTimeout(t, e, n) {
  return __awaiter$2(this, void 0, void 0, function* () {
    let r;
    const s = new Promise((i, u) => {
      r = setTimeout(() => u(Error(n)), e);
    }), o = yield Promise.race([
      t,
      s
    ]);
    return clearTimeout(r), o;
  });
}
function receiveInitMessage(t) {
  return new Promise((e, n) => {
    const r = ((s) => {
      debugMessages("Message from worker before finishing initialization:", s.data), isInitMessage(s.data) ? (t.removeEventListener("message", r), e(s.data)) : isUncaughtErrorMessage(s.data) && (t.removeEventListener("message", r), n(deserialize(s.data.error)));
    });
    t.addEventListener("message", r);
  });
}
function createEventObservable(t, e) {
  return new Observable((n) => {
    const r = ((o) => {
      const i = {
        type: WorkerEventType.message,
        data: o.data
      };
      n.next(i);
    }), s = ((o) => {
      debugThreadUtils("Unhandled promise rejection event in thread:", o);
      const i = {
        type: WorkerEventType.internalError,
        error: Error(o.reason)
      };
      n.next(i);
    });
    t.addEventListener("message", r), t.addEventListener("unhandledrejection", s), e.then(() => {
      const o = {
        type: WorkerEventType.termination
      };
      t.removeEventListener("message", r), t.removeEventListener("unhandledrejection", s), n.next(o), n.complete();
    });
  });
}
function createTerminator(t) {
  const [e, n] = createPromiseWithResolver();
  return { terminate: () => __awaiter$2(this, void 0, void 0, function* () {
    debugThreadUtils("Terminating worker"), yield t.terminate(), n();
  }), termination: e };
}
function setPrivateThreadProps(t, e, n, r) {
  const s = n.filter((o) => o.type === WorkerEventType.internalError).map((o) => o.error);
  return Object.assign(t, {
    [$errors]: s,
    [$events]: n,
    [$terminate]: r,
    [$worker]: e
  });
}
function spawn(t, e) {
  return __awaiter$2(this, void 0, void 0, function* () {
    debugSpawn("Initializing new thread");
    const n = initMessageTimeout, s = (yield withTimeout(receiveInitMessage(t), n, `Timeout: Did not receive an init message from worker after ${n}ms. Make sure the worker calls expose().`)).exposed, { termination: o, terminate: i } = createTerminator(t), u = createEventObservable(t, o);
    if (s.type === "function") {
      const l = createProxyFunction(t);
      return setPrivateThreadProps(l, t, u, i);
    } else if (s.type === "module") {
      const l = createProxyModule(t, s.methods);
      return setPrivateThreadProps(l, t, u, i);
    } else {
      const l = s.type;
      throw Error(`Worker init message states unexpected type of expose(): ${l}`);
    }
  });
}
const BlobWorker = getWorkerImplementation().blob, Worker$1 = getWorkerImplementation().default, isWorkerRuntime$2 = function t() {
  const e = typeof self < "u" && typeof Window < "u" && self instanceof Window;
  return !!(typeof self < "u" && self.postMessage && !e);
}, postMessageToMaster$2 = function t(e, n) {
  self.postMessage(e, n);
}, subscribeToMasterMessages$2 = function t(e) {
  const n = (s) => {
    e(s.data);
  }, r = () => {
    self.removeEventListener("message", n);
  };
  return self.addEventListener("message", n), r;
}, WebWorkerImplementation = {
  isWorkerRuntime: isWorkerRuntime$2,
  postMessageToMaster: postMessageToMaster$2,
  subscribeToMasterMessages: subscribeToMasterMessages$2
};
typeof self > "u" && (global.self = global);
const isWorkerRuntime$1 = function t() {
  return !!(typeof self < "u" && self.postMessage);
}, postMessageToMaster$1 = function t(e) {
  self.postMessage(e);
};
let muxingHandlerSetUp = !1;
const messageHandlers = /* @__PURE__ */ new Set(), subscribeToMasterMessages$1 = function t(e) {
  return muxingHandlerSetUp || (self.addEventListener("message", ((r) => {
    messageHandlers.forEach((s) => s(r.data));
  })), muxingHandlerSetUp = !0), messageHandlers.add(e), () => messageHandlers.delete(e);
}, TinyWorkerImplementation = {
  isWorkerRuntime: isWorkerRuntime$1,
  postMessageToMaster: postMessageToMaster$1,
  subscribeToMasterMessages: subscribeToMasterMessages$1
};
let implementation;
function selectImplementation() {
  return typeof __non_webpack_require__ == "function" ? __non_webpack_require__("worker_threads") : eval("require")("worker_threads");
}
function getImplementation() {
  return implementation || (implementation = selectImplementation()), implementation;
}
function assertMessagePort(t) {
  if (!t)
    throw Error("Invariant violation: MessagePort to parent is not available.");
  return t;
}
const isWorkerRuntime = function t() {
  return !getImplementation().isMainThread;
}, postMessageToMaster = function t(e, n) {
  assertMessagePort(getImplementation().parentPort).postMessage(e, n);
}, subscribeToMasterMessages = function t(e) {
  const n = getImplementation().parentPort;
  if (!n)
    throw Error("Invariant violation: MessagePort to parent is not available.");
  const r = (o) => {
    e(o);
  }, s = () => {
    assertMessagePort(n).off("message", r);
  };
  return assertMessagePort(n).on("message", r), s;
};
function testImplementation() {
  getImplementation();
}
const WorkerThreadsImplementation = {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages,
  testImplementation
}, runningInNode = typeof process < "u" && process.arch !== "browser" && "pid" in process;
function selectNodeImplementation() {
  try {
    return WorkerThreadsImplementation.testImplementation(), WorkerThreadsImplementation;
  } catch {
    return TinyWorkerImplementation;
  }
}
const Implementation = runningInNode ? selectNodeImplementation() : WebWorkerImplementation;
Implementation.isWorkerRuntime;
function postUncaughtErrorMessage(t) {
  try {
    const e = {
      type: WorkerMessageType.uncaughtError,
      error: serialize(t)
    };
    Implementation.postMessageToMaster(e);
  } catch (e) {
    console.error(`Not reporting uncaught error back to master thread as it occured while reporting an uncaught error already.
Latest error:`, e, `
Original error:`, t);
  }
}
typeof self < "u" && typeof self.addEventListener == "function" && Implementation.isWorkerRuntime() && (self.addEventListener("error", (t) => {
  setTimeout(() => postUncaughtErrorMessage(t.error || t), 250);
}), self.addEventListener("unhandledrejection", (t) => {
  const e = t.reason;
  e && typeof e.message == "string" && setTimeout(() => postUncaughtErrorMessage(e), 250);
}));
typeof process < "u" && typeof process.on == "function" && Implementation.isWorkerRuntime() && (process.on("uncaughtException", (t) => {
  setTimeout(() => postUncaughtErrorMessage(t), 250);
}), process.on("unhandledRejection", (t) => {
  t && typeof t.message == "string" && setTimeout(() => postUncaughtErrorMessage(t), 250);
}));
var ok$1 = function(t) {
  return new Ok$1(t);
}, err$1 = function(t) {
  return new Err$1(t);
}, Ok$1 = (
  /** @class */
  (function() {
    function t(e) {
      var n = this;
      this.value = e, this.match = function(r, s) {
        return r(n.value);
      };
    }
    return t.prototype.isOk = function() {
      return !0;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return ok$1(e(this.value));
    }, t.prototype.mapErr = function(e) {
      return ok$1(this.value);
    }, t.prototype.andThen = function(e) {
      return e(this.value);
    }, t.prototype.asyncAndThen = function(e) {
      return e(this.value);
    }, t.prototype.asyncMap = function(e) {
      return ResultAsync$1.fromPromise(e(this.value));
    }, t.prototype.unwrapOr = function(e) {
      return this.value;
    }, t.prototype._unsafeUnwrap = function() {
      return this.value;
    }, t.prototype._unsafeUnwrapErr = function() {
      throw new Error("Called `_unsafeUnwrapErr` on an Ok");
    }, t;
  })()
), Err$1 = (
  /** @class */
  (function() {
    function t(e) {
      var n = this;
      this.error = e, this.match = function(r, s) {
        return s(n.error);
      };
    }
    return t.prototype.isOk = function() {
      return !1;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return err$1(this.error);
    }, t.prototype.mapErr = function(e) {
      return err$1(e(this.error));
    }, t.prototype.andThen = function(e) {
      return err$1(this.error);
    }, t.prototype.asyncAndThen = function(e) {
      return errAsync$1(this.error);
    }, t.prototype.asyncMap = function(e) {
      return errAsync$1(this.error);
    }, t.prototype.unwrapOr = function(e) {
      return e;
    }, t.prototype._unsafeUnwrap = function() {
      throw new Error("Called `_unsafeUnwrap` on an Err");
    }, t.prototype._unsafeUnwrapErr = function() {
      return this.error;
    }, t;
  })()
);
function __awaiter$1(t, e, n, r) {
  function s(o) {
    return o instanceof n ? o : new n(function(i) {
      i(o);
    });
  }
  return new (n || (n = Promise))(function(o, i) {
    function u(c) {
      try {
        a(r.next(c));
      } catch (f) {
        i(f);
      }
    }
    function l(c) {
      try {
        a(r.throw(c));
      } catch (f) {
        i(f);
      }
    }
    function a(c) {
      c.done ? o(c.value) : s(c.value).then(u, l);
    }
    a((r = r.apply(t, [])).next());
  });
}
function __generator$1(t, e) {
  var n = { label: 0, sent: function() {
    if (o[0] & 1) throw o[1];
    return o[1];
  }, trys: [], ops: [] }, r, s, o, i;
  return i = { next: u(0), throw: u(1), return: u(2) }, typeof Symbol == "function" && (i[Symbol.iterator] = function() {
    return this;
  }), i;
  function u(a) {
    return function(c) {
      return l([a, c]);
    };
  }
  function l(a) {
    if (r) throw new TypeError("Generator is already executing.");
    for (; n; ) try {
      if (r = 1, s && (o = a[0] & 2 ? s.return : a[0] ? s.throw || ((o = s.return) && o.call(s), 0) : s.next) && !(o = o.call(s, a[1])).done) return o;
      switch (s = 0, o && (a = [a[0] & 2, o.value]), a[0]) {
        case 0:
        case 1:
          o = a;
          break;
        case 4:
          return n.label++, { value: a[1], done: !1 };
        case 5:
          n.label++, s = a[1], a = [0];
          continue;
        case 7:
          a = n.ops.pop(), n.trys.pop();
          continue;
        default:
          if (o = n.trys, !(o = o.length > 0 && o[o.length - 1]) && (a[0] === 6 || a[0] === 2)) {
            n = 0;
            continue;
          }
          if (a[0] === 3 && (!o || a[1] > o[0] && a[1] < o[3])) {
            n.label = a[1];
            break;
          }
          if (a[0] === 6 && n.label < o[1]) {
            n.label = o[1], o = a;
            break;
          }
          if (o && n.label < o[2]) {
            n.label = o[2], n.ops.push(a);
            break;
          }
          o[2] && n.ops.pop(), n.trys.pop();
          continue;
      }
      a = e.call(t, n);
    } catch (c) {
      a = [6, c], s = 0;
    } finally {
      r = o = 0;
    }
    if (a[0] & 5) throw a[1];
    return { value: a[0] ? a[1] : void 0, done: !0 };
  }
}
var logWarning = function(t) {
  if (typeof process != "object" || process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "production") {
    var e = "\x1B[33m%s\x1B[0m", n = ["[neverthrow]", t].join(" - ");
    console.warn(e, n);
  }
}, ResultAsync$1 = (
  /** @class */
  (function() {
    function t(e) {
      this._promise = e;
    }
    return t.fromPromise = function(e, n) {
      var r = e.then(function(o) {
        return new Ok$1(o);
      });
      if (n)
        r = r.catch(function(o) {
          return new Err$1(n(o));
        });
      else {
        var s = [
          "`fromPromise` called without a promise rejection handler",
          "Ensure that you are catching promise rejections yourself, or pass a second argument to `fromPromise` to convert a caught exception into an `Err` instance"
        ].join(" - ");
        logWarning(s);
      }
      return new t(r);
    }, t.prototype.map = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter$1(n, void 0, void 0, function() {
          var s;
          return __generator$1(this, function(o) {
            switch (o.label) {
              case 0:
                return r.isErr() ? [2, new Err$1(r.error)] : (s = Ok$1.bind, [4, e(r.value)]);
              case 1:
                return [2, new (s.apply(Ok$1, [void 0, o.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.mapErr = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter$1(n, void 0, void 0, function() {
          var s;
          return __generator$1(this, function(o) {
            switch (o.label) {
              case 0:
                return r.isOk() ? [2, new Ok$1(r.value)] : (s = Err$1.bind, [4, e(r.error)]);
              case 1:
                return [2, new (s.apply(Err$1, [void 0, o.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.andThen = function(e) {
      return new t(this._promise.then(function(n) {
        if (n.isErr())
          return new Err$1(n.error);
        var r = e(n.value);
        return r instanceof t ? r._promise : r;
      }));
    }, t.prototype.match = function(e, n) {
      return this._promise.then(function(r) {
        return r.match(e, n);
      });
    }, t.prototype.unwrapOr = function(e) {
      return this._promise.then(function(n) {
        return n.unwrapOr(e);
      });
    }, t.prototype.then = function(e) {
      return this._promise.then(e);
    }, t;
  })()
), errAsync$1 = function(t) {
  return new ResultAsync$1(Promise.resolve(new Err$1(t)));
}, __defProp = Object.defineProperty, __getOwnPropSymbols = Object.getOwnPropertySymbols, __hasOwnProp = Object.prototype.hasOwnProperty, __propIsEnum = Object.prototype.propertyIsEnumerable, __defNormalProp = (t, e, n) => e in t ? __defProp(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n, __spreadValues = (t, e) => {
  for (var n in e || (e = {}))
    __hasOwnProp.call(e, n) && __defNormalProp(t, n, e[n]);
  if (__getOwnPropSymbols)
    for (var n of __getOwnPropSymbols(e))
      __propIsEnum.call(e, n) && __defNormalProp(t, n, e[n]);
  return t;
};
function createInputValue(t, e, n) {
  let r = e;
  const s = {}, o = () => r, i = (l) => {
    var a;
    l !== r && (r = l, (a = s.onSet) == null || a.call(s));
  };
  return { varId: t, get: o, set: i, reset: () => {
    i(e);
  }, callbacks: s };
}
var Series = class C {
  /**
   * @param varId The ID for the output variable (as used by SDEverywhere).
   * @param points The data points for the variable, one point per time increment.
   */
  constructor(e, n) {
    this.varId = e, this.points = n;
  }
  /**
   * Return the Y value at the given time.  Note that this does not attempt to interpolate
   * if there is no data point defined for the given time and will return undefined in
   * that case.
   *
   * @param time The x (time) value.
   * @return The y value for the given time, or undefined if there is no data point defined
   * for the given time.
   */
  getValueAtTime(e) {
    var n;
    return (n = this.points.find((r) => r.x === e)) == null ? void 0 : n.y;
  }
  /**
   * Create a new `Series` instance that is a copy of this one.
   */
  copy() {
    const e = this.points.map((n) => __spreadValues({}, n));
    return new C(this.varId, e);
  }
}, Outputs = class {
  /**
   * @param varIds The output variable identifiers.
   * @param startTime The start time for the model.
   * @param endTime The end time for the model.
   * @param saveFreq The frequency with which output values are saved (aka `SAVEPER`).
   */
  constructor(t, e, n, r = 1) {
    this.varIds = t, this.startTime = e, this.endTime = n, this.saveFreq = r, this.seriesLength = Math.round((n - e) / r) + 1, this.varSeries = new Array(t.length);
    for (let s = 0; s < t.length; s++) {
      const o = new Array(this.seriesLength);
      for (let u = 0; u < this.seriesLength; u++)
        o[u] = { x: e + u * r, y: 0 };
      const i = t[s];
      this.varSeries[s] = new Series(i, o);
    }
  }
  /**
   * The optional set of specs that dictate which variables from the model will be
   * stored in this `Outputs` instance.  If undefined, the default set of outputs
   * will be stored (as configured in `varIds`).
   * @hidden This is not yet part of the public API; it is exposed here for use
   * in experimental testing tools.
   */
  setVarSpecs(t) {
    if (t.length !== this.varIds.length)
      throw new Error("Length of output varSpecs must match that of varIds");
    this.varSpecs = t;
  }
  /**
   * Parse the given raw float buffer (produced by the model) and store the values
   * into this `Outputs` instance.
   *
   * Note that the length of `outputsBuffer` must be greater than or equal to
   * the capacity of this `Outputs` instance.  The `Outputs` instance is allowed
   * to be smaller to support the case where you want to extract a subset of
   * the time range in the buffer produced by the model.
   *
   * @param outputsBuffer The raw outputs buffer produced by the model.
   * @param rowLength The number of elements per row (one element per save point).
   * @return An `ok` result if the buffer is valid, otherwise an `err` result.
   */
  updateFromBuffer(t, e) {
    const n = parseOutputsBuffer(t, e, this);
    return n.isOk() ? ok$1(void 0) : err$1(n.error);
  }
  /**
   * Return the series for the given output variable.
   *
   * @param varId The ID of the output variable (as used by SDEverywhere).
   */
  getSeriesForVar(t) {
    const e = this.varIds.indexOf(t);
    if (e >= 0)
      return this.varSeries[e];
  }
};
function parseOutputsBuffer(t, e, n) {
  const r = n.varIds.length, s = n.seriesLength;
  if (e < s || t.length < r * s)
    return err$1("invalid-point-count");
  for (let o = 0; o < r; o++) {
    const i = n.varSeries[o];
    let u = e * o;
    for (let l = 0; l < s; l++)
      i.points[l].y = validateNumber(t[u]), u++;
  }
  return ok$1(n);
}
function validateNumber(t) {
  if (!isNaN(t) && t > -1e32)
    return t;
}
function getEncodedVarIndicesLength(t) {
  var e;
  let n = 1;
  for (const r of t) {
    n += 2;
    const s = ((e = r.subscriptIndices) == null ? void 0 : e.length) || 0;
    n += s;
  }
  return n;
}
function encodeVarIndices(t, e) {
  let n = 0;
  e[n++] = t.length;
  for (const r of t) {
    e[n++] = r.varIndex;
    const s = r.subscriptIndices, o = s?.length || 0;
    e[n++] = o;
    for (let i = 0; i < o; i++)
      e[n++] = s[i];
  }
}
function getEncodedConstantBufferLengths(t) {
  var e;
  let n = 1, r = 0;
  for (const s of t) {
    const o = s.varRef.varSpec;
    if (o === void 0)
      throw new Error("Cannot compute constant buffer lengths until all constant var specs are defined");
    n += 2;
    const i = ((e = o.subscriptIndices) == null ? void 0 : e.length) || 0;
    n += i, r += 1;
  }
  return {
    constantIndicesLength: n,
    constantsLength: r
  };
}
function encodeConstants(t, e, n) {
  let r = 0;
  e[r++] = t.length;
  let s = 0;
  for (const o of t) {
    const i = o.varRef.varSpec;
    e[r++] = i.varIndex;
    const u = i.subscriptIndices, l = u?.length || 0;
    e[r++] = l;
    for (let a = 0; a < l; a++)
      e[r++] = u[a];
    n[s++] = o.value;
  }
}
function decodeConstants(t, e) {
  const n = [];
  let r = 0;
  const s = t[r++];
  for (let o = 0; o < s; o++) {
    const i = t[r++], u = t[r++], l = u > 0 ? Array(u) : void 0;
    for (let f = 0; f < u; f++)
      l[f] = t[r++];
    const a = {
      varIndex: i,
      subscriptIndices: l
    }, c = e[o];
    n.push({
      varRef: {
        varSpec: a
      },
      value: c
    });
  }
  return n;
}
function getEncodedLookupBufferLengths(t) {
  var e, n;
  let r = 1, s = 0;
  for (const o of t) {
    const i = o.varRef.varSpec;
    if (i === void 0)
      throw new Error("Cannot compute lookup buffer lengths until all lookup var specs are defined");
    r += 2;
    const u = ((e = i.subscriptIndices) == null ? void 0 : e.length) || 0;
    r += u, r += 2, s += ((n = o.points) == null ? void 0 : n.length) || 0;
  }
  return {
    lookupIndicesLength: r,
    lookupsLength: s
  };
}
function encodeLookups(t, e, n) {
  let r = 0;
  e[r++] = t.length;
  let s = 0;
  for (const o of t) {
    const i = o.varRef.varSpec;
    e[r++] = i.varIndex;
    const u = i.subscriptIndices, l = u?.length || 0;
    e[r++] = l;
    for (let a = 0; a < l; a++)
      e[r++] = u[a];
    o.points !== void 0 ? (e[r++] = s, e[r++] = o.points.length, n?.set(o.points, s), s += o.points.length) : (e[r++] = -1, e[r++] = 0);
  }
}
function decodeLookups(t, e) {
  const n = [];
  let r = 0;
  const s = t[r++];
  for (let o = 0; o < s; o++) {
    const i = t[r++], u = t[r++], l = u > 0 ? Array(u) : void 0;
    for (let p = 0; p < u; p++)
      l[p] = t[r++];
    const a = t[r++], c = t[r++], f = {
      varIndex: i,
      subscriptIndices: l
    };
    let d;
    a >= 0 ? e ? d = e.slice(a, a + c) : d = new Float64Array(0) : d = void 0, n.push({
      varRef: {
        varSpec: f
      },
      points: d
    });
  }
  return n;
}
var ModelListing = class {
  constructor(t) {
    this.varSpecs = /* @__PURE__ */ new Map();
    const e = /* @__PURE__ */ new Map();
    for (const s of t.dimensions) {
      const o = s.id, i = [];
      for (let u = 0; u < s.subIds.length; u++)
        i.push({
          id: s.subIds[u],
          index: u
        });
      e.set(o, {
        id: o,
        subscripts: i
      });
    }
    function n(s) {
      const o = e.get(s);
      if (o === void 0)
        throw new Error(`No dimension info found for id=${s}`);
      return o;
    }
    const r = /* @__PURE__ */ new Set();
    for (const s of t.variables) {
      const o = varIdWithoutSubscripts(s.id);
      if (!r.has(o)) {
        const u = (s.dimIds || []).map(n);
        if (u.length > 0) {
          const l = [];
          for (const c of u)
            l.push(c.subscripts);
          const a = cartesianProductOf(l);
          for (const c of a) {
            const f = c.map((g) => g.id).join(","), d = c.map((g) => g.index), p = `${o}[${f}]`;
            this.varSpecs.set(p, {
              varIndex: s.index,
              subscriptIndices: d
            });
          }
        } else
          this.varSpecs.set(o, {
            varIndex: s.index
          });
        r.add(o);
      }
    }
  }
  /**
   * Return the `VarSpec` for the given variable ID, or undefined if there is no spec defined
   * in the listing for that variable.
   */
  getSpecForVarId(t) {
    return this.varSpecs.get(t);
  }
  /**
   * Return the `VarSpec` for the given variable name, or undefined if there is no spec defined
   * in the listing for that variable.
   */
  getSpecForVarName(t) {
    const e = sdeVarIdForVensimVarName(t);
    return this.varSpecs.get(e);
  }
  /**
   * Create a new `Outputs` instance that uses the same start/end years as the given "normal"
   * `Outputs` instance but is prepared for reading the specified internal variables from the model.
   *
   * @param normalOutputs The `Outputs` that is used to access normal output variables from the model.
   * @param varIds The variable IDs to include with the new `Outputs` instance.
   */
  deriveOutputs(t, e) {
    const n = [];
    for (const s of e) {
      const o = this.varSpecs.get(s);
      o !== void 0 ? n.push(o) : console.warn(`WARNING: No output var spec found for id=${s}`);
    }
    const r = new Outputs(e, t.startTime, t.endTime, t.saveFreq);
    return r.varSpecs = n, r;
  }
};
function varIdWithoutSubscripts(t) {
  const e = t.indexOf("[");
  return e >= 0 ? t.substring(0, e) : t;
}
function cartesianProductOf(t) {
  return t.reduce(
    (e, n) => e.map((r) => n.map((s) => r.concat([s]))).reduce((r, s) => r.concat(s), []),
    [[]]
  );
}
function sdeVarIdForVensimName(t) {
  return "_" + t.trim().replace(/"/g, "_").replace(/\s+!$/g, "!").replace(/\s/g, "_").replace(/,/g, "_").replace(/-/g, "_").replace(/\./g, "_").replace(/\$/g, "_").replace(/'/g, "_").replace(/&/g, "_").replace(/%/g, "_").replace(/\//g, "_").replace(/\|/g, "_").toLowerCase();
}
function sdeVarIdForVensimVarName(t) {
  const e = t.match(/([^[]+)(?:\[([^\]]+)\])?/);
  if (!e)
    throw new Error(`Invalid Vensim name: ${t}`);
  let n = sdeVarIdForVensimName(e[1]);
  if (e[2]) {
    const r = e[2].split(",").map((s) => sdeVarIdForVensimName(s));
    n += `[${r.join(",")}]`;
  }
  return n;
}
function resolveVarRef(t, e, n) {
  if (!e.varSpec) {
    if (t === void 0)
      throw new Error(
        `Unable to resolve ${n} variable references by name or identifier when model listing is unavailable`
      );
    if (e.varId) {
      const r = t?.getSpecForVarId(e.varId);
      if (r)
        e.varSpec = r;
      else
        throw new Error(`Failed to resolve ${n} variable reference for varId=${e.varId}`);
    } else {
      const r = t?.getSpecForVarName(e.varName);
      if (r)
        e.varSpec = r;
      else
        throw new Error(`Failed to resolve ${n} variable reference for varName='${e.varId}'`);
    }
  }
}
var headerLengthInElements = 20, extrasLengthInElements = 1, Int32Section = class {
  constructor() {
    this.offsetInBytes = 0, this.lengthInElements = 0;
  }
  update(t, e, n) {
    this.view = n > 0 ? new Int32Array(t, e, n) : void 0, this.offsetInBytes = e, this.lengthInElements = n;
  }
}, Float64Section = class {
  constructor() {
    this.offsetInBytes = 0, this.lengthInElements = 0;
  }
  update(t, e, n) {
    this.view = n > 0 ? new Float64Array(t, e, n) : void 0, this.offsetInBytes = e, this.lengthInElements = n;
  }
}, BufferedRunModelParams = class {
  /**
   * @param listing The model listing that is used to locate a variable that is referenced by
   * name or identifier.  If undefined, variables cannot be referenced by name or identifier,
   * and can only be referenced using a valid `VarSpec`.
   */
  constructor(t) {
    this.listing = t, this.header = new Int32Section(), this.extras = new Float64Section(), this.inputs = new Float64Section(), this.outputs = new Float64Section(), this.outputIndices = new Int32Section(), this.constants = new Float64Section(), this.constantIndices = new Int32Section(), this.lookups = new Float64Section(), this.lookupIndices = new Int32Section();
  }
  /**
   * Return the encoded buffer from this instance, which can be passed to `updateFromEncodedBuffer`.
   */
  getEncodedBuffer() {
    return this.encoded;
  }
  // from RunModelParams interface
  getInputs() {
    return this.inputs.view;
  }
  // from RunModelParams interface
  copyInputs(t, e) {
    this.inputs.lengthInElements !== 0 && ((t === void 0 || t.length < this.inputs.lengthInElements) && (t = e(this.inputs.lengthInElements)), t.set(this.inputs.view));
  }
  // from RunModelParams interface
  getOutputIndicesLength() {
    return this.outputIndices.lengthInElements;
  }
  // from RunModelParams interface
  getOutputIndices() {
    return this.outputIndices.view;
  }
  // from RunModelParams interface
  copyOutputIndices(t, e) {
    this.outputIndices.lengthInElements !== 0 && ((t === void 0 || t.length < this.outputIndices.lengthInElements) && (t = e(this.outputIndices.lengthInElements)), t.set(this.outputIndices.view));
  }
  // from RunModelParams interface
  getOutputsLength() {
    return this.outputs.lengthInElements;
  }
  // from RunModelParams interface
  getOutputs() {
    return this.outputs.view;
  }
  // from RunModelParams interface
  getOutputsObject() {
  }
  // from RunModelParams interface
  storeOutputs(t) {
    this.outputs.view !== void 0 && (t.length > this.outputs.view.length ? this.outputs.view.set(t.subarray(0, this.outputs.view.length)) : this.outputs.view.set(t));
  }
  // from RunModelParams interface
  getConstants() {
    if (this.constantIndices.lengthInElements !== 0)
      return decodeConstants(this.constantIndices.view, this.constants.view);
  }
  // from RunModelParams interface
  getLookups() {
    if (this.lookupIndices.lengthInElements !== 0)
      return decodeLookups(this.lookupIndices.view, this.lookups.view);
  }
  // from RunModelParams interface
  getElapsedTime() {
    return this.extras.view[0];
  }
  // from RunModelParams interface
  storeElapsedTime(t) {
    this.extras.view[0] = t;
  }
  /**
   * Copy the outputs buffer to the given `Outputs` instance.  This should be called
   * after the `runModel` call has completed so that the output values are copied from
   * the internal buffer to the `Outputs` instance that was passed to `runModel`.
   *
   * @param outputs The `Outputs` instance into which the output values will be copied.
   */
  finalizeOutputs(t) {
    this.outputs.view && t.updateFromBuffer(this.outputs.view, t.seriesLength), t.runTimeInMillis = this.getElapsedTime();
  }
  /**
   * Update this instance using the parameters that are passed to a `runModel` call.
   *
   * @param inputs The model input values (must be in the same order as in the spec file).
   * @param outputs The structure into which the model outputs will be stored.
   * @param options Additional options that influence the model run.
   */
  updateFromParams(t, e, n) {
    const r = t.length, s = e.varIds.length * e.seriesLength;
    let o;
    const i = e.varSpecs;
    i !== void 0 && i.length > 0 ? o = getEncodedVarIndicesLength(i) : o = 0;
    let u, l;
    if (n?.constants !== void 0 && n.constants.length > 0) {
      for (const k of n.constants)
        resolveVarRef(this.listing, k.varRef, "constant");
      const S = getEncodedConstantBufferLengths(n.constants);
      u = S.constantsLength, l = S.constantIndicesLength;
    } else
      u = 0, l = 0;
    let a, c;
    if (n?.lookups !== void 0 && n.lookups.length > 0) {
      for (const k of n.lookups)
        resolveVarRef(this.listing, k.varRef, "lookup");
      const S = getEncodedLookupBufferLengths(n.lookups);
      a = S.lookupsLength, c = S.lookupIndicesLength;
    } else
      a = 0, c = 0;
    let f = 0;
    function d(S, k) {
      const O = f, L = S === "float64" ? Float64Array.BYTES_PER_ELEMENT : Int32Array.BYTES_PER_ELEMENT, R = Math.round(k * L), N = Math.ceil(R / 8) * 8;
      return f += N, O;
    }
    const p = d("int32", headerLengthInElements), g = d("float64", extrasLengthInElements), h = d("float64", r), m = d("float64", s), y = d("int32", o), b = d("float64", u), _ = d("int32", l), E = d("float64", a), w = d("int32", c), M = f;
    if (this.encoded === void 0 || this.encoded.byteLength < M) {
      const S = Math.ceil(M * 1.2);
      this.encoded = new ArrayBuffer(S), this.header.update(this.encoded, p, headerLengthInElements);
    }
    const v = this.header.view;
    let I = 0;
    v[I++] = g, v[I++] = extrasLengthInElements, v[I++] = h, v[I++] = r, v[I++] = m, v[I++] = s, v[I++] = y, v[I++] = o, v[I++] = b, v[I++] = u, v[I++] = _, v[I++] = l, v[I++] = E, v[I++] = a, v[I++] = w, v[I++] = c, this.inputs.update(this.encoded, h, r), this.extras.update(this.encoded, g, extrasLengthInElements), this.outputs.update(this.encoded, m, s), this.outputIndices.update(this.encoded, y, o), this.constants.update(this.encoded, b, u), this.constantIndices.update(this.encoded, _, l), this.lookups.update(this.encoded, E, a), this.lookupIndices.update(this.encoded, w, c);
    const T = this.inputs.view;
    for (let S = 0; S < t.length; S++) {
      const k = t[S];
      typeof k == "number" ? T[S] = k : T[S] = k.get();
    }
    this.outputIndices.view && encodeVarIndices(i, this.outputIndices.view), l > 0 && encodeConstants(n.constants, this.constantIndices.view, this.constants.view), c > 0 && encodeLookups(n.lookups, this.lookupIndices.view, this.lookups.view);
  }
  /**
   * Update this instance using the values contained in the encoded buffer from another
   * `BufferedRunModelParams` instance.
   *
   * @param buffer An encoded buffer returned by `getEncodedBuffer`.
   */
  updateFromEncodedBuffer(t) {
    const e = headerLengthInElements * Int32Array.BYTES_PER_ELEMENT;
    if (t.byteLength < e)
      throw new Error("Buffer must be long enough to contain header section");
    this.encoded = t, this.header.update(this.encoded, 0, headerLengthInElements);
    const r = this.header.view;
    let s = 0;
    const o = r[s++], i = r[s++], u = r[s++], l = r[s++], a = r[s++], c = r[s++], f = r[s++], d = r[s++], p = r[s++], g = r[s++], h = r[s++], m = r[s++], y = r[s++], b = r[s++], _ = r[s++], E = r[s++], w = i * Float64Array.BYTES_PER_ELEMENT, M = l * Float64Array.BYTES_PER_ELEMENT, v = c * Float64Array.BYTES_PER_ELEMENT, I = d * Int32Array.BYTES_PER_ELEMENT, T = g * Float64Array.BYTES_PER_ELEMENT, S = m * Int32Array.BYTES_PER_ELEMENT, k = b * Float64Array.BYTES_PER_ELEMENT, O = E * Int32Array.BYTES_PER_ELEMENT, L = e + w + M + v + I + T + S + k + O;
    if (t.byteLength < L)
      throw new Error("Buffer must be long enough to contain sections declared in header");
    this.extras.update(this.encoded, o, i), this.inputs.update(this.encoded, u, l), this.outputs.update(this.encoded, a, c), this.outputIndices.update(this.encoded, f, d), this.constants.update(this.encoded, p, g), this.constantIndices.update(this.encoded, h, m), this.lookups.update(this.encoded, y, b), this.lookupIndices.update(this.encoded, _, E);
  }
};
async function spawnAsyncModelRunner(t) {
  return t.path ? spawnAsyncModelRunnerWithWorker(new Worker$1(t.path)) : spawnAsyncModelRunnerWithWorker(BlobWorker.fromText(t.source));
}
async function spawnAsyncModelRunnerWithWorker(t) {
  const e = await spawn(t), n = await e.initModel(), r = n.modelListing ? new ModelListing(n.modelListing) : void 0, s = new BufferedRunModelParams(r);
  let o = !1, i = !1;
  return {
    createOutputs: () => new Outputs(n.outputVarIds, n.startTime, n.endTime, n.saveFreq),
    runModel: async (u, l, a) => {
      if (i)
        throw new Error("Async model runner has already been terminated");
      if (o)
        throw new Error("Async model runner only supports one `runModel` call at a time");
      o = !0, s.updateFromParams(u, l, a);
      let c;
      try {
        c = await e.runModel(Transfer(s.getEncodedBuffer()));
      } finally {
        o = !1;
      }
      return s.updateFromEncodedBuffer(c), s.finalizeOutputs(l), l;
    },
    terminate: () => i ? Promise.resolve() : (i = !0, Thread.terminate(e))
  };
}
var assertNever = {}, hasRequiredAssertNever;
function requireAssertNever() {
  if (hasRequiredAssertNever) return assertNever;
  hasRequiredAssertNever = 1, Object.defineProperty(assertNever, "__esModule", { value: !0 }), assertNever.assertNever = t;
  function t(e, n) {
    if (typeof n == "string")
      throw new Error(n);
    if (typeof n == "function")
      throw new Error(n(e));
    if (n)
      return e;
    throw new Error("Unhandled discriminated union member: ".concat(JSON.stringify(e)));
  }
  return assertNever.default = t, assertNever;
}
var assertNeverExports = requireAssertNever();
function __awaiter(t, e, n, r) {
  function s(o) {
    return o instanceof n ? o : new n(function(i) {
      i(o);
    });
  }
  return new (n || (n = Promise))(function(o, i) {
    function u(c) {
      try {
        a(r.next(c));
      } catch (f) {
        i(f);
      }
    }
    function l(c) {
      try {
        a(r.throw(c));
      } catch (f) {
        i(f);
      }
    }
    function a(c) {
      c.done ? o(c.value) : s(c.value).then(u, l);
    }
    a((r = r.apply(t, [])).next());
  });
}
function __generator(t, e) {
  var n = { label: 0, sent: function() {
    if (o[0] & 1) throw o[1];
    return o[1];
  }, trys: [], ops: [] }, r, s, o, i;
  return i = { next: u(0), throw: u(1), return: u(2) }, typeof Symbol == "function" && (i[Symbol.iterator] = function() {
    return this;
  }), i;
  function u(a) {
    return function(c) {
      return l([a, c]);
    };
  }
  function l(a) {
    if (r) throw new TypeError("Generator is already executing.");
    for (; n; ) try {
      if (r = 1, s && (o = a[0] & 2 ? s.return : a[0] ? s.throw || ((o = s.return) && o.call(s), 0) : s.next) && !(o = o.call(s, a[1])).done) return o;
      switch (s = 0, o && (a = [a[0] & 2, o.value]), a[0]) {
        case 0:
        case 1:
          o = a;
          break;
        case 4:
          return n.label++, { value: a[1], done: !1 };
        case 5:
          n.label++, s = a[1], a = [0];
          continue;
        case 7:
          a = n.ops.pop(), n.trys.pop();
          continue;
        default:
          if (o = n.trys, !(o = o.length > 0 && o[o.length - 1]) && (a[0] === 6 || a[0] === 2)) {
            n = 0;
            continue;
          }
          if (a[0] === 3 && (!o || a[1] > o[0] && a[1] < o[3])) {
            n.label = a[1];
            break;
          }
          if (a[0] === 6 && n.label < o[1]) {
            n.label = o[1], o = a;
            break;
          }
          if (o && n.label < o[2]) {
            n.label = o[2], n.ops.push(a);
            break;
          }
          o[2] && n.ops.pop(), n.trys.pop();
          continue;
      }
      a = e.call(t, n);
    } catch (c) {
      a = [6, c], s = 0;
    } finally {
      r = o = 0;
    }
    if (a[0] & 5) throw a[1];
    return { value: a[0] ? a[1] : void 0, done: !0 };
  }
}
function __read(t, e) {
  var n = typeof Symbol == "function" && t[Symbol.iterator];
  if (!n) return t;
  var r = n.call(t), s, o = [], i;
  try {
    for (; (e === void 0 || e-- > 0) && !(s = r.next()).done; ) o.push(s.value);
  } catch (u) {
    i = { error: u };
  } finally {
    try {
      s && !s.done && (n = r.return) && n.call(r);
    } finally {
      if (i) throw i.error;
    }
  }
  return o;
}
function __spreadArray(t, e, n) {
  if (arguments.length === 2) for (var r = 0, s = e.length, o; r < s; r++)
    (o || !(r in e)) && (o || (o = Array.prototype.slice.call(e, 0, r)), o[r] = e[r]);
  return t.concat(o || Array.prototype.slice.call(e));
}
var defaultErrorConfig = {
  withStackTrace: !1
}, createNeverThrowError = function(t, e, n) {
  n === void 0 && (n = defaultErrorConfig);
  var r = e.isOk() ? { type: "Ok", value: e.value } : { type: "Err", value: e.error }, s = n.withStackTrace ? new Error().stack : void 0;
  return {
    data: r,
    message: t,
    stack: s
  };
}, Result;
(function(t) {
  function e(n, r) {
    return function() {
      for (var s = [], o = 0; o < arguments.length; o++)
        s[o] = arguments[o];
      try {
        var i = n.apply(void 0, __spreadArray([], __read(s), !1));
        return ok(i);
      } catch (u) {
        return err(r ? r(u) : u);
      }
    };
  }
  t.fromThrowable = e;
})(Result || (Result = {}));
var ok = function(t) {
  return new Ok(t);
}, err = function(t) {
  return new Err(t);
}, Ok = (
  /** @class */
  (function() {
    function t(e) {
      this.value = e;
    }
    return t.prototype.isOk = function() {
      return !0;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return ok(e(this.value));
    }, t.prototype.mapErr = function(e) {
      return ok(this.value);
    }, t.prototype.andThen = function(e) {
      return e(this.value);
    }, t.prototype.orElse = function(e) {
      return ok(this.value);
    }, t.prototype.asyncAndThen = function(e) {
      return e(this.value);
    }, t.prototype.asyncMap = function(e) {
      return ResultAsync.fromSafePromise(e(this.value));
    }, t.prototype.unwrapOr = function(e) {
      return this.value;
    }, t.prototype.match = function(e, n) {
      return e(this.value);
    }, t.prototype._unsafeUnwrap = function(e) {
      return this.value;
    }, t.prototype._unsafeUnwrapErr = function(e) {
      throw createNeverThrowError("Called `_unsafeUnwrapErr` on an Ok", this, e);
    }, t;
  })()
), Err = (
  /** @class */
  (function() {
    function t(e) {
      this.error = e;
    }
    return t.prototype.isOk = function() {
      return !1;
    }, t.prototype.isErr = function() {
      return !this.isOk();
    }, t.prototype.map = function(e) {
      return err(this.error);
    }, t.prototype.mapErr = function(e) {
      return err(e(this.error));
    }, t.prototype.andThen = function(e) {
      return err(this.error);
    }, t.prototype.orElse = function(e) {
      return e(this.error);
    }, t.prototype.asyncAndThen = function(e) {
      return errAsync(this.error);
    }, t.prototype.asyncMap = function(e) {
      return errAsync(this.error);
    }, t.prototype.unwrapOr = function(e) {
      return e;
    }, t.prototype.match = function(e, n) {
      return n(this.error);
    }, t.prototype._unsafeUnwrap = function(e) {
      throw createNeverThrowError("Called `_unsafeUnwrap` on an Err", this, e);
    }, t.prototype._unsafeUnwrapErr = function(e) {
      return this.error;
    }, t;
  })()
);
Result.fromThrowable;
var ResultAsync = (
  /** @class */
  (function() {
    function t(e) {
      this._promise = e;
    }
    return t.fromSafePromise = function(e) {
      var n = e.then(function(r) {
        return new Ok(r);
      });
      return new t(n);
    }, t.fromPromise = function(e, n) {
      var r = e.then(function(s) {
        return new Ok(s);
      }).catch(function(s) {
        return new Err(n(s));
      });
      return new t(r);
    }, t.prototype.map = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter(n, void 0, void 0, function() {
          var s;
          return __generator(this, function(o) {
            switch (o.label) {
              case 0:
                return r.isErr() ? [2, new Err(r.error)] : (s = Ok.bind, [4, e(r.value)]);
              case 1:
                return [2, new (s.apply(Ok, [void 0, o.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.mapErr = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter(n, void 0, void 0, function() {
          var s;
          return __generator(this, function(o) {
            switch (o.label) {
              case 0:
                return r.isOk() ? [2, new Ok(r.value)] : (s = Err.bind, [4, e(r.error)]);
              case 1:
                return [2, new (s.apply(Err, [void 0, o.sent()]))()];
            }
          });
        });
      }));
    }, t.prototype.andThen = function(e) {
      return new t(this._promise.then(function(n) {
        if (n.isErr())
          return new Err(n.error);
        var r = e(n.value);
        return r instanceof t ? r._promise : r;
      }));
    }, t.prototype.orElse = function(e) {
      var n = this;
      return new t(this._promise.then(function(r) {
        return __awaiter(n, void 0, void 0, function() {
          return __generator(this, function(s) {
            return r.isErr() ? [2, e(r.error)] : [2, new Ok(r.value)];
          });
        });
      }));
    }, t.prototype.match = function(e, n) {
      return this._promise.then(function(r) {
        return r.match(e, n);
      });
    }, t.prototype.unwrapOr = function(e) {
      return this._promise.then(function(n) {
        return n.unwrapOr(e);
      });
    }, t.prototype.then = function(e, n) {
      return this._promise.then(e, n);
    }, t;
  })()
), errAsync = function(t) {
  return new ResultAsync(Promise.resolve(new Err(t)));
};
ResultAsync.fromPromise;
ResultAsync.fromSafePromise;
const ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias"), DOC = /* @__PURE__ */ Symbol.for("yaml.document"), MAP = /* @__PURE__ */ Symbol.for("yaml.map"), PAIR = /* @__PURE__ */ Symbol.for("yaml.pair"), SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar"), SEQ = /* @__PURE__ */ Symbol.for("yaml.seq"), NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type"), isAlias = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === ALIAS, isDocument = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === DOC, isMap = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === MAP, isPair = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === PAIR, isScalar = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === SCALAR, isSeq = (t) => !!t && typeof t == "object" && t[NODE_TYPE] === SEQ;
function isCollection(t) {
  if (t && typeof t == "object")
    switch (t[NODE_TYPE]) {
      case MAP:
      case SEQ:
        return !0;
    }
  return !1;
}
function isNode(t) {
  if (t && typeof t == "object")
    switch (t[NODE_TYPE]) {
      case ALIAS:
      case MAP:
      case SCALAR:
      case SEQ:
        return !0;
    }
  return !1;
}
const hasAnchor = (t) => (isScalar(t) || isCollection(t)) && !!t.anchor, BREAK = /* @__PURE__ */ Symbol("break visit"), SKIP = /* @__PURE__ */ Symbol("skip children"), REMOVE = /* @__PURE__ */ Symbol("remove node");
function visit(t, e) {
  const n = initVisitor(e);
  isDocument(t) ? visit_(null, t.contents, n, Object.freeze([t])) === REMOVE && (t.contents = null) : visit_(null, t, n, Object.freeze([]));
}
visit.BREAK = BREAK;
visit.SKIP = SKIP;
visit.REMOVE = REMOVE;
function visit_(t, e, n, r) {
  const s = callVisitor(t, e, n, r);
  if (isNode(s) || isPair(s))
    return replaceNode(t, r, s), visit_(t, s, n, r);
  if (typeof s != "symbol") {
    if (isCollection(e)) {
      r = Object.freeze(r.concat(e));
      for (let o = 0; o < e.items.length; ++o) {
        const i = visit_(o, e.items[o], n, r);
        if (typeof i == "number")
          o = i - 1;
        else {
          if (i === BREAK)
            return BREAK;
          i === REMOVE && (e.items.splice(o, 1), o -= 1);
        }
      }
    } else if (isPair(e)) {
      r = Object.freeze(r.concat(e));
      const o = visit_("key", e.key, n, r);
      if (o === BREAK)
        return BREAK;
      o === REMOVE && (e.key = null);
      const i = visit_("value", e.value, n, r);
      if (i === BREAK)
        return BREAK;
      i === REMOVE && (e.value = null);
    }
  }
  return s;
}
function initVisitor(t) {
  return typeof t == "object" && (t.Collection || t.Node || t.Value) ? Object.assign({
    Alias: t.Node,
    Map: t.Node,
    Scalar: t.Node,
    Seq: t.Node
  }, t.Value && {
    Map: t.Value,
    Scalar: t.Value,
    Seq: t.Value
  }, t.Collection && {
    Map: t.Collection,
    Seq: t.Collection
  }, t) : t;
}
function callVisitor(t, e, n, r) {
  if (typeof n == "function")
    return n(t, e, r);
  if (isMap(e))
    return n.Map?.(t, e, r);
  if (isSeq(e))
    return n.Seq?.(t, e, r);
  if (isPair(e))
    return n.Pair?.(t, e, r);
  if (isScalar(e))
    return n.Scalar?.(t, e, r);
  if (isAlias(e))
    return n.Alias?.(t, e, r);
}
function replaceNode(t, e, n) {
  const r = e[e.length - 1];
  if (isCollection(r))
    r.items[t] = n;
  else if (isPair(r))
    t === "key" ? r.key = n : r.value = n;
  else if (isDocument(r))
    r.contents = n;
  else {
    const s = isAlias(r) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${s} parent`);
  }
}
function anchorIsValid(t) {
  if (/[\x00-\x19\s,[\]{}]/.test(t)) {
    const n = `Anchor must not contain whitespace or control characters: ${JSON.stringify(t)}`;
    throw new Error(n);
  }
  return !0;
}
function applyReviver(t, e, n, r) {
  if (r && typeof r == "object")
    if (Array.isArray(r))
      for (let s = 0, o = r.length; s < o; ++s) {
        const i = r[s], u = applyReviver(t, r, String(s), i);
        u === void 0 ? delete r[s] : u !== i && (r[s] = u);
      }
    else if (r instanceof Map)
      for (const s of Array.from(r.keys())) {
        const o = r.get(s), i = applyReviver(t, r, s, o);
        i === void 0 ? r.delete(s) : i !== o && r.set(s, i);
      }
    else if (r instanceof Set)
      for (const s of Array.from(r)) {
        const o = applyReviver(t, r, s, s);
        o === void 0 ? r.delete(s) : o !== s && (r.delete(s), r.add(o));
      }
    else
      for (const [s, o] of Object.entries(r)) {
        const i = applyReviver(t, r, s, o);
        i === void 0 ? delete r[s] : i !== o && (r[s] = i);
      }
  return t.call(e, n, r);
}
function toJS(t, e, n) {
  if (Array.isArray(t))
    return t.map((r, s) => toJS(r, String(s), n));
  if (t && typeof t.toJSON == "function") {
    if (!n || !hasAnchor(t))
      return t.toJSON(e, n);
    const r = { aliasCount: 0, count: 1, res: void 0 };
    n.anchors.set(t, r), n.onCreate = (o) => {
      r.res = o, delete n.onCreate;
    };
    const s = t.toJSON(e, n);
    return n.onCreate && n.onCreate(s), s;
  }
  return typeof t == "bigint" && !n?.keep ? Number(t) : t;
}
class NodeBase {
  constructor(e) {
    Object.defineProperty(this, NODE_TYPE, { value: e });
  }
  /** Create a copy of this node.  */
  clone() {
    const e = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return this.range && (e.range = this.range.slice()), e;
  }
  /** A plain JavaScript representation of this node. */
  toJS(e, { mapAsMap: n, maxAliasCount: r, onAnchor: s, reviver: o } = {}) {
    if (!isDocument(e))
      throw new TypeError("A document argument is required");
    const i = {
      anchors: /* @__PURE__ */ new Map(),
      doc: e,
      keep: !0,
      mapAsMap: n === !0,
      mapKeyWarned: !1,
      maxAliasCount: typeof r == "number" ? r : 100
    }, u = toJS(this, "", i);
    if (typeof s == "function")
      for (const { count: l, res: a } of i.anchors.values())
        s(a, l);
    return typeof o == "function" ? applyReviver(o, { "": u }, "", u) : u;
  }
}
class Alias extends NodeBase {
  constructor(e) {
    super(ALIAS), this.source = e, Object.defineProperty(this, "tag", {
      set() {
        throw new Error("Alias nodes cannot have tags");
      }
    });
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */
  resolve(e, n) {
    let r;
    n?.aliasResolveCache ? r = n.aliasResolveCache : (r = [], visit(e, {
      Node: (o, i) => {
        (isAlias(i) || hasAnchor(i)) && r.push(i);
      }
    }), n && (n.aliasResolveCache = r));
    let s;
    for (const o of r) {
      if (o === this)
        break;
      o.anchor === this.source && (s = o);
    }
    return s;
  }
  toJSON(e, n) {
    if (!n)
      return { source: this.source };
    const { anchors: r, doc: s, maxAliasCount: o } = n, i = this.resolve(s, n);
    if (!i) {
      const l = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(l);
    }
    let u = r.get(i);
    if (u || (toJS(i, null, n), u = r.get(i)), u?.res === void 0) {
      const l = "This should not happen: Alias anchor was not resolved?";
      throw new ReferenceError(l);
    }
    if (o >= 0 && (u.count += 1, u.aliasCount === 0 && (u.aliasCount = getAliasCount(s, i, r)), u.count * u.aliasCount > o)) {
      const l = "Excessive alias count indicates a resource exhaustion attack";
      throw new ReferenceError(l);
    }
    return u.res;
  }
  toString(e, n, r) {
    const s = `*${this.source}`;
    if (e) {
      if (anchorIsValid(this.source), e.options.verifyAliasOrder && !e.anchors.has(this.source)) {
        const o = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(o);
      }
      if (e.implicitKey)
        return `${s} `;
    }
    return s;
  }
}
function getAliasCount(t, e, n) {
  if (isAlias(e)) {
    const r = e.resolve(t), s = n && r && n.get(r);
    return s ? s.count * s.aliasCount : 0;
  } else if (isCollection(e)) {
    let r = 0;
    for (const s of e.items) {
      const o = getAliasCount(t, s, n);
      o > r && (r = o);
    }
    return r;
  } else if (isPair(e)) {
    const r = getAliasCount(t, e.key, n), s = getAliasCount(t, e.value, n);
    return Math.max(r, s);
  }
  return 1;
}
const isScalarValue = (t) => !t || typeof t != "function" && typeof t != "object";
class Scalar extends NodeBase {
  constructor(e) {
    super(SCALAR), this.value = e;
  }
  toJSON(e, n) {
    return n?.keep ? this.value : toJS(this.value, e, n);
  }
  toString() {
    return String(this.value);
  }
}
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
function findTagObject(t, e, n) {
  return n.find((r) => r.identify?.(t) && !r.format);
}
function createNode(t, e, n) {
  if (isDocument(t) && (t = t.contents), isNode(t))
    return t;
  if (isPair(t)) {
    const f = n.schema[MAP].createNode?.(n.schema, null, n);
    return f.items.push(t), f;
  }
  (t instanceof String || t instanceof Number || t instanceof Boolean || typeof BigInt < "u" && t instanceof BigInt) && (t = t.valueOf());
  const { aliasDuplicateObjects: r, onAnchor: s, onTagObj: o, schema: i, sourceObjects: u } = n;
  let l;
  if (r && t && typeof t == "object") {
    if (l = u.get(t), l)
      return l.anchor ?? (l.anchor = s(t)), new Alias(l.anchor);
    l = { anchor: null, node: null }, u.set(t, l);
  }
  let a = findTagObject(t, e, i.tags);
  if (!a) {
    if (t && typeof t.toJSON == "function" && (t = t.toJSON()), !t || typeof t != "object") {
      const f = new Scalar(t);
      return l && (l.node = f), f;
    }
    a = t instanceof Map ? i[MAP] : Symbol.iterator in Object(t) ? i[SEQ] : i[MAP];
  }
  o && (o(a), delete n.onTagObj);
  const c = a?.createNode ? a.createNode(n.schema, t, n) : typeof a?.nodeClass?.from == "function" ? a.nodeClass.from(n.schema, t, n) : new Scalar(t);
  return a.default || (c.tag = a.tag), l && (l.node = c), c;
}
function collectionFromPath(t, e, n) {
  let r = n;
  for (let s = e.length - 1; s >= 0; --s) {
    const o = e[s];
    if (typeof o == "number" && Number.isInteger(o) && o >= 0) {
      const i = [];
      i[o] = r, r = i;
    } else
      r = /* @__PURE__ */ new Map([[o, r]]);
  }
  return createNode(r, void 0, {
    aliasDuplicateObjects: !1,
    keepUndefined: !1,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: t,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
const isEmptyPath = (t) => t == null || typeof t == "object" && !!t[Symbol.iterator]().next().done;
class Collection extends NodeBase {
  constructor(e, n) {
    super(e), Object.defineProperty(this, "schema", {
      value: n,
      configurable: !0,
      enumerable: !1,
      writable: !0
    });
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */
  clone(e) {
    const n = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return e && (n.schema = e), n.items = n.items.map((r) => isNode(r) || isPair(r) ? r.clone(e) : r), this.range && (n.range = this.range.slice()), n;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(e, n) {
    if (isEmptyPath(e))
      this.add(n);
    else {
      const [r, ...s] = e, o = this.get(r, !0);
      if (isCollection(o))
        o.addIn(s, n);
      else if (o === void 0 && this.schema)
        this.set(r, collectionFromPath(this.schema, s, n));
      else
        throw new Error(`Expected YAML collection at ${r}. Remaining path: ${s}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(e) {
    const [n, ...r] = e;
    if (r.length === 0)
      return this.delete(n);
    const s = this.get(n, !0);
    if (isCollection(s))
      return s.deleteIn(r);
    throw new Error(`Expected YAML collection at ${n}. Remaining path: ${r}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(e, n) {
    const [r, ...s] = e, o = this.get(r, !0);
    return s.length === 0 ? !n && isScalar(o) ? o.value : o : isCollection(o) ? o.getIn(s, n) : void 0;
  }
  hasAllNullValues(e) {
    return this.items.every((n) => {
      if (!isPair(n))
        return !1;
      const r = n.value;
      return r == null || e && isScalar(r) && r.value == null && !r.commentBefore && !r.comment && !r.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(e) {
    const [n, ...r] = e;
    if (r.length === 0)
      return this.has(n);
    const s = this.get(n, !0);
    return isCollection(s) ? s.hasIn(r) : !1;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(e, n) {
    const [r, ...s] = e;
    if (s.length === 0)
      this.set(r, n);
    else {
      const o = this.get(r, !0);
      if (isCollection(o))
        o.setIn(s, n);
      else if (o === void 0 && this.schema)
        this.set(r, collectionFromPath(this.schema, s, n));
      else
        throw new Error(`Expected YAML collection at ${r}. Remaining path: ${s}`);
    }
  }
}
const stringifyComment = (t) => t.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(t, e) {
  return /^\n+$/.test(t) ? t.substring(1) : e ? t.replace(/^(?! *$)/gm, e) : t;
}
const lineComment = (t, e, n) => t.endsWith(`
`) ? indentComment(n, e) : n.includes(`
`) ? `
` + indentComment(n, e) : (t.endsWith(" ") ? "" : " ") + n, FOLD_FLOW = "flow", FOLD_BLOCK = "block", FOLD_QUOTED = "quoted";
function foldFlowLines(t, e, n = "flow", { indentAtStart: r, lineWidth: s = 80, minContentWidth: o = 20, onFold: i, onOverflow: u } = {}) {
  if (!s || s < 0)
    return t;
  s < o && (o = 0);
  const l = Math.max(1 + o, 1 + s - e.length);
  if (t.length <= l)
    return t;
  const a = [], c = {};
  let f = s - e.length;
  typeof r == "number" && (r > s - Math.max(2, o) ? a.push(0) : f = s - r);
  let d, p, g = !1, h = -1, m = -1, y = -1;
  n === FOLD_BLOCK && (h = consumeMoreIndentedLines(t, h, e.length), h !== -1 && (f = h + l));
  for (let _; _ = t[h += 1]; ) {
    if (n === FOLD_QUOTED && _ === "\\") {
      switch (m = h, t[h + 1]) {
        case "x":
          h += 3;
          break;
        case "u":
          h += 5;
          break;
        case "U":
          h += 9;
          break;
        default:
          h += 1;
      }
      y = h;
    }
    if (_ === `
`)
      n === FOLD_BLOCK && (h = consumeMoreIndentedLines(t, h, e.length)), f = h + e.length + l, d = void 0;
    else {
      if (_ === " " && p && p !== " " && p !== `
` && p !== "	") {
        const E = t[h + 1];
        E && E !== " " && E !== `
` && E !== "	" && (d = h);
      }
      if (h >= f)
        if (d)
          a.push(d), f = d + l, d = void 0;
        else if (n === FOLD_QUOTED) {
          for (; p === " " || p === "	"; )
            p = _, _ = t[h += 1], g = !0;
          const E = h > y + 1 ? h - 2 : m - 1;
          if (c[E])
            return t;
          a.push(E), c[E] = !0, f = E + l, d = void 0;
        } else
          g = !0;
    }
    p = _;
  }
  if (g && u && u(), a.length === 0)
    return t;
  i && i();
  let b = t.slice(0, a[0]);
  for (let _ = 0; _ < a.length; ++_) {
    const E = a[_], w = a[_ + 1] || t.length;
    E === 0 ? b = `
${e}${t.slice(0, w)}` : (n === FOLD_QUOTED && c[E] && (b += `${t[E]}\\`), b += `
${e}${t.slice(E + 1, w)}`);
  }
  return b;
}
function consumeMoreIndentedLines(t, e, n) {
  let r = e, s = e + 1, o = t[s];
  for (; o === " " || o === "	"; )
    if (e < s + n)
      o = t[++e];
    else {
      do
        o = t[++e];
      while (o && o !== `
`);
      r = e, s = e + 1, o = t[s];
    }
  return r;
}
const getFoldOptions = (t, e) => ({
  indentAtStart: e ? t.indent.length : t.indentAtStart,
  lineWidth: t.options.lineWidth,
  minContentWidth: t.options.minContentWidth
}), containsDocumentMarker = (t) => /^(%|---|\.\.\.)/m.test(t);
function lineLengthOverLimit(t, e, n) {
  if (!e || e < 0)
    return !1;
  const r = e - n, s = t.length;
  if (s <= r)
    return !1;
  for (let o = 0, i = 0; o < s; ++o)
    if (t[o] === `
`) {
      if (o - i > r)
        return !0;
      if (i = o + 1, s - i <= r)
        return !1;
    }
  return !0;
}
function doubleQuotedString(t, e) {
  const n = JSON.stringify(t);
  if (e.options.doubleQuotedAsJSON)
    return n;
  const { implicitKey: r } = e, s = e.options.doubleQuotedMinMultiLineLength, o = e.indent || (containsDocumentMarker(t) ? "  " : "");
  let i = "", u = 0;
  for (let l = 0, a = n[l]; a; a = n[++l])
    if (a === " " && n[l + 1] === "\\" && n[l + 2] === "n" && (i += n.slice(u, l) + "\\ ", l += 1, u = l, a = "\\"), a === "\\")
      switch (n[l + 1]) {
        case "u":
          {
            i += n.slice(u, l);
            const c = n.substr(l + 2, 4);
            switch (c) {
              case "0000":
                i += "\\0";
                break;
              case "0007":
                i += "\\a";
                break;
              case "000b":
                i += "\\v";
                break;
              case "001b":
                i += "\\e";
                break;
              case "0085":
                i += "\\N";
                break;
              case "00a0":
                i += "\\_";
                break;
              case "2028":
                i += "\\L";
                break;
              case "2029":
                i += "\\P";
                break;
              default:
                c.substr(0, 2) === "00" ? i += "\\x" + c.substr(2) : i += n.substr(l, 6);
            }
            l += 5, u = l + 1;
          }
          break;
        case "n":
          if (r || n[l + 2] === '"' || n.length < s)
            l += 1;
          else {
            for (i += n.slice(u, l) + `

`; n[l + 2] === "\\" && n[l + 3] === "n" && n[l + 4] !== '"'; )
              i += `
`, l += 2;
            i += o, n[l + 2] === " " && (i += "\\"), l += 1, u = l + 1;
          }
          break;
        default:
          l += 1;
      }
  return i = u ? i + n.slice(u) : n, r ? i : foldFlowLines(i, o, FOLD_QUOTED, getFoldOptions(e, !1));
}
function singleQuotedString(t, e) {
  if (e.options.singleQuote === !1 || e.implicitKey && t.includes(`
`) || /[ \t]\n|\n[ \t]/.test(t))
    return doubleQuotedString(t, e);
  const n = e.indent || (containsDocumentMarker(t) ? "  " : ""), r = "'" + t.replace(/'/g, "''").replace(/\n+/g, `$&
${n}`) + "'";
  return e.implicitKey ? r : foldFlowLines(r, n, FOLD_FLOW, getFoldOptions(e, !1));
}
function quotedString(t, e) {
  const { singleQuote: n } = e.options;
  let r;
  if (n === !1)
    r = doubleQuotedString;
  else {
    const s = t.includes('"'), o = t.includes("'");
    s && !o ? r = singleQuotedString : o && !s ? r = doubleQuotedString : r = n ? singleQuotedString : doubleQuotedString;
  }
  return r(t, e);
}
let blockEndNewlines;
try {
  blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
} catch {
  blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment: t, type: e, value: n }, r, s, o) {
  const { blockQuote: i, commentString: u, lineWidth: l } = r.options;
  if (!i || /\n[\t ]+$/.test(n))
    return quotedString(n, r);
  const a = r.indent || (r.forceBlockIndent || containsDocumentMarker(n) ? "  " : ""), c = i === "literal" ? !0 : i === "folded" || e === Scalar.BLOCK_FOLDED ? !1 : e === Scalar.BLOCK_LITERAL ? !0 : !lineLengthOverLimit(n, l, a.length);
  if (!n)
    return c ? `|
` : `>
`;
  let f, d;
  for (d = n.length; d > 0; --d) {
    const w = n[d - 1];
    if (w !== `
` && w !== "	" && w !== " ")
      break;
  }
  let p = n.substring(d);
  const g = p.indexOf(`
`);
  g === -1 ? f = "-" : n === p || g !== p.length - 1 ? (f = "+", o && o()) : f = "", p && (n = n.slice(0, -p.length), p[p.length - 1] === `
` && (p = p.slice(0, -1)), p = p.replace(blockEndNewlines, `$&${a}`));
  let h = !1, m, y = -1;
  for (m = 0; m < n.length; ++m) {
    const w = n[m];
    if (w === " ")
      h = !0;
    else if (w === `
`)
      y = m;
    else
      break;
  }
  let b = n.substring(0, y < m ? y + 1 : m);
  b && (n = n.substring(b.length), b = b.replace(/\n+/g, `$&${a}`));
  let E = (h ? a ? "2" : "1" : "") + f;
  if (t && (E += " " + u(t.replace(/ ?[\r\n]+/g, " ")), s && s()), !c) {
    const w = n.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${a}`);
    let M = !1;
    const v = getFoldOptions(r, !0);
    i !== "folded" && e !== Scalar.BLOCK_FOLDED && (v.onOverflow = () => {
      M = !0;
    });
    const I = foldFlowLines(`${b}${w}${p}`, a, FOLD_BLOCK, v);
    if (!M)
      return `>${E}
${a}${I}`;
  }
  return n = n.replace(/\n+/g, `$&${a}`), `|${E}
${a}${b}${n}${p}`;
}
function plainString(t, e, n, r) {
  const { type: s, value: o } = t, { actualString: i, implicitKey: u, indent: l, indentStep: a, inFlow: c } = e;
  if (u && o.includes(`
`) || c && /[[\]{},]/.test(o))
    return quotedString(o, e);
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(o))
    return u || c || !o.includes(`
`) ? quotedString(o, e) : blockString(t, e, n, r);
  if (!u && !c && s !== Scalar.PLAIN && o.includes(`
`))
    return blockString(t, e, n, r);
  if (containsDocumentMarker(o)) {
    if (l === "")
      return e.forceBlockIndent = !0, blockString(t, e, n, r);
    if (u && l === a)
      return quotedString(o, e);
  }
  const f = o.replace(/\n+/g, `$&
${l}`);
  if (i) {
    const d = (h) => h.default && h.tag !== "tag:yaml.org,2002:str" && h.test?.test(f), { compat: p, tags: g } = e.doc.schema;
    if (g.some(d) || p?.some(d))
      return quotedString(o, e);
  }
  return u ? f : foldFlowLines(f, l, FOLD_FLOW, getFoldOptions(e, !1));
}
function stringifyString(t, e, n, r) {
  const { implicitKey: s, inFlow: o } = e, i = typeof t.value == "string" ? t : Object.assign({}, t, { value: String(t.value) });
  let { type: u } = t;
  u !== Scalar.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(i.value) && (u = Scalar.QUOTE_DOUBLE);
  const l = (c) => {
    switch (c) {
      case Scalar.BLOCK_FOLDED:
      case Scalar.BLOCK_LITERAL:
        return s || o ? quotedString(i.value, e) : blockString(i, e, n, r);
      case Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(i.value, e);
      case Scalar.QUOTE_SINGLE:
        return singleQuotedString(i.value, e);
      case Scalar.PLAIN:
        return plainString(i, e, n, r);
      default:
        return null;
    }
  };
  let a = l(u);
  if (a === null) {
    const { defaultKeyType: c, defaultStringType: f } = e.options, d = s && c || f;
    if (a = l(d), a === null)
      throw new Error(`Unsupported default string type ${d}`);
  }
  return a;
}
function createStringifyContext(t, e) {
  const n = Object.assign({
    blockQuote: !0,
    commentString: stringifyComment,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: !1,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: !0,
    indentSeq: !0,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: !1,
    singleQuote: null,
    trueStr: "true",
    verifyAliasOrder: !0
  }, t.schema.toStringOptions, e);
  let r;
  switch (n.collectionStyle) {
    case "block":
      r = !1;
      break;
    case "flow":
      r = !0;
      break;
    default:
      r = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc: t,
    flowCollectionPadding: n.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof n.indent == "number" ? " ".repeat(n.indent) : "  ",
    inFlow: r,
    options: n
  };
}
function getTagObject(t, e) {
  if (e.tag) {
    const s = t.filter((o) => o.tag === e.tag);
    if (s.length > 0)
      return s.find((o) => o.format === e.format) ?? s[0];
  }
  let n, r;
  if (isScalar(e)) {
    r = e.value;
    let s = t.filter((o) => o.identify?.(r));
    if (s.length > 1) {
      const o = s.filter((i) => i.test);
      o.length > 0 && (s = o);
    }
    n = s.find((o) => o.format === e.format) ?? s.find((o) => !o.format);
  } else
    r = e, n = t.find((s) => s.nodeClass && r instanceof s.nodeClass);
  if (!n) {
    const s = r?.constructor?.name ?? (r === null ? "null" : typeof r);
    throw new Error(`Tag not resolved for ${s} value`);
  }
  return n;
}
function stringifyProps(t, e, { anchors: n, doc: r }) {
  if (!r.directives)
    return "";
  const s = [], o = (isScalar(t) || isCollection(t)) && t.anchor;
  o && anchorIsValid(o) && (n.add(o), s.push(`&${o}`));
  const i = t.tag ?? (e.default ? null : e.tag);
  return i && s.push(r.directives.tagString(i)), s.join(" ");
}
function stringify(t, e, n, r) {
  if (isPair(t))
    return t.toString(e, n, r);
  if (isAlias(t)) {
    if (e.doc.directives)
      return t.toString(e);
    if (e.resolvedAliases?.has(t))
      throw new TypeError("Cannot stringify circular structure without alias nodes");
    e.resolvedAliases ? e.resolvedAliases.add(t) : e.resolvedAliases = /* @__PURE__ */ new Set([t]), t = t.resolve(e.doc);
  }
  let s;
  const o = isNode(t) ? t : e.doc.createNode(t, { onTagObj: (l) => s = l });
  s ?? (s = getTagObject(e.doc.schema.tags, o));
  const i = stringifyProps(o, s, e);
  i.length > 0 && (e.indentAtStart = (e.indentAtStart ?? 0) + i.length + 1);
  const u = typeof s.stringify == "function" ? s.stringify(o, e, n, r) : isScalar(o) ? stringifyString(o, e, n, r) : o.toString(e, n, r);
  return i ? isScalar(o) || u[0] === "{" || u[0] === "[" ? `${i} ${u}` : `${i}
${e.indent}${u}` : u;
}
function stringifyPair({ key: t, value: e }, n, r, s) {
  const { allNullValues: o, doc: i, indent: u, indentStep: l, options: { commentString: a, indentSeq: c, simpleKeys: f } } = n;
  let d = isNode(t) && t.comment || null;
  if (f) {
    if (d)
      throw new Error("With simple keys, key nodes cannot have comments");
    if (isCollection(t) || !isNode(t) && typeof t == "object") {
      const v = "With simple keys, collection cannot be used as a key value";
      throw new Error(v);
    }
  }
  let p = !f && (!t || d && e == null && !n.inFlow || isCollection(t) || (isScalar(t) ? t.type === Scalar.BLOCK_FOLDED || t.type === Scalar.BLOCK_LITERAL : typeof t == "object"));
  n = Object.assign({}, n, {
    allNullValues: !1,
    implicitKey: !p && (f || !o),
    indent: u + l
  });
  let g = !1, h = !1, m = stringify(t, n, () => g = !0, () => h = !0);
  if (!p && !n.inFlow && m.length > 1024) {
    if (f)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    p = !0;
  }
  if (n.inFlow) {
    if (o || e == null)
      return g && r && r(), m === "" ? "?" : p ? `? ${m}` : m;
  } else if (o && !f || e == null && p)
    return m = `? ${m}`, d && !g ? m += lineComment(m, n.indent, a(d)) : h && s && s(), m;
  g && (d = null), p ? (d && (m += lineComment(m, n.indent, a(d))), m = `? ${m}
${u}:`) : (m = `${m}:`, d && (m += lineComment(m, n.indent, a(d))));
  let y, b, _;
  isNode(e) ? (y = !!e.spaceBefore, b = e.commentBefore, _ = e.comment) : (y = !1, b = null, _ = null, e && typeof e == "object" && (e = i.createNode(e))), n.implicitKey = !1, !p && !d && isScalar(e) && (n.indentAtStart = m.length + 1), h = !1, !c && l.length >= 2 && !n.inFlow && !p && isSeq(e) && !e.flow && !e.tag && !e.anchor && (n.indent = n.indent.substring(2));
  let E = !1;
  const w = stringify(e, n, () => E = !0, () => h = !0);
  let M = " ";
  if (d || y || b) {
    if (M = y ? `
` : "", b) {
      const v = a(b);
      M += `
${indentComment(v, n.indent)}`;
    }
    w === "" && !n.inFlow ? M === `
` && _ && (M = `

`) : M += `
${n.indent}`;
  } else if (!p && isCollection(e)) {
    const v = w[0], I = w.indexOf(`
`), T = I !== -1, S = n.inFlow ?? e.flow ?? e.items.length === 0;
    if (T || !S) {
      let k = !1;
      if (T && (v === "&" || v === "!")) {
        let O = w.indexOf(" ");
        v === "&" && O !== -1 && O < I && w[O + 1] === "!" && (O = w.indexOf(" ", O + 1)), (O === -1 || I < O) && (k = !0);
      }
      k || (M = `
${n.indent}`);
    }
  } else (w === "" || w[0] === `
`) && (M = "");
  return m += M + w, n.inFlow ? E && r && r() : _ && !E ? m += lineComment(m, n.indent, a(_)) : h && s && s(), m;
}
function warn(t, e) {
  (t === "debug" || t === "warn") && console.warn(e);
}
const MERGE_KEY = "<<", merge = {
  identify: (t) => t === MERGE_KEY || typeof t == "symbol" && t.description === MERGE_KEY,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
    addToJSMap: addMergeToJSMap
  }),
  stringify: () => MERGE_KEY
}, isMergeKey = (t, e) => (merge.identify(e) || isScalar(e) && (!e.type || e.type === Scalar.PLAIN) && merge.identify(e.value)) && t?.doc.schema.tags.some((n) => n.tag === merge.tag && n.default);
function addMergeToJSMap(t, e, n) {
  if (n = t && isAlias(n) ? n.resolve(t.doc) : n, isSeq(n))
    for (const r of n.items)
      mergeValue(t, e, r);
  else if (Array.isArray(n))
    for (const r of n)
      mergeValue(t, e, r);
  else
    mergeValue(t, e, n);
}
function mergeValue(t, e, n) {
  const r = t && isAlias(n) ? n.resolve(t.doc) : n;
  if (!isMap(r))
    throw new Error("Merge sources must be maps or map aliases");
  const s = r.toJSON(null, t, Map);
  for (const [o, i] of s)
    e instanceof Map ? e.has(o) || e.set(o, i) : e instanceof Set ? e.add(o) : Object.prototype.hasOwnProperty.call(e, o) || Object.defineProperty(e, o, {
      value: i,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  return e;
}
function addPairToJSMap(t, e, { key: n, value: r }) {
  if (isNode(n) && n.addToJSMap)
    n.addToJSMap(t, e, r);
  else if (isMergeKey(t, n))
    addMergeToJSMap(t, e, r);
  else {
    const s = toJS(n, "", t);
    if (e instanceof Map)
      e.set(s, toJS(r, s, t));
    else if (e instanceof Set)
      e.add(s);
    else {
      const o = stringifyKey(n, s, t), i = toJS(r, o, t);
      o in e ? Object.defineProperty(e, o, {
        value: i,
        writable: !0,
        enumerable: !0,
        configurable: !0
      }) : e[o] = i;
    }
  }
  return e;
}
function stringifyKey(t, e, n) {
  if (e === null)
    return "";
  if (typeof e != "object")
    return String(e);
  if (isNode(t) && n?.doc) {
    const r = createStringifyContext(n.doc, {});
    r.anchors = /* @__PURE__ */ new Set();
    for (const o of n.anchors.keys())
      r.anchors.add(o.anchor);
    r.inFlow = !0, r.inStringifyKey = !0;
    const s = t.toString(r);
    if (!n.mapKeyWarned) {
      let o = JSON.stringify(s);
      o.length > 40 && (o = o.substring(0, 36) + '..."'), warn(n.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${o}. Set mapAsMap: true to use object keys.`), n.mapKeyWarned = !0;
    }
    return s;
  }
  return JSON.stringify(e);
}
function createPair(t, e, n) {
  const r = createNode(t, void 0, n), s = createNode(e, void 0, n);
  return new Pair(r, s);
}
class Pair {
  constructor(e, n = null) {
    Object.defineProperty(this, NODE_TYPE, { value: PAIR }), this.key = e, this.value = n;
  }
  clone(e) {
    let { key: n, value: r } = this;
    return isNode(n) && (n = n.clone(e)), isNode(r) && (r = r.clone(e)), new Pair(n, r);
  }
  toJSON(e, n) {
    const r = n?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    return addPairToJSMap(n, r, this);
  }
  toString(e, n, r) {
    return e?.doc ? stringifyPair(this, e, n, r) : JSON.stringify(this);
  }
}
function stringifyCollection(t, e, n) {
  return (e.inFlow ?? t.flow ? stringifyFlowCollection : stringifyBlockCollection)(t, e, n);
}
function stringifyBlockCollection({ comment: t, items: e }, n, { blockItemPrefix: r, flowChars: s, itemIndent: o, onChompKeep: i, onComment: u }) {
  const { indent: l, options: { commentString: a } } = n, c = Object.assign({}, n, { indent: o, type: null });
  let f = !1;
  const d = [];
  for (let g = 0; g < e.length; ++g) {
    const h = e[g];
    let m = null;
    if (isNode(h))
      !f && h.spaceBefore && d.push(""), addCommentBefore(n, d, h.commentBefore, f), h.comment && (m = h.comment);
    else if (isPair(h)) {
      const b = isNode(h.key) ? h.key : null;
      b && (!f && b.spaceBefore && d.push(""), addCommentBefore(n, d, b.commentBefore, f));
    }
    f = !1;
    let y = stringify(h, c, () => m = null, () => f = !0);
    m && (y += lineComment(y, o, a(m))), f && m && (f = !1), d.push(r + y);
  }
  let p;
  if (d.length === 0)
    p = s.start + s.end;
  else {
    p = d[0];
    for (let g = 1; g < d.length; ++g) {
      const h = d[g];
      p += h ? `
${l}${h}` : `
`;
    }
  }
  return t ? (p += `
` + indentComment(a(t), l), u && u()) : f && i && i(), p;
}
function stringifyFlowCollection({ items: t }, e, { flowChars: n, itemIndent: r }) {
  const { indent: s, indentStep: o, flowCollectionPadding: i, options: { commentString: u } } = e;
  r += o;
  const l = Object.assign({}, e, {
    indent: r,
    inFlow: !0,
    type: null
  });
  let a = !1, c = 0;
  const f = [];
  for (let g = 0; g < t.length; ++g) {
    const h = t[g];
    let m = null;
    if (isNode(h))
      h.spaceBefore && f.push(""), addCommentBefore(e, f, h.commentBefore, !1), h.comment && (m = h.comment);
    else if (isPair(h)) {
      const b = isNode(h.key) ? h.key : null;
      b && (b.spaceBefore && f.push(""), addCommentBefore(e, f, b.commentBefore, !1), b.comment && (a = !0));
      const _ = isNode(h.value) ? h.value : null;
      _ ? (_.comment && (m = _.comment), _.commentBefore && (a = !0)) : h.value == null && b?.comment && (m = b.comment);
    }
    m && (a = !0);
    let y = stringify(h, l, () => m = null);
    g < t.length - 1 && (y += ","), m && (y += lineComment(y, r, u(m))), !a && (f.length > c || y.includes(`
`)) && (a = !0), f.push(y), c = f.length;
  }
  const { start: d, end: p } = n;
  if (f.length === 0)
    return d + p;
  if (!a) {
    const g = f.reduce((h, m) => h + m.length + 2, 2);
    a = e.options.lineWidth > 0 && g > e.options.lineWidth;
  }
  if (a) {
    let g = d;
    for (const h of f)
      g += h ? `
${o}${s}${h}` : `
`;
    return `${g}
${s}${p}`;
  } else
    return `${d}${i}${f.join(" ")}${i}${p}`;
}
function addCommentBefore({ indent: t, options: { commentString: e } }, n, r, s) {
  if (r && s && (r = r.replace(/^\n+/, "")), r) {
    const o = indentComment(e(r), t);
    n.push(o.trimStart());
  }
}
function findPair(t, e) {
  const n = isScalar(e) ? e.value : e;
  for (const r of t)
    if (isPair(r) && (r.key === e || r.key === n || isScalar(r.key) && r.key.value === n))
      return r;
}
class YAMLMap extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(e) {
    super(MAP, e), this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(e, n, r) {
    const { keepUndefined: s, replacer: o } = r, i = new this(e), u = (l, a) => {
      if (typeof o == "function")
        a = o.call(n, l, a);
      else if (Array.isArray(o) && !o.includes(l))
        return;
      (a !== void 0 || s) && i.items.push(createPair(l, a, r));
    };
    if (n instanceof Map)
      for (const [l, a] of n)
        u(l, a);
    else if (n && typeof n == "object")
      for (const l of Object.keys(n))
        u(l, n[l]);
    return typeof e.sortMapEntries == "function" && i.items.sort(e.sortMapEntries), i;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(e, n) {
    let r;
    isPair(e) ? r = e : !e || typeof e != "object" || !("key" in e) ? r = new Pair(e, e?.value) : r = new Pair(e.key, e.value);
    const s = findPair(this.items, r.key), o = this.schema?.sortMapEntries;
    if (s) {
      if (!n)
        throw new Error(`Key ${r.key} already set`);
      isScalar(s.value) && isScalarValue(r.value) ? s.value.value = r.value : s.value = r.value;
    } else if (o) {
      const i = this.items.findIndex((u) => o(r, u) < 0);
      i === -1 ? this.items.push(r) : this.items.splice(i, 0, r);
    } else
      this.items.push(r);
  }
  delete(e) {
    const n = findPair(this.items, e);
    return n ? this.items.splice(this.items.indexOf(n), 1).length > 0 : !1;
  }
  get(e, n) {
    const s = findPair(this.items, e)?.value;
    return (!n && isScalar(s) ? s.value : s) ?? void 0;
  }
  has(e) {
    return !!findPair(this.items, e);
  }
  set(e, n) {
    this.add(new Pair(e, n), !0);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(e, n, r) {
    const s = r ? new r() : n?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    n?.onCreate && n.onCreate(s);
    for (const o of this.items)
      addPairToJSMap(n, s, o);
    return s;
  }
  toString(e, n, r) {
    if (!e)
      return JSON.stringify(this);
    for (const s of this.items)
      if (!isPair(s))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(s)} instead`);
    return !e.allNullValues && this.hasAllNullValues(!1) && (e = Object.assign({}, e, { allNullValues: !0 })), stringifyCollection(this, e, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: e.indent || "",
      onChompKeep: r,
      onComment: n
    });
  }
}
class YAMLSeq extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(e) {
    super(SEQ, e), this.items = [];
  }
  add(e) {
    this.items.push(e);
  }
  /**
   * Removes a value from the collection.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   *
   * @returns `true` if the item was found and removed.
   */
  delete(e) {
    const n = asItemIndex(e);
    return typeof n != "number" ? !1 : this.items.splice(n, 1).length > 0;
  }
  get(e, n) {
    const r = asItemIndex(e);
    if (typeof r != "number")
      return;
    const s = this.items[r];
    return !n && isScalar(s) ? s.value : s;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(e) {
    const n = asItemIndex(e);
    return typeof n == "number" && n < this.items.length;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   *
   * If `key` does not contain a representation of an integer, this will throw.
   * It may be wrapped in a `Scalar`.
   */
  set(e, n) {
    const r = asItemIndex(e);
    if (typeof r != "number")
      throw new Error(`Expected a valid index, not ${e}.`);
    const s = this.items[r];
    isScalar(s) && isScalarValue(n) ? s.value = n : this.items[r] = n;
  }
  toJSON(e, n) {
    const r = [];
    n?.onCreate && n.onCreate(r);
    let s = 0;
    for (const o of this.items)
      r.push(toJS(o, String(s++), n));
    return r;
  }
  toString(e, n, r) {
    return e ? stringifyCollection(this, e, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (e.indent || "") + "  ",
      onChompKeep: r,
      onComment: n
    }) : JSON.stringify(this);
  }
  static from(e, n, r) {
    const { replacer: s } = r, o = new this(e);
    if (n && Symbol.iterator in Object(n)) {
      let i = 0;
      for (let u of n) {
        if (typeof s == "function") {
          const l = n instanceof Set ? u : String(i++);
          u = s.call(n, l, u);
        }
        o.items.push(createNode(u, void 0, r));
      }
    }
    return o;
  }
}
function asItemIndex(t) {
  let e = isScalar(t) ? t.value : t;
  return e && typeof e == "string" && (e = Number(e)), typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null;
}
function createPairs(t, e, n) {
  const { replacer: r } = n, s = new YAMLSeq(t);
  s.tag = "tag:yaml.org,2002:pairs";
  let o = 0;
  if (e && Symbol.iterator in Object(e))
    for (let i of e) {
      typeof r == "function" && (i = r.call(e, String(o++), i));
      let u, l;
      if (Array.isArray(i))
        if (i.length === 2)
          u = i[0], l = i[1];
        else
          throw new TypeError(`Expected [key, value] tuple: ${i}`);
      else if (i && i instanceof Object) {
        const a = Object.keys(i);
        if (a.length === 1)
          u = a[0], l = i[u];
        else
          throw new TypeError(`Expected tuple with one key, not ${a.length} keys`);
      } else
        u = i;
      s.items.push(createPair(u, l, n));
    }
  return s;
}
class YAMLOMap extends YAMLSeq {
  constructor() {
    super(), this.add = YAMLMap.prototype.add.bind(this), this.delete = YAMLMap.prototype.delete.bind(this), this.get = YAMLMap.prototype.get.bind(this), this.has = YAMLMap.prototype.has.bind(this), this.set = YAMLMap.prototype.set.bind(this), this.tag = YAMLOMap.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(e, n) {
    if (!n)
      return super.toJSON(e);
    const r = /* @__PURE__ */ new Map();
    n?.onCreate && n.onCreate(r);
    for (const s of this.items) {
      let o, i;
      if (isPair(s) ? (o = toJS(s.key, "", n), i = toJS(s.value, o, n)) : o = toJS(s, "", n), r.has(o))
        throw new Error("Ordered maps must not include duplicate keys");
      r.set(o, i);
    }
    return r;
  }
  static from(e, n, r) {
    const s = createPairs(e, n, r), o = new this();
    return o.items = s.items, o;
  }
}
YAMLOMap.tag = "tag:yaml.org,2002:omap";
class YAMLSet extends YAMLMap {
  constructor(e) {
    super(e), this.tag = YAMLSet.tag;
  }
  add(e) {
    let n;
    isPair(e) ? n = e : e && typeof e == "object" && "key" in e && "value" in e && e.value === null ? n = new Pair(e.key, null) : n = new Pair(e, null), findPair(this.items, n.key) || this.items.push(n);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(e, n) {
    const r = findPair(this.items, e);
    return !n && isPair(r) ? isScalar(r.key) ? r.key.value : r.key : r;
  }
  set(e, n) {
    if (typeof n != "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof n}`);
    const r = findPair(this.items, e);
    r && !n ? this.items.splice(this.items.indexOf(r), 1) : !r && n && this.items.push(new Pair(e));
  }
  toJSON(e, n) {
    return super.toJSON(e, n, Set);
  }
  toString(e, n, r) {
    if (!e)
      return JSON.stringify(this);
    if (this.hasAllNullValues(!0))
      return super.toString(Object.assign({}, e, { allNullValues: !0 }), n, r);
    throw new Error("Set items must all have null values");
  }
  static from(e, n, r) {
    const { replacer: s } = r, o = new this(e);
    if (n && Symbol.iterator in Object(n))
      for (let i of n)
        typeof s == "function" && (i = s.call(n, i, i)), o.items.push(createPair(i, null, r));
    return o;
  }
}
YAMLSet.tag = "tag:yaml.org,2002:set";
new Set("0123456789ABCDEFabcdef");
new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
new Set(",[]{}");
new Set(` ,[]{}
\r	`);
function decodeImplVars(t) {
  const e = {};
  for (const [n, r] of Object.entries(t.varInstances)) {
    const s = [];
    for (const o of r) {
      const i = t.varTypes[o[0]], u = t.variables[o[1]];
      let l = u.i, a = u.n;
      if (o.length > 2) {
        const f = [], d = [], p = (o.length - 2) / 2, g = o.slice(2, 2 + p);
        for (const h of g) {
          const m = t.subscripts[h];
          f.push(m.i), d.push(m.n);
        }
        l += `[${f.join(",")}]`, a += `[${d.join(",")}]`;
      }
      const c = {
        varId: l,
        varName: a,
        varType: i,
        varIndex: u.x,
        subscriptIndices: o.length > 2 ? o.slice(2 + (o.length - 2) / 2) : void 0
      };
      s.push(c);
    }
    e[n] = s;
  }
  return e;
}
function getImplVars(t) {
  const e = decodeImplVars(t), n = /* @__PURE__ */ new Map(), r = [];
  function s(o, i) {
    const u = [];
    for (const l of i) {
      if (l.varType === "lookup" || l.varType === "data")
        continue;
      const c = `ModelImpl_${l.varId}`;
      n.set(c, l), u.push(c);
    }
    r.push({
      title: o,
      fn: o,
      datasetKeys: u
    });
  }
  return s("initConstants", e.constants || []), s("initLevels", e.initVars || []), s("evalLevels", e.levelVars || []), s("evalAux", e.auxVars || []), {
    implVars: n,
    implVarGroups: r
  };
}
function getInputVars(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const r = n.varId, s = {
      inputId: n.inputId,
      varId: r,
      varName: n.varName,
      defaultValue: n.defaultValue,
      minValue: n.minValue,
      maxValue: n.maxValue,
      value: createInputValue(r, n.defaultValue)
    };
    e.set(r, s);
  }
  return e;
}
function setInputsForScenario(t, e) {
  function n(a, c) {
    c < a.minValue ? (console.warn(
      `WARNING: Scenario input value ${c} is < min value (${a.minValue}) for input '${a.varName}'`
    ), c = a.minValue) : c > a.maxValue && (console.warn(
      `WARNING: Scenario input value ${c} is > max value (${a.maxValue}) for input '${a.varName}'`
    ), c = a.maxValue), a.value.set(c);
  }
  function r(a) {
    a.value.reset();
  }
  function s(a) {
    a.value.set(a.minValue);
  }
  function o(a) {
    a.value.set(a.maxValue);
  }
  function i() {
    t.forEach(r);
  }
  function u() {
    t.forEach(s);
  }
  function l() {
    t.forEach(o);
  }
  switch (e.kind) {
    case "all-inputs": {
      switch (e.position) {
        case "at-default":
          i();
          break;
        case "at-minimum":
          u();
          break;
        case "at-maximum":
          l();
          break;
      }
      break;
    }
    case "input-settings": {
      i();
      for (const a of e.settings) {
        const c = t.get(a.inputVarId);
        if (c)
          switch (a.kind) {
            case "position":
              switch (a.position) {
                case "at-default":
                  r(c);
                  break;
                case "at-minimum":
                  s(c);
                  break;
                case "at-maximum":
                  o(c);
                  break;
                default:
                  assertNeverExports.assertNever(a.position);
              }
              break;
            case "value":
              n(c, a.value);
              break;
            default:
              assertNeverExports.assertNever(a);
          }
        else
          console.log(`No model input for scenario input ${a.inputVarId}`);
      }
      break;
    }
    default:
      assertNeverExports.assertNever(e);
  }
}
function getOutputVars(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const r = n.varId, s = datasetKeyForOutputVar(void 0, r);
    e.set(s, {
      datasetKey: s,
      sourceName: void 0,
      varId: r,
      varName: n.varName
    });
  }
  return e;
}
function datasetKeyForOutputVar(t, e) {
  return `Model_${e}`;
}
const inputSpecs = [{ inputId: "1", varId: "_urban_green_resilience", varName: "urban green resilience", defaultValue: 2, minValue: 0, maxValue: 2 }], outputSpecs = [{ varId: "_urban_green_status", varName: "urban green status" }, { varId: "_urban_population", varName: "urban population" }], encodedImplVars = { subscripts: [], variables: [{ n: "FINAL TIME", i: "_final_time", x: 1 }, { n: "INITIAL TIME", i: "_initial_time", x: 2 }, { n: "TIME STEP", i: "_time_step", x: 3 }, { n: "initial population", i: "_initial_population", x: 4 }, { n: "initial urban green status", i: "_initial_urban_green_status", x: 5 }, { n: "minimal development rate", i: "_minimal_development_rate", x: 6 }, { n: "minimal urban green deline rate", i: "_minimal_urban_green_deline_rate", x: 7 }, { n: "population sensitivity", i: "_population_sensitivity", x: 8 }, { n: "tourism decline rate", i: "_tourism_decline_rate", x: 9 }, { n: "urban green resilience", i: "_urban_green_resilience", x: 10 }, { n: "urban green sensitivity", i: "_urban_green_sensitivity", x: 11 }, { n: "urban green status", i: "_urban_green_status", x: 12 }, { n: "urban population", i: "_urban_population", x: 13 }, { n: "SAVEPER", i: "_saveper", x: 14 }, { n: "population decline decline", i: "_population_decline_decline", x: 15 }, { n: "urban green increase", i: "_urban_green_increase", x: 16 }, { n: "environmental impact", i: "_environmental_impact", x: 17 }, { n: "urban green decrease", i: "_urban_green_decrease", x: 18 }, { n: "impact on population development", i: "_impact_on_population_development", x: 19 }, { n: "population development", i: "_population_development", x: 20 }], varTypes: ["const", "level", "aux"], varInstances: { constants: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10]], lookupVars: [], dataVars: [], initVars: [[1, 11], [1, 12]], levelVars: [[1, 11], [1, 12]], auxVars: [[2, 13], [2, 14], [2, 15], [2, 16], [2, 17], [2, 18], [2, 19]] } }, modelSizeInBytes = 9898, dataSizeInBytes = 0, modelWorkerJs = '(function(){"use strict";var commonjsGlobal=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function getDefaultExportFromCjs(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var worker={},isObservable,hasRequiredIsObservable;function requireIsObservable(){return hasRequiredIsObservable||(hasRequiredIsObservable=1,isObservable=e=>e?typeof Symbol.observable=="symbol"&&typeof e[Symbol.observable]=="function"?e===e[Symbol.observable]():typeof e["@@observable"]=="function"?e===e["@@observable"]():!1:!1),isObservable}var common={},serializers={},hasRequiredSerializers;function requireSerializers(){if(hasRequiredSerializers)return serializers;hasRequiredSerializers=1,Object.defineProperty(serializers,"__esModule",{value:!0}),serializers.DefaultSerializer=serializers.extendSerializer=void 0;function e(t,n){const i=t.deserialize.bind(t),o=t.serialize.bind(t);return{deserialize(a){return n.deserialize(a,i)},serialize(a){return n.serialize(a,o)}}}serializers.extendSerializer=e;const s={deserialize(t){return Object.assign(Error(t.message),{name:t.name,stack:t.stack})},serialize(t){return{__error_marker:"$$error",message:t.message,name:t.name,stack:t.stack}}},r=t=>t&&typeof t=="object"&&"__error_marker"in t&&t.__error_marker==="$$error";return serializers.DefaultSerializer={deserialize(t){return r(t)?s.deserialize(t):t},serialize(t){return t instanceof Error?s.serialize(t):t}},serializers}var hasRequiredCommon;function requireCommon(){if(hasRequiredCommon)return common;hasRequiredCommon=1,Object.defineProperty(common,"__esModule",{value:!0}),common.serialize=common.deserialize=common.registerSerializer=void 0;const e=requireSerializers();let s=e.DefaultSerializer;function r(i){s=e.extendSerializer(s,i)}common.registerSerializer=r;function t(i){return s.deserialize(i)}common.deserialize=t;function n(i){return s.serialize(i)}return common.serialize=n,common}var transferable={},symbols={},hasRequiredSymbols;function requireSymbols(){return hasRequiredSymbols||(hasRequiredSymbols=1,Object.defineProperty(symbols,"__esModule",{value:!0}),symbols.$worker=symbols.$transferable=symbols.$terminate=symbols.$events=symbols.$errors=void 0,symbols.$errors=Symbol("thread.errors"),symbols.$events=Symbol("thread.events"),symbols.$terminate=Symbol("thread.terminate"),symbols.$transferable=Symbol("thread.transferable"),symbols.$worker=Symbol("thread.worker")),symbols}var hasRequiredTransferable;function requireTransferable(){if(hasRequiredTransferable)return transferable;hasRequiredTransferable=1,Object.defineProperty(transferable,"__esModule",{value:!0}),transferable.Transfer=transferable.isTransferDescriptor=void 0;const e=requireSymbols();function s(n){return!(!n||typeof n!="object")}function r(n){return n&&typeof n=="object"&&n[e.$transferable]}transferable.isTransferDescriptor=r;function t(n,i){if(!i){if(!s(n))throw Error();i=[n]}return{[e.$transferable]:!0,send:n,transferables:i}}return transferable.Transfer=t,transferable}var messages={},hasRequiredMessages;function requireMessages(){return hasRequiredMessages||(hasRequiredMessages=1,(function(e){Object.defineProperty(e,"__esModule",{value:!0}),e.WorkerMessageType=e.MasterMessageType=void 0,(function(s){s.cancel="cancel",s.run="run"})(e.MasterMessageType||(e.MasterMessageType={})),(function(s){s.error="error",s.init="init",s.result="result",s.running="running",s.uncaughtError="uncaughtError"})(e.WorkerMessageType||(e.WorkerMessageType={}))})(messages)),messages}var implementation={},implementation_browser={},hasRequiredImplementation_browser;function requireImplementation_browser(){if(hasRequiredImplementation_browser)return implementation_browser;hasRequiredImplementation_browser=1,Object.defineProperty(implementation_browser,"__esModule",{value:!0});const e=function(){const n=typeof self<"u"&&typeof Window<"u"&&self instanceof Window;return!!(typeof self<"u"&&self.postMessage&&!n)},s=function(n,i){self.postMessage(n,i)},r=function(n){const i=a=>{n(a.data)},o=()=>{self.removeEventListener("message",i)};return self.addEventListener("message",i),o};return implementation_browser.default={isWorkerRuntime:e,postMessageToMaster:s,subscribeToMasterMessages:r},implementation_browser}var implementation_tinyWorker={},hasRequiredImplementation_tinyWorker;function requireImplementation_tinyWorker(){if(hasRequiredImplementation_tinyWorker)return implementation_tinyWorker;hasRequiredImplementation_tinyWorker=1,Object.defineProperty(implementation_tinyWorker,"__esModule",{value:!0}),typeof self>"u"&&(commonjsGlobal.self=commonjsGlobal);const e=function(){return!!(typeof self<"u"&&self.postMessage)},s=function(o){self.postMessage(o)};let r=!1;const t=new Set,n=function(o){return r||(self.addEventListener("message",(c=>{t.forEach(l=>l(c.data))})),r=!0),t.add(o),()=>t.delete(o)};return implementation_tinyWorker.default={isWorkerRuntime:e,postMessageToMaster:s,subscribeToMasterMessages:n},implementation_tinyWorker}var implementation_worker_threads={},worker_threads={},hasRequiredWorker_threads;function requireWorker_threads(){if(hasRequiredWorker_threads)return worker_threads;hasRequiredWorker_threads=1,Object.defineProperty(worker_threads,"__esModule",{value:!0});let implementation;function selectImplementation(){return typeof __non_webpack_require__=="function"?__non_webpack_require__("worker_threads"):eval("require")("worker_threads")}function getImplementation(){return implementation||(implementation=selectImplementation()),implementation}return worker_threads.default=getImplementation,worker_threads}var hasRequiredImplementation_worker_threads;function requireImplementation_worker_threads(){if(hasRequiredImplementation_worker_threads)return implementation_worker_threads;hasRequiredImplementation_worker_threads=1;var e=implementation_worker_threads&&implementation_worker_threads.__importDefault||function(a){return a&&a.__esModule?a:{default:a}};Object.defineProperty(implementation_worker_threads,"__esModule",{value:!0});const s=e(requireWorker_threads());function r(a){if(!a)throw Error("Invariant violation: MessagePort to parent is not available.");return a}const t=function(){return!s.default().isMainThread},n=function(c,l){r(s.default().parentPort).postMessage(c,l)},i=function(c){const l=s.default().parentPort;if(!l)throw Error("Invariant violation: MessagePort to parent is not available.");const h=p=>{c(p)},v=()=>{r(l).off("message",h)};return r(l).on("message",h),v};function o(){s.default()}return implementation_worker_threads.default={isWorkerRuntime:t,postMessageToMaster:n,subscribeToMasterMessages:i,testImplementation:o},implementation_worker_threads}var hasRequiredImplementation;function requireImplementation(){if(hasRequiredImplementation)return implementation;hasRequiredImplementation=1;var e=implementation&&implementation.__importDefault||function(o){return o&&o.__esModule?o:{default:o}};Object.defineProperty(implementation,"__esModule",{value:!0});const s=e(requireImplementation_browser()),r=e(requireImplementation_tinyWorker()),t=e(requireImplementation_worker_threads()),n=typeof process<"u"&&process.arch!=="browser"&&"pid"in process;function i(){try{return t.default.testImplementation(),t.default}catch{return r.default}}return implementation.default=n?i():s.default,implementation}var hasRequiredWorker;function requireWorker(){return hasRequiredWorker||(hasRequiredWorker=1,(function(e){var s=worker&&worker.__awaiter||function(u,f,d,b){function T(k){return k instanceof d?k:new d(function(R){R(k)})}return new(d||(d=Promise))(function(k,R){function V(z){try{W(b.next(z))}catch(q){R(q)}}function A(z){try{W(b.throw(z))}catch(q){R(q)}}function W(z){z.done?k(z.value):T(z.value).then(V,A)}W((b=b.apply(u,f||[])).next())})},r=worker&&worker.__importDefault||function(u){return u&&u.__esModule?u:{default:u}};Object.defineProperty(e,"__esModule",{value:!0}),e.expose=e.isWorkerRuntime=e.Transfer=e.registerSerializer=void 0;const t=r(requireIsObservable()),n=requireCommon(),i=requireTransferable(),o=requireMessages(),a=r(requireImplementation());var c=requireCommon();Object.defineProperty(e,"registerSerializer",{enumerable:!0,get:function(){return c.registerSerializer}});var l=requireTransferable();Object.defineProperty(e,"Transfer",{enumerable:!0,get:function(){return l.Transfer}}),e.isWorkerRuntime=a.default.isWorkerRuntime;let h=!1;const v=new Map,p=u=>u&&u.type===o.MasterMessageType.cancel,M=u=>u&&u.type===o.MasterMessageType.run,S=u=>t.default(u)||L(u);function L(u){return u&&typeof u=="object"&&typeof u.subscribe=="function"}function E(u){return i.isTransferDescriptor(u)?{payload:u.send,transferables:u.transferables}:{payload:u,transferables:void 0}}function O(){const u={type:o.WorkerMessageType.init,exposed:{type:"function"}};a.default.postMessageToMaster(u)}function B(u){const f={type:o.WorkerMessageType.init,exposed:{type:"module",methods:u}};a.default.postMessageToMaster(f)}function y(u,f){const{payload:d,transferables:b}=E(f),T={type:o.WorkerMessageType.error,uid:u,error:n.serialize(d)};a.default.postMessageToMaster(T,b)}function _(u,f,d){const{payload:b,transferables:T}=E(d),k={type:o.WorkerMessageType.result,uid:u,complete:f?!0:void 0,payload:b};a.default.postMessageToMaster(k,T)}function I(u,f){const d={type:o.WorkerMessageType.running,uid:u,resultType:f};a.default.postMessageToMaster(d)}function w(u){try{const f={type:o.WorkerMessageType.uncaughtError,error:n.serialize(u)};a.default.postMessageToMaster(f)}catch(f){console.error(`Not reporting uncaught error back to master thread as it occured while reporting an uncaught error already.\nLatest error:`,f,`\nOriginal error:`,u)}}function g(u,f,d){return s(this,void 0,void 0,function*(){let b;try{b=f(...d)}catch(k){return y(u,k)}const T=S(b)?"observable":"promise";if(I(u,T),S(b)){const k=b.subscribe(R=>_(u,!1,n.serialize(R)),R=>{y(u,n.serialize(R)),v.delete(u)},()=>{_(u,!0),v.delete(u)});v.set(u,k)}else try{const k=yield b;_(u,!0,n.serialize(k))}catch(k){y(u,n.serialize(k))}})}function m(u){if(!a.default.isWorkerRuntime())throw Error("expose() called in the master thread.");if(h)throw Error("expose() called more than once. This is not possible. Pass an object to expose() if you want to expose multiple functions.");if(h=!0,typeof u=="function")a.default.subscribeToMasterMessages(f=>{M(f)&&!f.method&&g(f.uid,u,f.args.map(n.deserialize))}),O();else if(typeof u=="object"&&u){a.default.subscribeToMasterMessages(d=>{M(d)&&d.method&&g(d.uid,u[d.method],d.args.map(n.deserialize))});const f=Object.keys(u).filter(d=>typeof u[d]=="function");B(f)}else throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${u}`);a.default.subscribeToMasterMessages(f=>{if(p(f)){const d=f.uid,b=v.get(d);b&&(b.unsubscribe(),v.delete(d))}})}e.expose=m,typeof self<"u"&&typeof self.addEventListener=="function"&&a.default.isWorkerRuntime()&&(self.addEventListener("error",u=>{setTimeout(()=>w(u.error||u),250)}),self.addEventListener("unhandledrejection",u=>{const f=u.reason;f&&typeof f.message=="string"&&setTimeout(()=>w(f),250)})),typeof process<"u"&&typeof process.on=="function"&&a.default.isWorkerRuntime()&&(process.on("uncaughtException",u=>{setTimeout(()=>w(u),250)}),process.on("unhandledRejection",u=>{u&&typeof u.message=="string"&&setTimeout(()=>w(u),250)}))})(worker)),worker}var workerExports=requireWorker();const WorkerContext=getDefaultExportFromCjs(workerExports),expose=WorkerContext.expose;WorkerContext.registerSerializer;const Transfer=WorkerContext.Transfer;function getEncodedVarIndicesLength(e){var s;let r=1;for(const t of e){r+=2;const n=((s=t.subscriptIndices)==null?void 0:s.length)||0;r+=n}return r}function encodeVarIndices(e,s){let r=0;s[r++]=e.length;for(const t of e){s[r++]=t.varIndex;const n=t.subscriptIndices,i=n?.length||0;s[r++]=i;for(let o=0;o<i;o++)s[r++]=n[o]}}function getEncodedConstantBufferLengths(e){var s;let r=1,t=0;for(const n of e){const i=n.varRef.varSpec;if(i===void 0)throw new Error("Cannot compute constant buffer lengths until all constant var specs are defined");r+=2;const o=((s=i.subscriptIndices)==null?void 0:s.length)||0;r+=o,t+=1}return{constantIndicesLength:r,constantsLength:t}}function encodeConstants(e,s,r){let t=0;s[t++]=e.length;let n=0;for(const i of e){const o=i.varRef.varSpec;s[t++]=o.varIndex;const a=o.subscriptIndices,c=a?.length||0;s[t++]=c;for(let l=0;l<c;l++)s[t++]=a[l];r[n++]=i.value}}function decodeConstants(e,s){const r=[];let t=0;const n=e[t++];for(let i=0;i<n;i++){const o=e[t++],a=e[t++],c=a>0?Array(a):void 0;for(let v=0;v<a;v++)c[v]=e[t++];const l={varIndex:o,subscriptIndices:c},h=s[i];r.push({varRef:{varSpec:l},value:h})}return r}function getEncodedLookupBufferLengths(e){var s,r;let t=1,n=0;for(const i of e){const o=i.varRef.varSpec;if(o===void 0)throw new Error("Cannot compute lookup buffer lengths until all lookup var specs are defined");t+=2;const a=((s=o.subscriptIndices)==null?void 0:s.length)||0;t+=a,t+=2,n+=((r=i.points)==null?void 0:r.length)||0}return{lookupIndicesLength:t,lookupsLength:n}}function encodeLookups(e,s,r){let t=0;s[t++]=e.length;let n=0;for(const i of e){const o=i.varRef.varSpec;s[t++]=o.varIndex;const a=o.subscriptIndices,c=a?.length||0;s[t++]=c;for(let l=0;l<c;l++)s[t++]=a[l];i.points!==void 0?(s[t++]=n,s[t++]=i.points.length,r?.set(i.points,n),n+=i.points.length):(s[t++]=-1,s[t++]=0)}}function decodeLookups(e,s){const r=[];let t=0;const n=e[t++];for(let i=0;i<n;i++){const o=e[t++],a=e[t++],c=a>0?Array(a):void 0;for(let M=0;M<a;M++)c[M]=e[t++];const l=e[t++],h=e[t++],v={varIndex:o,subscriptIndices:c};let p;l>=0?s?p=s.slice(l,l+h):p=new Float64Array(0):p=void 0,r.push({varRef:{varSpec:v},points:p})}return r}function resolveVarRef(e,s,r){if(!s.varSpec){if(e===void 0)throw new Error(`Unable to resolve ${r} variable references by name or identifier when model listing is unavailable`);if(s.varId){const t=e?.getSpecForVarId(s.varId);if(t)s.varSpec=t;else throw new Error(`Failed to resolve ${r} variable reference for varId=${s.varId}`)}else{const t=e?.getSpecForVarName(s.varName);if(t)s.varSpec=t;else throw new Error(`Failed to resolve ${r} variable reference for varName=\'${s.varId}\'`)}}}var headerLengthInElements=20,extrasLengthInElements=1,Int32Section=class{constructor(){this.offsetInBytes=0,this.lengthInElements=0}update(e,s,r){this.view=r>0?new Int32Array(e,s,r):void 0,this.offsetInBytes=s,this.lengthInElements=r}},Float64Section=class{constructor(){this.offsetInBytes=0,this.lengthInElements=0}update(e,s,r){this.view=r>0?new Float64Array(e,s,r):void 0,this.offsetInBytes=s,this.lengthInElements=r}},BufferedRunModelParams=class{constructor(e){this.listing=e,this.header=new Int32Section,this.extras=new Float64Section,this.inputs=new Float64Section,this.outputs=new Float64Section,this.outputIndices=new Int32Section,this.constants=new Float64Section,this.constantIndices=new Int32Section,this.lookups=new Float64Section,this.lookupIndices=new Int32Section}getEncodedBuffer(){return this.encoded}getInputs(){return this.inputs.view}copyInputs(e,s){this.inputs.lengthInElements!==0&&((e===void 0||e.length<this.inputs.lengthInElements)&&(e=s(this.inputs.lengthInElements)),e.set(this.inputs.view))}getOutputIndicesLength(){return this.outputIndices.lengthInElements}getOutputIndices(){return this.outputIndices.view}copyOutputIndices(e,s){this.outputIndices.lengthInElements!==0&&((e===void 0||e.length<this.outputIndices.lengthInElements)&&(e=s(this.outputIndices.lengthInElements)),e.set(this.outputIndices.view))}getOutputsLength(){return this.outputs.lengthInElements}getOutputs(){return this.outputs.view}getOutputsObject(){}storeOutputs(e){this.outputs.view!==void 0&&(e.length>this.outputs.view.length?this.outputs.view.set(e.subarray(0,this.outputs.view.length)):this.outputs.view.set(e))}getConstants(){if(this.constantIndices.lengthInElements!==0)return decodeConstants(this.constantIndices.view,this.constants.view)}getLookups(){if(this.lookupIndices.lengthInElements!==0)return decodeLookups(this.lookupIndices.view,this.lookups.view)}getElapsedTime(){return this.extras.view[0]}storeElapsedTime(e){this.extras.view[0]=e}finalizeOutputs(e){this.outputs.view&&e.updateFromBuffer(this.outputs.view,e.seriesLength),e.runTimeInMillis=this.getElapsedTime()}updateFromParams(e,s,r){const t=e.length,n=s.varIds.length*s.seriesLength;let i;const o=s.varSpecs;o!==void 0&&o.length>0?i=getEncodedVarIndicesLength(o):i=0;let a,c;if(r?.constants!==void 0&&r.constants.length>0){for(const d of r.constants)resolveVarRef(this.listing,d.varRef,"constant");const f=getEncodedConstantBufferLengths(r.constants);a=f.constantsLength,c=f.constantIndicesLength}else a=0,c=0;let l,h;if(r?.lookups!==void 0&&r.lookups.length>0){for(const d of r.lookups)resolveVarRef(this.listing,d.varRef,"lookup");const f=getEncodedLookupBufferLengths(r.lookups);l=f.lookupsLength,h=f.lookupIndicesLength}else l=0,h=0;let v=0;function p(f,d){const b=v,T=f==="float64"?Float64Array.BYTES_PER_ELEMENT:Int32Array.BYTES_PER_ELEMENT,k=Math.round(d*T),R=Math.ceil(k/8)*8;return v+=R,b}const M=p("int32",headerLengthInElements),S=p("float64",extrasLengthInElements),L=p("float64",t),E=p("float64",n),O=p("int32",i),B=p("float64",a),y=p("int32",c),_=p("float64",l),I=p("int32",h),w=v;if(this.encoded===void 0||this.encoded.byteLength<w){const f=Math.ceil(w*1.2);this.encoded=new ArrayBuffer(f),this.header.update(this.encoded,M,headerLengthInElements)}const g=this.header.view;let m=0;g[m++]=S,g[m++]=extrasLengthInElements,g[m++]=L,g[m++]=t,g[m++]=E,g[m++]=n,g[m++]=O,g[m++]=i,g[m++]=B,g[m++]=a,g[m++]=y,g[m++]=c,g[m++]=_,g[m++]=l,g[m++]=I,g[m++]=h,this.inputs.update(this.encoded,L,t),this.extras.update(this.encoded,S,extrasLengthInElements),this.outputs.update(this.encoded,E,n),this.outputIndices.update(this.encoded,O,i),this.constants.update(this.encoded,B,a),this.constantIndices.update(this.encoded,y,c),this.lookups.update(this.encoded,_,l),this.lookupIndices.update(this.encoded,I,h);const u=this.inputs.view;for(let f=0;f<e.length;f++){const d=e[f];typeof d=="number"?u[f]=d:u[f]=d.get()}this.outputIndices.view&&encodeVarIndices(o,this.outputIndices.view),c>0&&encodeConstants(r.constants,this.constantIndices.view,this.constants.view),h>0&&encodeLookups(r.lookups,this.lookupIndices.view,this.lookups.view)}updateFromEncodedBuffer(e){const s=headerLengthInElements*Int32Array.BYTES_PER_ELEMENT;if(e.byteLength<s)throw new Error("Buffer must be long enough to contain header section");this.encoded=e,this.header.update(this.encoded,0,headerLengthInElements);const t=this.header.view;let n=0;const i=t[n++],o=t[n++],a=t[n++],c=t[n++],l=t[n++],h=t[n++],v=t[n++],p=t[n++],M=t[n++],S=t[n++],L=t[n++],E=t[n++],O=t[n++],B=t[n++],y=t[n++],_=t[n++],I=o*Float64Array.BYTES_PER_ELEMENT,w=c*Float64Array.BYTES_PER_ELEMENT,g=h*Float64Array.BYTES_PER_ELEMENT,m=p*Int32Array.BYTES_PER_ELEMENT,u=S*Float64Array.BYTES_PER_ELEMENT,f=E*Int32Array.BYTES_PER_ELEMENT,d=B*Float64Array.BYTES_PER_ELEMENT,b=_*Int32Array.BYTES_PER_ELEMENT,T=s+I+w+g+m+u+f+d+b;if(e.byteLength<T)throw new Error("Buffer must be long enough to contain sections declared in header");this.extras.update(this.encoded,i,o),this.inputs.update(this.encoded,a,c),this.outputs.update(this.encoded,l,h),this.outputIndices.update(this.encoded,v,p),this.constants.update(this.encoded,M,S),this.constantIndices.update(this.encoded,L,E),this.lookups.update(this.encoded,O,B),this.lookupIndices.update(this.encoded,y,_)}},_NA_=-Number.MAX_VALUE,JsModelLookup=class{constructor(e,s){if(s&&s.length<e*2)throw new Error(`Lookup data array length must be >= 2*size (length=${s.length} size=${e}`);this.originalData=s,this.originalSize=e,this.dynamicData=void 0,this.dynamicSize=0,this.activeData=this.originalData,this.activeSize=this.originalSize,this.lastInput=Number.MAX_VALUE,this.lastHitIndex=0}setData(e,s){if(s){if(s.length<e*2)throw new Error(`Lookup data array length must be >= 2*size (length=${s.length} size=${e}`);const r=e*2;if((this.dynamicData===void 0||r>this.dynamicData.length)&&(this.dynamicData=new Float64Array(r)),this.dynamicSize=e,e>0){const t=s.subarray(0,r);this.dynamicData.set(t)}this.activeData=this.dynamicData,this.activeSize=this.dynamicSize}else this.activeData=this.originalData,this.activeSize=this.originalSize;this.invertedData=void 0,this.lastInput=Number.MAX_VALUE,this.lastHitIndex=0}getValueForX(e,s){return this.getValue(e,!1,s)}getValueForY(e){if(this.invertedData===void 0){const s=this.activeSize*2,r=this.activeData,t=Array(s);for(let n=0;n<s;n+=2)t[n]=r[n+1],t[n+1]=r[n];this.invertedData=t}return this.getValue(e,!0,"interpolate")}getValue(e,s,r){if(this.activeSize===0)return _NA_;const t=s?this.invertedData:this.activeData,n=this.activeSize*2,i=!s;let o;i&&e>=this.lastInput?o=this.lastHitIndex:o=0;for(let a=o;a<n;a+=2){const c=t[a];if(c>=e){if(i&&(this.lastInput=e,this.lastHitIndex=a),a===0||c===e)return t[a+1];switch(r){default:case"interpolate":{const l=t[a-2],h=t[a-1],v=t[a+1],p=c-l,M=v-h;return h+M/p*(e-l)}case"forward":return t[a+1];case"backward":return t[a-1]}}}return i&&(this.lastInput=e,this.lastHitIndex=n),t[n-1]}getValueForGameTime(e,s){if(this.activeSize<=0)return s;const r=this.activeData[0];return e<r?s:this.getValue(e,!1,"backward")}getValueBetweenTimes(e,s){if(this.activeSize===0)return _NA_;const r=this.activeData,t=this.activeSize*2;switch(s){case"forward":{e=Math.floor(e);for(let n=0;n<t;n+=2)if(r[n]>=e)return r[n+1];return r[t-1]}case"backward":{e=Math.floor(e);for(let n=2;n<t;n+=2)if(r[n]>=e)return r[n-1];return t>=4?r[t-3]:r[1]}default:{if(e-Math.floor(e)>0){let n=`GET DATA BETWEEN TIMES was called with an input value (${e}) that has a fractional part. `;throw n+="When mode is 0 (interpolate) and the input value is not a whole number, Vensim produces unexpected ",n+="results that may differ from those produced by SDEverywhere.",new Error(n)}for(let n=2;n<t;n+=2){const i=r[n];if(i>=e){const o=r[n-2],a=r[n-1],c=r[n+1],l=i-o,h=c-a;return a+h/l*(e-o)}}return r[t-1]}}}},EPSILON=1e-6;function getJsModelFunctions(){let e;const s=new Map,r=new Map;return{setContext(t){e=t},ABS(t){return Math.abs(t)},ARCCOS(t){return Math.acos(t)},ARCSIN(t){return Math.asin(t)},ARCTAN(t){return Math.atan(t)},COS(t){return Math.cos(t)},EXP(t){return Math.exp(t)},GAME(t,n){return t?t.getValueForGameTime(e.currentTime,n):n},INTEG(t,n){return t+n*e.timeStep},INTEGER(t){return Math.trunc(t)},LN(t){return Math.log(t)},MAX(t,n){return Math.max(t,n)},MIN(t,n){return Math.min(t,n)},MODULO(t,n){return t%n},POW(t,n){return Math.pow(t,n)},POWER(t,n){return Math.pow(t,n)},PULSE(t,n){return pulse(e,t,n)},PULSE_TRAIN(t,n,i,o){const a=Math.floor((o-t)/i);for(let c=0;c<=a;c++)if(e.currentTime<=o&&pulse(e,t+c*i,n))return 1;return 0},QUANTUM(t,n){return n<=0?t:n*Math.trunc(t/n)},RAMP(t,n,i){return e.currentTime>n?e.currentTime<i||n>i?t*(e.currentTime-n):t*(i-n):0},SIN(t){return Math.sin(t)},SQRT(t){return Math.sqrt(t)},STEP(t,n){return e.currentTime+e.timeStep/2>n?t:0},TAN(t){return Math.tan(t)},VECTOR_SORT_ORDER(t,n,i){if(n>t.length)throw new Error(`VECTOR SORT ORDER input vector length (${t.length}) must be >= size (${n})`);let o=r.get(n);if(o===void 0){o=Array(n);for(let l=0;l<n;l++)o[l]={x:0,ind:0};r.set(n,o)}let a=s.get(n);a===void 0&&(a=Array(n),s.set(n,a));for(let l=0;l<n;l++)o[l].x=t[l],o[l].ind=l;const c=i>0?1:-1;o.sort((l,h)=>{let v;return l.x<h.x?v=-1:l.x>h.x?v=1:v=0,v*c});for(let l=0;l<n;l++)a[l]=o[l].ind;return a},XIDZ(t,n,i){return Math.abs(n)<EPSILON?i:t/n},ZIDZ(t,n){return Math.abs(n)<EPSILON?0:t/n},createLookup(t,n){return new JsModelLookup(t,n)},LOOKUP(t,n){return t?t.getValueForX(n,"interpolate"):_NA_},LOOKUP_FORWARD(t,n){return t?t.getValueForX(n,"forward"):_NA_},LOOKUP_BACKWARD(t,n){return t?t.getValueForX(n,"backward"):_NA_},LOOKUP_INVERT(t,n){return t?t.getValueForY(n):_NA_},WITH_LOOKUP(t,n){return n?n.getValueForX(t,"interpolate"):_NA_},GET_DATA_BETWEEN_TIMES(t,n,i){let o;return i>=1?o="forward":i<=-1?o="backward":o="interpolate",t?t.getValueBetweenTimes(n,o):_NA_}}}function pulse(e,s,r){const t=e.currentTime+e.timeStep/2;return r===0&&(r=e.timeStep),t>s&&t<s+r?1:0}var isWeb;function perfNow(){return isWeb===void 0&&(isWeb=typeof self<"u"&&self?.performance!==void 0),isWeb?self.performance.now():process==null?void 0:process.hrtime()}function perfElapsed(e){if(isWeb)return self.performance.now()-e;{const s=process.hrtime(e);return(s[0]*1e9+s[1])/1e6}}var BaseRunnableModel=class{constructor(e){this.startTime=e.startTime,this.endTime=e.endTime,this.saveFreq=e.saveFreq,this.numSavePoints=e.numSavePoints,this.outputVarIds=e.outputVarIds,this.modelListing=e.modelListing,this.onRunModel=e.onRunModel}runModel(e){var s;let r=e.getInputs();r===void 0&&(e.copyInputs(this.inputs,c=>(this.inputs=new Float64Array(c),this.inputs)),r=this.inputs);let t=e.getOutputIndices();t===void 0&&e.getOutputIndicesLength()>0&&(e.copyOutputIndices(this.outputIndices,c=>(this.outputIndices=new Int32Array(c),this.outputIndices)),t=this.outputIndices);const n=e.getOutputsLength();(this.outputs===void 0||this.outputs.length<n)&&(this.outputs=new Float64Array(n));const i=this.outputs,o=perfNow();(s=this.onRunModel)==null||s.call(this,r,i,{outputIndices:t,constants:e.getConstants(),lookups:e.getLookups()});const a=perfElapsed(o);e.storeOutputs(i),e.storeElapsedTime(a)}terminate(){}};function initJsModel(e){let s=e.getModelFunctions();s===void 0&&(s=getJsModelFunctions(),e.setModelFunctions(s));const r=e.getInitialTime(),t=e.getFinalTime(),n=e.getTimeStep(),i=e.getSaveFreq(),o=Math.round((t-r)/i)+1;return new BaseRunnableModel({startTime:r,endTime:t,saveFreq:i,numSavePoints:o,outputVarIds:e.outputVarIds,modelListing:e.modelListing,onRunModel:(a,c,l)=>{runJsModel(e,r,t,n,i,o,a,c,l?.outputIndices,l?.constants,l?.lookups)}})}function runJsModel(e,s,r,t,n,i,o,a,c,l,h,v){let p=s;e.setTime(p);const M={timeStep:t,currentTime:p};if(e.getModelFunctions().setContext(M),e.initConstants(),l!==void 0)for(const y of l)e.setConstant(y.varRef.varSpec,y.value);if(h!==void 0)for(const y of h)e.setLookup(y.varRef.varSpec,y.points);o?.length>0&&e.setInputs(y=>o[y]),e.initLevels();const S=Math.round((r-s)/t),L=r;let E=0,O=0,B=0;for(;E<=S;){if(e.evalAux(),p%n<1e-6){B=0;const y=_=>{const I=B*i+O;a[I]=p<=L?_:void 0,B++};if(c!==void 0){let _=0;const I=c[_++];for(let w=0;w<I;w++){const g=c[_++],m=c[_++];let u;m>0&&(u=c.subarray(_,_+m),_+=m);const f={varIndex:g,subscriptIndices:u};e.storeOutput(f,y)}}else e.storeOutputs(y);O++}if(E===S)break;e.evalLevels(),p+=t,e.setTime(p),M.currentTime=p,E++}}var WasmBuffer=class{constructor(e,s,r,t){this.wasmModule=e,this.numElements=s,this.byteOffset=r,this.heapArray=t}getArrayView(){return this.heapArray}getAddress(){return this.byteOffset}dispose(){var e,s;this.heapArray&&((s=(e=this.wasmModule)._free)==null||s.call(e,this.byteOffset),this.numElements=void 0,this.heapArray=void 0,this.byteOffset=void 0)}};function createInt32WasmBuffer(e,s){const t=s*4,n=e._malloc(t),i=n/4,o=e.HEAP32.subarray(i,i+s);return new WasmBuffer(e,s,n,o)}function createFloat64WasmBuffer(e,s){const t=s*8,n=e._malloc(t),i=n/8,o=e.HEAPF64.subarray(i,i+s);return new WasmBuffer(e,s,n,o)}var WasmModel=class{constructor(e){this.wasmModule=e;function s(r){return e.cwrap(r,"number",[])()}this.startTime=s("getInitialTime"),this.endTime=s("getFinalTime"),this.saveFreq=s("getSaveper"),this.numSavePoints=Math.round((this.endTime-this.startTime)/this.saveFreq)+1,this.outputVarIds=e.outputVarIds,this.modelListing=e.modelListing,this.wasmSetLookup=e.cwrap("setLookup",null,["number","number","number","number"]),this.wasmRunModel=e.cwrap("runModelWithBuffers",null,["number","number","number","number","number","number"])}runModel(e){var s,r,t,n,i,o,a,c,l,h,v;const p=e.getLookups();if(p!==void 0)for(const _ of p){const I=_.varRef.varSpec,w=((s=I.subscriptIndices)==null?void 0:s.length)||0;let g;w>0?((this.lookupSubIndicesBuffer===void 0||this.lookupSubIndicesBuffer.numElements<w)&&((r=this.lookupSubIndicesBuffer)==null||r.dispose(),this.lookupSubIndicesBuffer=createInt32WasmBuffer(this.wasmModule,w)),this.lookupSubIndicesBuffer.getArrayView().set(I.subscriptIndices),g=this.lookupSubIndicesBuffer.getAddress()):g=0;let m,u;if(_.points){const d=_.points.length;(this.lookupDataBuffer===void 0||this.lookupDataBuffer.numElements<d)&&((t=this.lookupDataBuffer)==null||t.dispose(),this.lookupDataBuffer=createFloat64WasmBuffer(this.wasmModule,d)),this.lookupDataBuffer.getArrayView().set(_.points),m=this.lookupDataBuffer.getAddress(),u=d/2}else m=0,u=0;const f=I.varIndex;this.wasmSetLookup(f,g,m,u)}let M,S;const L=e.getConstants();if(L!==void 0&&L.length>0){let _=1;for(const f of L){const d=((n=f.varRef.varSpec.subscriptIndices)==null?void 0:n.length)||0;_+=2+d}(this.constantIndicesBuffer===void 0||this.constantIndicesBuffer.numElements<_)&&((i=this.constantIndicesBuffer)==null||i.dispose(),this.constantIndicesBuffer=createInt32WasmBuffer(this.wasmModule,_));const I=L.length;(this.constantValuesBuffer===void 0||this.constantValuesBuffer.numElements<I)&&((o=this.constantValuesBuffer)==null||o.dispose(),this.constantValuesBuffer=createFloat64WasmBuffer(this.wasmModule,I));const w=this.constantIndicesBuffer.getArrayView(),g=this.constantValuesBuffer.getArrayView();let m=0,u=0;w[m++]=I;for(const f of L){const d=f.varRef.varSpec,b=((a=d.subscriptIndices)==null?void 0:a.length)||0;if(w[m++]=d.varIndex,w[m++]=b,b>0)for(let T=0;T<b;T++)w[m++]=d.subscriptIndices[T];g[u++]=f.value}M=this.constantIndicesBuffer,S=this.constantValuesBuffer}else M=void 0,S=void 0;e.copyInputs((c=this.inputsBuffer)==null?void 0:c.getArrayView(),_=>{var I;return(I=this.inputsBuffer)==null||I.dispose(),this.inputsBuffer=createFloat64WasmBuffer(this.wasmModule,_),this.inputsBuffer.getArrayView()});let E;e.getOutputIndicesLength()>0?(e.copyOutputIndices((l=this.outputIndicesBuffer)==null?void 0:l.getArrayView(),_=>{var I;return(I=this.outputIndicesBuffer)==null||I.dispose(),this.outputIndicesBuffer=createInt32WasmBuffer(this.wasmModule,_),this.outputIndicesBuffer.getArrayView()}),E=this.outputIndicesBuffer):E=void 0;const O=e.getOutputsLength();(this.outputsBuffer===void 0||this.outputsBuffer.numElements<O)&&((h=this.outputsBuffer)==null||h.dispose(),this.outputsBuffer=createFloat64WasmBuffer(this.wasmModule,O));const B=perfNow();this.wasmRunModel(((v=this.inputsBuffer)==null?void 0:v.getAddress())||0,0,this.outputsBuffer.getAddress(),E?.getAddress()||0,S?.getAddress()||0,M?.getAddress()||0);const y=perfElapsed(B);e.storeOutputs(this.outputsBuffer.getArrayView()),e.storeElapsedTime(y)}terminate(){var e,s,r,t,n;(e=this.inputsBuffer)==null||e.dispose(),this.inputsBuffer=void 0,(s=this.outputsBuffer)==null||s.dispose(),this.outputsBuffer=void 0,(r=this.outputIndicesBuffer)==null||r.dispose(),this.outputIndicesBuffer=void 0,(t=this.constantValuesBuffer)==null||t.dispose(),this.constantValuesBuffer=void 0,(n=this.constantIndicesBuffer)==null||n.dispose(),this.constantIndicesBuffer=void 0}};function initWasmModel(e){return new WasmModel(e)}function createRunnableModel(e){switch(e.kind){case"js":return initJsModel(e);case"wasm":return initWasmModel(e);default:throw new Error("Unable to identify generated model kind")}}var initGeneratedModel,runnableModel,params=new BufferedRunModelParams,modelWorker={async initModel(){if(runnableModel)throw new Error("RunnableModel was already initialized");const e=await initGeneratedModel();return runnableModel=createRunnableModel(e),{outputVarIds:runnableModel.outputVarIds,modelListing:runnableModel.modelListing,startTime:runnableModel.startTime,endTime:runnableModel.endTime,saveFreq:runnableModel.saveFreq,outputRowLength:runnableModel.numSavePoints}},runModel(e){if(!runnableModel)throw new Error("RunnableModel must be initialized before running the model in worker");return params.updateFromEncodedBuffer(e),runnableModel.runModel(params),Transfer(e)}};function exposeModelWorker(e){initGeneratedModel=e,expose(modelWorker)}let __lookup1,__lookup2,_environmental_impact,_final_time,_impact_on_population_development,_initial_population,_initial_time,_initial_urban_green_status,_minimal_development_rate,_minimal_urban_green_deline_rate,_population_decline_decline,_population_development,_population_sensitivity,_saveper,_time_step,_tourism_decline_rate,_urban_green_decrease,_urban_green_increase,_urban_green_resilience,_urban_green_sensitivity,_urban_green_status,_urban_population;const __lookup1_data_=[0,.007,.05,.011,.1,.018,.15,.029,.2,.047,.25,.076,.3,.119,.35,.182,.4,.269,.45,.378,.5,.5,.5,.5,.55,.622,.6,.731,.65,.818,.7,.881,.75,.924,.8,.953,.85,.971,.9,.982,.95,.989,1,.993],__lookup2_data_=[0,.007,.05,.011,.1,.018,.15,.029,.2,.047,.25,.076,.3,.119,.35,.182,.4,.269,.45,.378,.5,.5,.5,.5,.55,.622,.6,.731,.65,.818,.7,.881,.75,.924,.8,.953,.85,.971,.9,.982,.95,.989,1,.993];let _time;function setTime(e){_time=e}let controlParamsInitialized=!1;function initControlParamsIfNeeded(){if(!controlParamsInitialized){if(fns===void 0)throw new Error("Must call setModelFunctions() before running the model");if(initConstants(),_initial_time===void 0)throw new Error("INITIAL TIME must be defined as a constant value");if(_time_step===void 0)throw new Error("TIME STEP must be defined as a constant value");if(_final_time===void 0||_saveper===void 0){if(setTime(_initial_time),fns.setContext({timeStep:_time_step,currentTime:_time}),initLevels(),evalAux(),_final_time===void 0)throw new Error("FINAL TIME must be defined");if(_saveper===void 0)throw new Error("SAVEPER must be defined")}controlParamsInitialized=!0}}function getInitialTime(){return initControlParamsIfNeeded(),_initial_time}function getFinalTime(){return initControlParamsIfNeeded(),_final_time}function getTimeStep(){return initControlParamsIfNeeded(),_time_step}function getSaveFreq(){return initControlParamsIfNeeded(),_saveper}let fns;function getModelFunctions(){return fns}function setModelFunctions(e){fns=e}let lookups_initialized=!1;function initLookups0(){__lookup1=fns.createLookup(22,__lookup1_data_),__lookup2=fns.createLookup(22,__lookup2_data_)}function initLookups(){lookups_initialized||(initLookups0(),lookups_initialized=!0)}function initConstants0(){_final_time=2050,_initial_time=2020,_time_step=.0625,_initial_population=.2,_initial_urban_green_status=.5,_minimal_development_rate=2,_minimal_urban_green_deline_rate=.1,_population_sensitivity=1,_tourism_decline_rate=.125,_urban_green_resilience=2,_urban_green_sensitivity=1}function initConstants(){initConstants0(),initLookups()}function initLevels0(){_urban_green_status=_initial_urban_green_status,_urban_population=_initial_population}function initLevels(){initLevels0()}function evalAux0(){_saveper=_time_step,_population_decline_decline=_tourism_decline_rate*_urban_population,_urban_green_increase=_urban_green_resilience*_urban_green_status*(1-_urban_green_status),_environmental_impact=fns.WITH_LOOKUP(_urban_population,__lookup1),_urban_green_decrease=_urban_green_sensitivity*_environmental_impact*_minimal_urban_green_deline_rate*_urban_green_status,_impact_on_population_development=fns.WITH_LOOKUP(_urban_green_status,__lookup2),_population_development=_impact_on_population_development*_population_sensitivity*_minimal_development_rate*_urban_population*(1-_urban_population)}function evalAux(){evalAux0()}function evalLevels0(){_urban_green_status=fns.INTEG(_urban_green_status,_urban_green_increase-_urban_green_decrease),_urban_population=fns.INTEG(_urban_population,_population_development-_population_decline_decline)}function evalLevels(){evalLevels0()}function setInputs(e){_urban_green_resilience=e(0)}function setConstant(e,s){throw new Error("The setConstant function was not enabled for the generated model. Set the customConstants property in the spec/config file to allow for overriding constants at runtime.")}function setLookup(e,s){throw new Error("The setLookup function was not enabled for the generated model. Set the customLookups property in the spec/config file to allow for overriding lookups at runtime.")}const outputVarIds=["_urban_green_status","_urban_population"],outputVarNames=["urban green status","urban population"];function storeOutputs(e){e(_urban_green_status),e(_urban_population)}function storeOutput(e,s){throw new Error("The storeOutput function was not enabled for the generated model. Set the customOutputs property in the spec/config file to allow for capturing arbitrary variables at runtime.")}const modelListing=void 0;async function loadGeneratedModel(){return{kind:"js",outputVarIds,outputVarNames,modelListing,getInitialTime,getFinalTime,getTimeStep,getSaveFreq,getModelFunctions,setModelFunctions,setTime,setInputs,setConstant,setLookup,storeOutputs,storeOutput,initConstants,initLevels,evalAux,evalLevels}}exposeModelWorker(loadGeneratedModel)})();\n';
class BundleModelRunner {
  /**
   * @param modelSpec The spec for the bundled model.
   * @param inputMap The model inputs.
   * @param modelRunner The model runner.
   */
  constructor(e, n, r) {
    this.modelSpec = e, this.inputMap = n, this.modelRunner = r, this.inputs = [...n.values()].map((s) => s.value), this.outputs = r.createOutputs();
  }
  async runModelForScenario(e, n) {
    return setInputsForScenario(this.inputMap, e), n[0]?.startsWith("ModelImpl") ? this.runModelWithImplOutputs(n) : this.runModelWithNormalOutputs(n);
  }
  async runModelWithNormalOutputs(e) {
    this.outputs = await this.modelRunner.runModel(this.inputs, this.outputs);
    const n = this.outputs.runTimeInMillis, r = /* @__PURE__ */ new Map();
    for (const s of e) {
      const o = this.modelSpec.outputVars.get(s);
      if (o)
        if (o.sourceName === void 0) {
          const i = this.outputs.getSeriesForVar(o.varId);
          i && r.set(s, datasetFromPoints(i.points));
        } else
          console.error("Static data sources not yet handled in default model check bundle");
    }
    return {
      datasetMap: r,
      modelRunTime: n
    };
  }
  async runModelWithImplOutputs(e) {
    const n = [];
    for (const a of e) {
      const c = this.modelSpec.implVars.get(a);
      c && n.push(c);
    }
    const r = this.outputs.startTime, s = this.outputs.endTime, o = this.outputs.saveFreq;
    let i = createImplOutputs(n, r, s, o);
    i = await this.modelRunner.runModel(this.inputs, i);
    const u = i.runTimeInMillis, l = /* @__PURE__ */ new Map();
    for (const a of e) {
      const c = this.modelSpec.implVars.get(a), f = i.getSeriesForVar(c.varId);
      f && l.set(a, datasetFromPoints(f.points));
    }
    return {
      datasetMap: l,
      modelRunTime: u
    };
  }
}
function datasetFromPoints(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t)
    n.y !== void 0 && e.set(n.x, n.y);
  return e;
}
function createImplOutputs(t, e, n, r) {
  const s = [], o = [];
  for (const u of t)
    s.push(u.varId), o.push({
      varIndex: u.varIndex,
      subscriptIndices: u.subscriptIndices
    });
  const i = new Outputs(s, e, n, r);
  return i.varSpecs = o, i;
}
const VERSION = 1;
class BundleModel {
  /**
   * @param modelSpec The spec for the bundled model.
   * @param bundleModelRunner The bundle model runner.
   */
  constructor(e, n) {
    this.modelSpec = e, this.bundleModelRunner = n;
  }
  // from CheckBundleModel interface
  async getDatasetsForScenario(e, n) {
    return this.bundleModelRunner.runModelForScenario(e, n);
  }
}
async function initBundleModel(t, e) {
  const n = await spawnAsyncModelRunner({ source: modelWorkerJs }), r = new BundleModelRunner(t, e, n);
  return new BundleModel(t, r);
}
function createBundle() {
  const t = getInputVars(inputSpecs), e = getOutputVars(outputSpecs), { implVars: n, implVarGroups: r } = getImplVars(encodedImplVars), s = {
    modelSizeInBytes,
    dataSizeInBytes,
    inputVars: t,
    outputVars: e,
    implVars: n,
    implVarGroups: r
    // TODO: startTime and endTime are optional; the comparison graphs work OK if
    // they are undefined.  The main benefit of using these is to set a specific
    // range for the x-axis on the comparison graphs, so maybe we should find
    // another way to allow these to be defined.
    // startTime,
    // endTime
  };
  return {
    version: VERSION,
    modelSpec: s,
    initModel: () => initBundleModel(s, t)
  };
}
export {
  createBundle
};
