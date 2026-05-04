"use strict";

(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.retoldManager = f();
  }
})(function () {
  var define, module, exports;
  return function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw a.code = "MODULE_NOT_FOUND", a;
          }
          var p = n[i] = {
            exports: {}
          };
          e[i][0].call(p.exports, function (r) {
            var n = e[i][1][r];
            return o(n || r);
          }, p, p.exports, r, e, n, t);
        }
        return n[i].exports;
      }
      for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
      return o;
    }
    return r;
  }()({
    1: [function (require, module, exports) {
      module.exports = {
        "name": "fable-serviceproviderbase",
        "version": "3.0.19",
        "description": "Simple base classes for fable services.",
        "main": "source/Fable-ServiceProviderBase.js",
        "scripts": {
          "start": "node source/Fable-ServiceProviderBase.js",
          "test": "npx quack test",
          "tests": "npx quack test -g",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "types": "tsc -p ./tsconfig.build.json",
          "check": "tsc -p . --noEmit"
        },
        "types": "types/source/Fable-ServiceProviderBase.d.ts",
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        },
        "repository": {
          "type": "git",
          "url": "https://github.com/stevenvelozo/fable-serviceproviderbase.git"
        },
        "keywords": ["entity", "behavior"],
        "author": "Steven Velozo <steven@velozo.com> (http://velozo.com/)",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/fable-serviceproviderbase/issues"
        },
        "homepage": "https://github.com/stevenvelozo/fable-serviceproviderbase",
        "devDependencies": {
          "@types/mocha": "^10.0.10",
          "fable": "^3.1.62",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        }
      };
    }, {}],
    2: [function (require, module, exports) {
      /**
      * Fable Service Base
      * @author <steven@velozo.com>
      */

      const libPackage = require('../package.json');
      class FableServiceProviderBase {
        /**
         * The constructor can be used in two ways:
         * 1) With a fable, options object and service hash (the options object and service hash are optional)a
         * 2) With an object or nothing as the first parameter, where it will be treated as the options object
         *
         * @param {import('fable')|Record<string, any>} [pFable] - (optional) The fable instance, or the options object if there is no fable
         * @param {Record<string, any>|string} [pOptions] - (optional) The options object, or the service hash if there is no fable
         * @param {string} [pServiceHash] - (optional) The service hash to identify this service instance
         */
        constructor(pFable, pOptions, pServiceHash) {
          /** @type {import('fable')} */
          this.fable;
          /** @type {string} */
          this.UUID;
          /** @type {Record<string, any>} */
          this.options;
          /** @type {Record<string, any>} */
          this.services;
          /** @type {Record<string, any>} */
          this.servicesMap;

          // Check if a fable was passed in; connect it if so
          if (typeof pFable === 'object' && pFable.isFable) {
            this.connectFable(pFable);
          } else {
            this.fable = false;
          }

          // Initialize the services map if it wasn't passed in
          /** @type {Record<string, any>} */
          this._PackageFableServiceProvider = libPackage;

          // initialize options and UUID based on whether the fable was passed in or not.
          if (this.fable) {
            this.UUID = pFable.getUUID();
            this.options = typeof pOptions === 'object' ? pOptions : {};
          } else {
            // With no fable, check to see if there was an object passed into either of the first two
            // Parameters, and if so, treat it as the options object
            this.options = typeof pFable === 'object' && !pFable.isFable ? pFable : typeof pOptions === 'object' ? pOptions : {};
            this.UUID = `CORE-SVC-${Math.floor(Math.random() * (99999 - 10000) + 10000)}`;
          }

          // It's expected that the deriving class will set this
          this.serviceType = `Unknown-${this.UUID}`;

          // The service hash is used to identify the specific instantiation of the service in the services map
          this.Hash = typeof pServiceHash === 'string' ? pServiceHash : !this.fable && typeof pOptions === 'string' ? pOptions : `${this.UUID}`;
        }

        /**
         * @param {import('fable')} pFable
         */
        connectFable(pFable) {
          if (typeof pFable !== 'object' || !pFable.isFable) {
            let tmpErrorMessage = `Fable Service Provider Base: Cannot connect to Fable, invalid Fable object passed in.  The pFable parameter was a [${typeof pFable}].}`;
            console.log(tmpErrorMessage);
            return new Error(tmpErrorMessage);
          }
          if (!this.fable) {
            this.fable = pFable;
          }
          if (!this.log) {
            this.log = this.fable.Logging;
          }
          if (!this.services) {
            this.services = this.fable.services;
          }
          if (!this.servicesMap) {
            this.servicesMap = this.fable.servicesMap;
          }
          return true;
        }
        static isFableService = true;
      }
      module.exports = FableServiceProviderBase;

      // This is left here in case we want to go back to having different code/base class for "core" services
      module.exports.CoreServiceProviderBase = FableServiceProviderBase;
    }, {
      "../package.json": 1
    }],
    3: [function (require, module, exports) {
      !function (t, n) {
        "object" == typeof exports && "object" == typeof module ? module.exports = n() : "function" == typeof define && define.amd ? define("Navigo", [], n) : "object" == typeof exports ? exports.Navigo = n() : t.Navigo = n();
      }("undefined" != typeof self ? self : this, function () {
        return function () {
          "use strict";

          var t = {
              407: function (t, n, e) {
                e.d(n, {
                  default: function () {
                    return N;
                  }
                });
                var o = /([:*])(\w+)/g,
                  r = /\*/g,
                  i = /\/\?/g;
                function a(t) {
                  return void 0 === t && (t = "/"), v() ? location.pathname + location.search + location.hash : t;
                }
                function s(t) {
                  return t.replace(/\/+$/, "").replace(/^\/+/, "");
                }
                function c(t) {
                  return "string" == typeof t;
                }
                function u(t) {
                  return t && t.indexOf("#") >= 0 && t.split("#").pop() || "";
                }
                function h(t) {
                  var n = s(t).split(/\?(.*)?$/);
                  return [s(n[0]), n.slice(1).join("")];
                }
                function f(t) {
                  for (var n = {}, e = t.split("&"), o = 0; o < e.length; o++) {
                    var r = e[o].split("=");
                    if ("" !== r[0]) {
                      var i = decodeURIComponent(r[0]);
                      n[i] ? (Array.isArray(n[i]) || (n[i] = [n[i]]), n[i].push(decodeURIComponent(r[1] || ""))) : n[i] = decodeURIComponent(r[1] || "");
                    }
                  }
                  return n;
                }
                function l(t, n) {
                  var e,
                    a = h(s(t.currentLocationPath)),
                    l = a[0],
                    p = a[1],
                    d = "" === p ? null : f(p),
                    v = [];
                  if (c(n.path)) {
                    if (e = "(?:/^|^)" + s(n.path).replace(o, function (t, n, e) {
                      return v.push(e), "([^/]+)";
                    }).replace(r, "?(?:.*)").replace(i, "/?([^/]+|)") + "$", "" === s(n.path) && "" === s(l)) return {
                      url: l,
                      queryString: p,
                      hashString: u(t.to),
                      route: n,
                      data: null,
                      params: d
                    };
                  } else e = n.path;
                  var g = new RegExp(e, ""),
                    m = l.match(g);
                  if (m) {
                    var y = c(n.path) ? function (t, n) {
                      return 0 === n.length ? null : t ? t.slice(1, t.length).reduce(function (t, e, o) {
                        return null === t && (t = {}), t[n[o]] = decodeURIComponent(e), t;
                      }, null) : null;
                    }(m, v) : m.groups ? m.groups : m.slice(1);
                    return {
                      url: s(l.replace(new RegExp("^" + t.instance.root), "")),
                      queryString: p,
                      hashString: u(t.to),
                      route: n,
                      data: y,
                      params: d
                    };
                  }
                  return !1;
                }
                function p() {
                  return !("undefined" == typeof window || !window.history || !window.history.pushState);
                }
                function d(t, n) {
                  return void 0 === t[n] || !0 === t[n];
                }
                function v() {
                  return "undefined" != typeof window;
                }
                function g(t, n) {
                  return void 0 === t && (t = []), void 0 === n && (n = {}), t.filter(function (t) {
                    return t;
                  }).forEach(function (t) {
                    ["before", "after", "already", "leave"].forEach(function (e) {
                      t[e] && (n[e] || (n[e] = []), n[e].push(t[e]));
                    });
                  }), n;
                }
                function m(t, n, e) {
                  var o = n || {},
                    r = 0;
                  !function n() {
                    t[r] ? Array.isArray(t[r]) ? (t.splice.apply(t, [r, 1].concat(t[r][0](o) ? t[r][1] : t[r][2])), n()) : t[r](o, function (t) {
                      void 0 === t || !0 === t ? (r += 1, n()) : e && e(o);
                    }) : e && e(o);
                  }();
                }
                function y(t, n) {
                  void 0 === t.currentLocationPath && (t.currentLocationPath = t.to = a(t.instance.root)), t.currentLocationPath = t.instance._checkForAHash(t.currentLocationPath), n();
                }
                function _(t, n) {
                  for (var e = 0; e < t.instance.routes.length; e++) {
                    var o = l(t, t.instance.routes[e]);
                    if (o && (t.matches || (t.matches = []), t.matches.push(o), "ONE" === t.resolveOptions.strategy)) return void n();
                  }
                  n();
                }
                function k(t, n) {
                  t.navigateOptions && (void 0 !== t.navigateOptions.shouldResolve && console.warn('"shouldResolve" is deprecated. Please check the documentation.'), void 0 !== t.navigateOptions.silent && console.warn('"silent" is deprecated. Please check the documentation.')), n();
                }
                function O(t, n) {
                  !0 === t.navigateOptions.force ? (t.instance._setCurrent([t.instance._pathToMatchObject(t.to)]), n(!1)) : n();
                }
                m.if = function (t, n, e) {
                  return Array.isArray(n) || (n = [n]), Array.isArray(e) || (e = [e]), [t, n, e];
                };
                var w = v(),
                  L = p();
                function b(t, n) {
                  if (d(t.navigateOptions, "updateBrowserURL")) {
                    var e = ("/" + t.to).replace(/\/\//g, "/"),
                      o = w && t.resolveOptions && !0 === t.resolveOptions.hash;
                    L ? (history[t.navigateOptions.historyAPIMethod || "pushState"](t.navigateOptions.stateObj || {}, t.navigateOptions.title || "", o ? "#" + e : e), location && location.hash && (t.instance.__freezeListening = !0, setTimeout(function () {
                      if (!o) {
                        var n = location.hash;
                        location.hash = "", location.hash = n;
                      }
                      t.instance.__freezeListening = !1;
                    }, 1))) : w && (window.location.href = t.to);
                  }
                  n();
                }
                function A(t, n) {
                  var e = t.instance;
                  e.lastResolved() ? m(e.lastResolved().map(function (n) {
                    return function (e, o) {
                      if (n.route.hooks && n.route.hooks.leave) {
                        var r = !1,
                          i = t.instance.matchLocation(n.route.path, t.currentLocationPath, !1);
                        r = "*" !== n.route.path ? !i : !(t.matches && t.matches.find(function (t) {
                          return n.route.path === t.route.path;
                        })), d(t.navigateOptions, "callHooks") && r ? m(n.route.hooks.leave.map(function (n) {
                          return function (e, o) {
                            return n(function (n) {
                              !1 === n ? t.instance.__markAsClean(t) : o();
                            }, t.matches && t.matches.length > 0 ? 1 === t.matches.length ? t.matches[0] : t.matches : void 0);
                          };
                        }).concat([function () {
                          return o();
                        }])) : o();
                      } else o();
                    };
                  }), {}, function () {
                    return n();
                  }) : n();
                }
                function P(t, n) {
                  d(t.navigateOptions, "updateState") && t.instance._setCurrent(t.matches), n();
                }
                var R = [function (t, n) {
                    var e = t.instance.lastResolved();
                    if (e && e[0] && e[0].route === t.match.route && e[0].url === t.match.url && e[0].queryString === t.match.queryString) return e.forEach(function (n) {
                      n.route.hooks && n.route.hooks.already && d(t.navigateOptions, "callHooks") && n.route.hooks.already.forEach(function (n) {
                        return n(t.match);
                      });
                    }), void n(!1);
                    n();
                  }, function (t, n) {
                    t.match.route.hooks && t.match.route.hooks.before && d(t.navigateOptions, "callHooks") ? m(t.match.route.hooks.before.map(function (n) {
                      return function (e, o) {
                        return n(function (n) {
                          !1 === n ? t.instance.__markAsClean(t) : o();
                        }, t.match);
                      };
                    }).concat([function () {
                      return n();
                    }])) : n();
                  }, function (t, n) {
                    d(t.navigateOptions, "callHandler") && t.match.route.handler(t.match), t.instance.updatePageLinks(), n();
                  }, function (t, n) {
                    t.match.route.hooks && t.match.route.hooks.after && d(t.navigateOptions, "callHooks") && t.match.route.hooks.after.forEach(function (n) {
                      return n(t.match);
                    }), n();
                  }],
                  S = [A, function (t, n) {
                    var e = t.instance._notFoundRoute;
                    if (e) {
                      t.notFoundHandled = !0;
                      var o = h(t.currentLocationPath),
                        r = o[0],
                        i = o[1],
                        a = u(t.to);
                      e.path = s(r);
                      var c = {
                        url: e.path,
                        queryString: i,
                        hashString: a,
                        data: null,
                        route: e,
                        params: "" !== i ? f(i) : null
                      };
                      t.matches = [c], t.match = c;
                    }
                    n();
                  }, m.if(function (t) {
                    return t.notFoundHandled;
                  }, R.concat([P]), [function (t, n) {
                    t.resolveOptions && !1 !== t.resolveOptions.noMatchWarning && void 0 !== t.resolveOptions.noMatchWarning || console.warn('Navigo: "' + t.currentLocationPath + "\" didn't match any of the registered routes."), n();
                  }, function (t, n) {
                    t.instance._setCurrent(null), n();
                  }])];
                function E() {
                  return (E = Object.assign || function (t) {
                    for (var n = 1; n < arguments.length; n++) {
                      var e = arguments[n];
                      for (var o in e) Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
                    }
                    return t;
                  }).apply(this, arguments);
                }
                function x(t, n) {
                  var e = 0;
                  A(t, function o() {
                    e !== t.matches.length ? m(R, E({}, t, {
                      match: t.matches[e]
                    }), function () {
                      e += 1, o();
                    }) : P(t, n);
                  });
                }
                function H(t) {
                  t.instance.__markAsClean(t);
                }
                function j() {
                  return (j = Object.assign || function (t) {
                    for (var n = 1; n < arguments.length; n++) {
                      var e = arguments[n];
                      for (var o in e) Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
                    }
                    return t;
                  }).apply(this, arguments);
                }
                var C = "[data-navigo]";
                function N(t, n) {
                  var e,
                    o = n || {
                      strategy: "ONE",
                      hash: !1,
                      noMatchWarning: !1,
                      linksSelector: C
                    },
                    r = this,
                    i = "/",
                    d = null,
                    w = [],
                    L = !1,
                    A = p(),
                    P = v();
                  function R(t) {
                    return t.indexOf("#") >= 0 && (t = !0 === o.hash ? t.split("#")[1] || "/" : t.split("#")[0]), t;
                  }
                  function E(t) {
                    return s(i + "/" + s(t));
                  }
                  function N(t, n, e, o) {
                    return t = c(t) ? E(t) : t, {
                      name: o || s(String(t)),
                      path: t,
                      handler: n,
                      hooks: g(e)
                    };
                  }
                  function U(t, n) {
                    if (!r.__dirty) {
                      r.__dirty = !0, t = t ? s(i) + "/" + s(t) : void 0;
                      var e = {
                        instance: r,
                        to: t,
                        currentLocationPath: t,
                        navigateOptions: {},
                        resolveOptions: j({}, o, n)
                      };
                      return m([y, _, m.if(function (t) {
                        var n = t.matches;
                        return n && n.length > 0;
                      }, x, S)], e, H), !!e.matches && e.matches;
                    }
                    r.__waiting.push(function () {
                      return r.resolve(t, n);
                    });
                  }
                  function q(t, n) {
                    if (r.__dirty) r.__waiting.push(function () {
                      return r.navigate(t, n);
                    });else {
                      r.__dirty = !0, t = s(i) + "/" + s(t);
                      var e = {
                        instance: r,
                        to: t,
                        navigateOptions: n || {},
                        resolveOptions: n && n.resolveOptions ? n.resolveOptions : o,
                        currentLocationPath: R(t)
                      };
                      m([k, O, _, m.if(function (t) {
                        var n = t.matches;
                        return n && n.length > 0;
                      }, x, S), b, H], e, H);
                    }
                  }
                  function F() {
                    if (P) return (P ? [].slice.call(document.querySelectorAll(o.linksSelector || C)) : []).forEach(function (t) {
                      "false" !== t.getAttribute("data-navigo") && "_blank" !== t.getAttribute("target") ? t.hasListenerAttached || (t.hasListenerAttached = !0, t.navigoHandler = function (n) {
                        if ((n.ctrlKey || n.metaKey) && "a" === n.target.tagName.toLowerCase()) return !1;
                        var e = t.getAttribute("href");
                        if (null == e) return !1;
                        if (e.match(/^(http|https)/) && "undefined" != typeof URL) try {
                          var o = new URL(e);
                          e = o.pathname + o.search;
                        } catch (t) {}
                        var i = function (t) {
                          if (!t) return {};
                          var n,
                            e = t.split(","),
                            o = {};
                          return e.forEach(function (t) {
                            var e = t.split(":").map(function (t) {
                              return t.replace(/(^ +| +$)/g, "");
                            });
                            switch (e[0]) {
                              case "historyAPIMethod":
                                o.historyAPIMethod = e[1];
                                break;
                              case "resolveOptionsStrategy":
                                n || (n = {}), n.strategy = e[1];
                                break;
                              case "resolveOptionsHash":
                                n || (n = {}), n.hash = "true" === e[1];
                                break;
                              case "updateBrowserURL":
                              case "callHandler":
                              case "updateState":
                              case "force":
                                o[e[0]] = "true" === e[1];
                            }
                          }), n && (o.resolveOptions = n), o;
                        }(t.getAttribute("data-navigo-options"));
                        L || (n.preventDefault(), n.stopPropagation(), r.navigate(s(e), i));
                      }, t.addEventListener("click", t.navigoHandler)) : t.hasListenerAttached && t.removeEventListener("click", t.navigoHandler);
                    }), r;
                  }
                  function I(t, n, e) {
                    var o = w.find(function (n) {
                        return n.name === t;
                      }),
                      r = null;
                    if (o) {
                      if (r = o.path, n) for (var a in n) r = r.replace(":" + a, n[a]);
                      r = r.match(/^\//) ? r : "/" + r;
                    }
                    return r && e && !e.includeRoot && (r = r.replace(new RegExp("^/" + i), "")), r;
                  }
                  function M(t) {
                    var n = h(s(t)),
                      o = n[0],
                      r = n[1],
                      i = "" === r ? null : f(r);
                    return {
                      url: o,
                      queryString: r,
                      hashString: u(t),
                      route: N(o, function () {}, [e], o),
                      data: null,
                      params: i
                    };
                  }
                  function T(t, n, e) {
                    return "string" == typeof n && (n = z(n)), n ? (n.hooks[t] || (n.hooks[t] = []), n.hooks[t].push(e), function () {
                      n.hooks[t] = n.hooks[t].filter(function (t) {
                        return t !== e;
                      });
                    }) : (console.warn("Route doesn't exists: " + n), function () {});
                  }
                  function z(t) {
                    return "string" == typeof t ? w.find(function (n) {
                      return n.name === E(t);
                    }) : w.find(function (n) {
                      return n.handler === t;
                    });
                  }
                  t ? i = s(t) : console.warn('Navigo requires a root path in its constructor. If not provided will use "/" as default.'), this.root = i, this.routes = w, this.destroyed = L, this.current = d, this.__freezeListening = !1, this.__waiting = [], this.__dirty = !1, this.__markAsClean = function (t) {
                    t.instance.__dirty = !1, t.instance.__waiting.length > 0 && t.instance.__waiting.shift()();
                  }, this.on = function (t, n, o) {
                    var r = this;
                    return "object" != typeof t || t instanceof RegExp ? ("function" == typeof t && (o = n, n = t, t = i), w.push(N(t, n, [e, o])), this) : (Object.keys(t).forEach(function (n) {
                      if ("function" == typeof t[n]) r.on(n, t[n]);else {
                        var o = t[n],
                          i = o.uses,
                          a = o.as,
                          s = o.hooks;
                        w.push(N(n, i, [e, s], a));
                      }
                    }), this);
                  }, this.off = function (t) {
                    return this.routes = w = w.filter(function (n) {
                      return c(t) ? s(n.path) !== s(t) : "function" == typeof t ? t !== n.handler : String(n.path) !== String(t);
                    }), this;
                  }, this.resolve = U, this.navigate = q, this.navigateByName = function (t, n, e) {
                    var o = I(t, n);
                    return null !== o && (q(o.replace(new RegExp("^/?" + i), ""), e), !0);
                  }, this.destroy = function () {
                    this.routes = w = [], A && window.removeEventListener("popstate", this.__popstateListener), this.destroyed = L = !0;
                  }, this.notFound = function (t, n) {
                    return r._notFoundRoute = N("*", t, [e, n], "__NOT_FOUND__"), this;
                  }, this.updatePageLinks = F, this.link = function (t) {
                    return "/" + i + "/" + s(t);
                  }, this.hooks = function (t) {
                    return e = t, this;
                  }, this.extractGETParameters = function (t) {
                    return h(R(t));
                  }, this.lastResolved = function () {
                    return d;
                  }, this.generate = I, this.getLinkPath = function (t) {
                    return t.getAttribute("href");
                  }, this.match = function (t) {
                    var n = {
                      instance: r,
                      currentLocationPath: t,
                      to: t,
                      navigateOptions: {},
                      resolveOptions: o
                    };
                    return _(n, function () {}), !!n.matches && n.matches;
                  }, this.matchLocation = function (t, n, e) {
                    void 0 === n || void 0 !== e && !e || (n = E(n));
                    var o = {
                      instance: r,
                      to: n,
                      currentLocationPath: n
                    };
                    return y(o, function () {}), "string" == typeof t && (t = void 0 === e || e ? E(t) : t), l(o, {
                      name: String(t),
                      path: t,
                      handler: function () {},
                      hooks: {}
                    }) || !1;
                  }, this.getCurrentLocation = function () {
                    return M(s(a(i)).replace(new RegExp("^" + i), ""));
                  }, this.addBeforeHook = T.bind(this, "before"), this.addAfterHook = T.bind(this, "after"), this.addAlreadyHook = T.bind(this, "already"), this.addLeaveHook = T.bind(this, "leave"), this.getRoute = z, this._pathToMatchObject = M, this._clean = s, this._checkForAHash = R, this._setCurrent = function (t) {
                    return d = r.current = t;
                  }, function () {
                    A && (this.__popstateListener = function () {
                      r.__freezeListening || U();
                    }, window.addEventListener("popstate", this.__popstateListener));
                  }.call(this), F.call(this);
                }
              }
            },
            n = {};
          function e(o) {
            if (n[o]) return n[o].exports;
            var r = n[o] = {
              exports: {}
            };
            return t[o](r, r.exports, e), r.exports;
          }
          return e.d = function (t, n) {
            for (var o in n) e.o(n, o) && !e.o(t, o) && Object.defineProperty(t, o, {
              enumerable: !0,
              get: n[o]
            });
          }, e.o = function (t, n) {
            return Object.prototype.hasOwnProperty.call(t, n);
          }, e(407);
        }().default;
      });
    }, {}],
    4: [function (require, module, exports) {
      module.exports = {
        "name": "pict-application",
        "version": "1.0.33",
        "description": "Application base class for a pict view-based application",
        "main": "source/Pict-Application.js",
        "scripts": {
          "test": "npx quack test",
          "start": "node source/Pict-Application.js",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "docker-dev-build": "docker build ./ -f Dockerfile_LUXURYCode -t pict-application-image:local",
          "docker-dev-run": "docker run -it -d --name pict-application-dev -p 30001:8080 -p 38086:8086 -v \"$PWD/.config:/home/coder/.config\"  -v \"$PWD:/home/coder/pict-application\" -u \"$(id -u):$(id -g)\" -e \"DOCKER_USER=$USER\" pict-application-image:local",
          "docker-dev-shell": "docker exec -it pict-application-dev /bin/bash",
          "tests": "npx quack test -g",
          "lint": "eslint source/**",
          "types": "tsc -p ."
        },
        "types": "types/source/Pict-Application.d.ts",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/stevenvelozo/pict-application.git"
        },
        "author": "steven velozo <steven@velozo.com>",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/pict-application/issues"
        },
        "homepage": "https://github.com/stevenvelozo/pict-application#readme",
        "devDependencies": {
          "@eslint/js": "^9.28.0",
          "browser-env": "^3.3.0",
          "eslint": "^9.28.0",
          "pict": "^1.0.348",
          "pict-provider": "^1.0.10",
          "pict-view": "^1.0.66",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        },
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        },
        "dependencies": {
          "fable-serviceproviderbase": "^3.0.19"
        }
      };
    }, {}],
    5: [function (require, module, exports) {
      const libFableServiceBase = require('fable-serviceproviderbase');
      const libPackage = require('../package.json');
      const defaultPictSettings = {
        Name: 'DefaultPictApplication',
        // The main "viewport" is the view that is used to host our application
        MainViewportViewIdentifier: 'Default-View',
        MainViewportRenderableHash: false,
        MainViewportDestinationAddress: false,
        MainViewportDefaultDataAddress: false,
        // Whether or not we should automatically render the main viewport and other autorender views after we initialize the pict application
        AutoSolveAfterInitialize: true,
        AutoRenderMainViewportViewAfterInitialize: true,
        AutoRenderViewsAfterInitialize: false,
        AutoLoginAfterInitialize: false,
        AutoLoadDataAfterLogin: false,
        ConfigurationOnlyViews: [],
        Manifests: {},
        // The prefix to prepend on all template destination hashes
        IdentifierAddressPrefix: 'PICT-'
      };

      /**
       * Base class for pict applications.
       */
      class PictApplication extends libFableServiceBase {
        /**
         * @param {import('fable')} pFable
         * @param {Record<string, any>} [pOptions]
         * @param {string} [pServiceHash]
         */
        constructor(pFable, pOptions, pServiceHash) {
          let tmpCarryOverConfiguration = typeof pFable.settings.PictApplicationConfiguration === 'object' ? pFable.settings.PictApplicationConfiguration : {};
          let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultPictSettings)), tmpCarryOverConfiguration, pOptions);
          super(pFable, tmpOptions, pServiceHash);

          /** @type {any} */
          this.options;
          /** @type {any} */
          this.log;
          /** @type {import('pict') & import('fable')} */
          this.fable;
          /** @type {string} */
          this.UUID;
          /** @type {string} */
          this.Hash;
          /**
           * @type {{ [key: string]: any }}
           */
          this.servicesMap;
          this.serviceType = 'PictApplication';
          /** @type {Record<string, any>} */
          this._Package = libPackage;

          // Convenience and consistency naming
          this.pict = this.fable;
          // Wire in the essential Pict state
          /** @type {Record<string, any>} */
          this.AppData = this.fable.AppData;
          /** @type {Record<string, any>} */
          this.Bundle = this.fable.Bundle;

          /** @type {number} */
          this.initializeTimestamp;
          /** @type {number} */
          this.lastSolvedTimestamp;
          /** @type {number} */
          this.lastLoginTimestamp;
          /** @type {number} */
          this.lastMarshalFromViewsTimestamp;
          /** @type {number} */
          this.lastMarshalToViewsTimestamp;
          /** @type {number} */
          this.lastAutoRenderTimestamp;
          /** @type {number} */
          this.lastLoadDataTimestamp;

          // Load all the manifests for the application
          let tmpManifestKeys = Object.keys(this.options.Manifests);
          if (tmpManifestKeys.length > 0) {
            for (let i = 0; i < tmpManifestKeys.length; i++) {
              // Load each manifest
              let tmpManifestKey = tmpManifestKeys[i];
              this.fable.instantiateServiceProvider('Manifest', this.options.Manifests[tmpManifestKey], tmpManifestKey);
            }
          }
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Solve All Views                          */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onPreSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onPreSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onPreSolveAsync(fCallback) {
          this.onPreSolve();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onBeforeSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeSolveAsync(fCallback) {
          this.onBeforeSolve();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onSolveAsync(fCallback) {
          this.onSolve();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        solve() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} executing solve() function...`);
          }

          // Walk through any loaded providers and solve them as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToSolve = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoSolveWithApp) {
              tmpProvidersToSolve.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToSolve.sort((a, b) => {
            return a.options.AutoSolveOrdinal - b.options.AutoSolveOrdinal;
          });
          for (let i = 0; i < tmpProvidersToSolve.length; i++) {
            tmpProvidersToSolve[i].solve(tmpProvidersToSolve[i]);
          }
          this.onBeforeSolve();
          // Now walk through any loaded views and initialize them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToSolve = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoInitialize) {
              tmpViewsToSolve.push(tmpView);
            }
          }
          // Sort the views by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpViewsToSolve.sort((a, b) => {
            return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
          });
          for (let i = 0; i < tmpViewsToSolve.length; i++) {
            tmpViewsToSolve[i].solve();
          }
          this.onSolve();
          this.onAfterSolve();
          this.lastSolvedTimestamp = this.fable.log.getTimeStamp();
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        solveAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          tmpAnticipate.anticipate(this.onBeforeSolveAsync.bind(this));

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          // Walk through any loaded providers and solve them as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToSolve = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoSolveWithApp) {
              tmpProvidersToSolve.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToSolve.sort((a, b) => {
            return a.options.AutoSolveOrdinal - b.options.AutoSolveOrdinal;
          });
          for (let i = 0; i < tmpProvidersToSolve.length; i++) {
            tmpAnticipate.anticipate(tmpProvidersToSolve[i].solveAsync.bind(tmpProvidersToSolve[i]));
          }

          // Walk through any loaded views and solve them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToSolve = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoSolveWithApp) {
              tmpViewsToSolve.push(tmpView);
            }
          }
          // Sort the views by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpViewsToSolve.sort((a, b) => {
            return a.options.AutoSolveOrdinal - b.options.AutoSolveOrdinal;
          });
          for (let i = 0; i < tmpViewsToSolve.length; i++) {
            tmpAnticipate.anticipate(tmpViewsToSolve[i].solveAsync.bind(tmpViewsToSolve[i]));
          }
          tmpAnticipate.anticipate(this.onSolveAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterSolveAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync() complete.`);
            }
            this.lastSolvedTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        onAfterSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterSolve:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterSolveAsync(fCallback) {
          this.onAfterSolve();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Application Login                        */
        /* -------------------------------------------------------------------------- */

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeLoginAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeLoginAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onLoginAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onLoginAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        loginAsync(fCallback) {
          const tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          let tmpCallback = fCallback;
          if (typeof tmpCallback !== 'function') {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loginAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loginAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeLoginAsync.bind(this));
          tmpAnticipate.anticipate(this.onLoginAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterLoginAsync.bind(this));

          // check and see if we should automatically trigger a data load
          if (this.options.AutoLoadDataAfterLogin) {
            tmpAnticipate.anticipate(fNext => {
              if (!this.isLoggedIn()) {
                return fNext();
              }
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto loading data after login...`);
              }
              //TODO: should data load errors funnel here? this creates a weird coupling between login and data load callbacks
              this.loadDataAsync(pError => {
                fNext(pError);
              });
            });
          }
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loginAsync() complete.`);
            }
            this.lastLoginTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Check if the application state is logged in. Defaults to true. Override this method in your application based on login requirements.
         *
         * @return {boolean}
         */
        isLoggedIn() {
          return true;
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterLoginAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterLoginAsync:`);
          }
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Application LoadData                     */
        /* -------------------------------------------------------------------------- */

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeLoadDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onLoadDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        loadDataAsync(fCallback) {
          const tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          let tmpCallback = fCallback;
          if (typeof tmpCallback !== 'function') {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loadDataAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loadDataAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeLoadDataAsync.bind(this));

          // Walk through any loaded providers and load their data as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToLoadData = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoLoadDataWithApp) {
              tmpProvidersToLoadData.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToLoadData.sort((a, b) => {
            return a.options.AutoLoadDataOrdinal - b.options.AutoLoadDataOrdinal;
          });
          for (const tmpProvider of tmpProvidersToLoadData) {
            tmpAnticipate.anticipate(tmpProvider.onBeforeLoadDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onLoadDataAsync.bind(this));

          //TODO: think about ways to parallelize these
          for (const tmpProvider of tmpProvidersToLoadData) {
            tmpAnticipate.anticipate(tmpProvider.onLoadDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onAfterLoadDataAsync.bind(this));
          for (const tmpProvider of tmpProvidersToLoadData) {
            tmpAnticipate.anticipate(tmpProvider.onAfterLoadDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.wait(/** @param {Error} [pError] */
          pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} loadDataAsync() complete.`);
            }
            this.lastLoadDataTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterLoadDataAsync:`);
          }
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Application SaveData                     */
        /* -------------------------------------------------------------------------- */

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeSaveDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onSaveDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        saveDataAsync(fCallback) {
          const tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
          let tmpCallback = fCallback;
          if (typeof tmpCallback !== 'function') {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} saveDataAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} saveDataAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeSaveDataAsync.bind(this));

          // Walk through any loaded providers and load their data as well.
          let tmpLoadedProviders = Object.keys(this.pict.providers);
          let tmpProvidersToSaveData = [];
          for (let i = 0; i < tmpLoadedProviders.length; i++) {
            let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
            if (tmpProvider.options.AutoSaveDataWithApp) {
              tmpProvidersToSaveData.push(tmpProvider);
            }
          }
          // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
          tmpProvidersToSaveData.sort((a, b) => {
            return a.options.AutoSaveDataOrdinal - b.options.AutoSaveDataOrdinal;
          });
          for (const tmpProvider of tmpProvidersToSaveData) {
            tmpAnticipate.anticipate(tmpProvider.onBeforeSaveDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onSaveDataAsync.bind(this));

          //TODO: think about ways to parallelize these
          for (const tmpProvider of tmpProvidersToSaveData) {
            tmpAnticipate.anticipate(tmpProvider.onSaveDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.anticipate(this.onAfterSaveDataAsync.bind(this));
          for (const tmpProvider of tmpProvidersToSaveData) {
            tmpAnticipate.anticipate(tmpProvider.onAfterSaveDataAsync.bind(tmpProvider));
          }
          tmpAnticipate.wait(/** @param {Error} [pError] */
          pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} saveDataAsync() complete.`);
            }
            this.lastSaveDataTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterSaveDataAsync:`);
          }
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Initialize Application                   */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeInitializeAsync(fCallback) {
          this.onBeforeInitialize();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onInitializeAsync(fCallback) {
          this.onInitialize();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        initialize() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} initialize:`);
          }
          if (!this.initializeTimestamp) {
            this.onBeforeInitialize();
            if ('ConfigurationOnlyViews' in this.options) {
              // Load all the configuration only views
              for (let i = 0; i < this.options.ConfigurationOnlyViews.length; i++) {
                let tmpViewIdentifier = typeof this.options.ConfigurationOnlyViews[i].ViewIdentifier === 'undefined' ? `AutoView-${this.fable.getUUID()}` : this.options.ConfigurationOnlyViews[i].ViewIdentifier;
                this.log.info(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} adding configuration only view: ${tmpViewIdentifier}`);
                this.pict.addView(tmpViewIdentifier, this.options.ConfigurationOnlyViews[i]);
              }
            }
            this.onInitialize();

            // Walk through any loaded providers and initialize them as well.
            let tmpLoadedProviders = Object.keys(this.pict.providers);
            let tmpProvidersToInitialize = [];
            for (let i = 0; i < tmpLoadedProviders.length; i++) {
              let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
              if (tmpProvider.options.AutoInitialize) {
                tmpProvidersToInitialize.push(tmpProvider);
              }
            }
            // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
            tmpProvidersToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpProvidersToInitialize.length; i++) {
              tmpProvidersToInitialize[i].initialize();
            }

            // Now walk through any loaded views and initialize them as well.
            let tmpLoadedViews = Object.keys(this.pict.views);
            let tmpViewsToInitialize = [];
            for (let i = 0; i < tmpLoadedViews.length; i++) {
              let tmpView = this.pict.views[tmpLoadedViews[i]];
              if (tmpView.options.AutoInitialize) {
                tmpViewsToInitialize.push(tmpView);
              }
            }
            // Sort the views by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
            tmpViewsToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpViewsToInitialize.length; i++) {
              tmpViewsToInitialize[i].initialize();
            }
            this.onAfterInitialize();
            if (this.options.AutoSolveAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto solving after initialization...`);
              }
              // Solve the template synchronously
              this.solve();
            }
            // Now check and see if we should automatically render as well
            if (this.options.AutoRenderMainViewportViewAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto rendering after initialization...`);
              }
              // Render the template synchronously
              this.render();
            }
            this.initializeTimestamp = this.fable.log.getTimeStamp();
            this.onCompletionOfInitialize();
            return true;
          } else {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initialize called but initialization is already completed.  Aborting.`);
            return false;
          }
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        initializeAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync:`);
          }

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (!this.initializeTimestamp) {
            let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');
            if (this.pict.LogNoisiness > 3) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} beginning initialization...`);
            }
            if ('ConfigurationOnlyViews' in this.options) {
              // Load all the configuration only views
              for (let i = 0; i < this.options.ConfigurationOnlyViews.length; i++) {
                let tmpViewIdentifier = typeof this.options.ConfigurationOnlyViews[i].ViewIdentifier === 'undefined' ? `AutoView-${this.fable.getUUID()}` : this.options.ConfigurationOnlyViews[i].ViewIdentifier;
                this.log.info(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} adding configuration only view: ${tmpViewIdentifier}`);
                this.pict.addView(tmpViewIdentifier, this.options.ConfigurationOnlyViews[i]);
              }
            }
            tmpAnticipate.anticipate(this.onBeforeInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onInitializeAsync.bind(this));

            // Walk through any loaded providers and solve them as well.
            let tmpLoadedProviders = Object.keys(this.pict.providers);
            let tmpProvidersToInitialize = [];
            for (let i = 0; i < tmpLoadedProviders.length; i++) {
              let tmpProvider = this.pict.providers[tmpLoadedProviders[i]];
              if (tmpProvider.options.AutoInitialize) {
                tmpProvidersToInitialize.push(tmpProvider);
              }
            }
            // Sort the providers by their priority (if they are all priority 0, it will end up being add order due to JSON Object Property Key order stuff)
            tmpProvidersToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpProvidersToInitialize.length; i++) {
              tmpAnticipate.anticipate(tmpProvidersToInitialize[i].initializeAsync.bind(tmpProvidersToInitialize[i]));
            }

            // Now walk through any loaded views and initialize them as well.
            // TODO: Some optimization cleverness could be gained by grouping them into a parallelized async operation, by ordinal.
            let tmpLoadedViews = Object.keys(this.pict.views);
            let tmpViewsToInitialize = [];
            for (let i = 0; i < tmpLoadedViews.length; i++) {
              let tmpView = this.pict.views[tmpLoadedViews[i]];
              if (tmpView.options.AutoInitialize) {
                tmpViewsToInitialize.push(tmpView);
              }
            }
            // Sort the views by their priority
            // If they are all the default priority 0, it will end up being add order due to JSON Object Property Key order stuff
            tmpViewsToInitialize.sort((a, b) => {
              return a.options.AutoInitializeOrdinal - b.options.AutoInitializeOrdinal;
            });
            for (let i = 0; i < tmpViewsToInitialize.length; i++) {
              let tmpView = tmpViewsToInitialize[i];
              tmpAnticipate.anticipate(tmpView.initializeAsync.bind(tmpView));
            }
            tmpAnticipate.anticipate(this.onAfterInitializeAsync.bind(this));
            if (this.options.AutoLoginAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto login (asynchronously) after initialization...`);
              }
              tmpAnticipate.anticipate(this.loginAsync.bind(this));
            }
            if (this.options.AutoSolveAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto solving (asynchronously) after initialization...`);
              }
              tmpAnticipate.anticipate(this.solveAsync.bind(this));
            }
            if (this.options.AutoRenderMainViewportViewAfterInitialize) {
              if (this.pict.LogNoisiness > 1) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} auto rendering (asynchronously) after initialization...`);
              }
              tmpAnticipate.anticipate(this.renderMainViewportAsync.bind(this));
            }
            tmpAnticipate.wait(pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initializeAsync Error: ${pError.message || pError}`, {
                  stack: pError.stack
                });
              }
              this.initializeTimestamp = this.fable.log.getTimeStamp();
              if (this.pict.LogNoisiness > 2) {
                this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} initialization complete.`);
              }
              return tmpCallback();
            });
          } else {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} async initialize called but initialization is already completed.  Aborting.`);
            // TODO: Should this be an error?
            return this.onCompletionOfInitializeAsync(tmpCallback);
          }
        }

        /**
         * @return {boolean}
         */
        onAfterInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterInitializeAsync(fCallback) {
          this.onAfterInitialize();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onCompletionOfInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onCompletionOfInitialize:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onCompletionOfInitializeAsync(fCallback) {
          this.onCompletionOfInitialize();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal Data From All Views              */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeMarshalFromViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeMarshalFromViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeMarshalFromViewsAsync(fCallback) {
          this.onBeforeMarshalFromViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onMarshalFromViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onMarshalFromViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onMarshalFromViewsAsync(fCallback) {
          this.onMarshalFromViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        marshalFromViews() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} executing marshalFromViews() function...`);
          }
          this.onBeforeMarshalFromViews();
          // Now walk through any loaded views and initialize them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalFromViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalFromViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalFromViews.length; i++) {
            tmpViewsToMarshalFromViews[i].marshalFromView();
          }
          this.onMarshalFromViews();
          this.onAfterMarshalFromViews();
          this.lastMarshalFromViewsTimestamp = this.fable.log.getTimeStamp();
          return true;
        }

        /**
         * @param {(error?: Error) => void} fCallback
         */
        marshalFromViewsAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewsAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewsAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalFromViewsAsync.bind(this));
          // Walk through any loaded views and marshalFromViews them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalFromViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalFromViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalFromViews.length; i++) {
            tmpAnticipate.anticipate(tmpViewsToMarshalFromViews[i].marshalFromViewAsync.bind(tmpViewsToMarshalFromViews[i]));
          }
          tmpAnticipate.anticipate(this.onMarshalFromViewsAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalFromViewsAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewsAsync() complete.`);
            }
            this.lastMarshalFromViewsTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        onAfterMarshalFromViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterMarshalFromViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterMarshalFromViewsAsync(fCallback) {
          this.onAfterMarshalFromViews();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal Data To All Views                */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeMarshalToViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeMarshalToViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeMarshalToViewsAsync(fCallback) {
          this.onBeforeMarshalToViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        onMarshalToViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onMarshalToViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onMarshalToViewsAsync(fCallback) {
          this.onMarshalToViews();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        marshalToViews() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} executing marshalToViews() function...`);
          }
          this.onBeforeMarshalToViews();
          // Now walk through any loaded views and initialize them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalToViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalToViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalToViews.length; i++) {
            tmpViewsToMarshalToViews[i].marshalToView();
          }
          this.onMarshalToViews();
          this.onAfterMarshalToViews();
          this.lastMarshalToViewsTimestamp = this.fable.log.getTimeStamp();
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        marshalToViewsAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewsAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewsAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalToViewsAsync.bind(this));
          // Walk through any loaded views and marshalToViews them as well.
          let tmpLoadedViews = Object.keys(this.pict.views);
          let tmpViewsToMarshalToViews = [];
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            tmpViewsToMarshalToViews.push(tmpView);
          }
          for (let i = 0; i < tmpViewsToMarshalToViews.length; i++) {
            tmpAnticipate.anticipate(tmpViewsToMarshalToViews[i].marshalToViewAsync.bind(tmpViewsToMarshalToViews[i]));
          }
          tmpAnticipate.anticipate(this.onMarshalToViewsAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalToViewsAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewsAsync() complete.`);
            }
            this.lastMarshalToViewsTimestamp = this.fable.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        onAfterMarshalToViews() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterMarshalToViews:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterMarshalToViewsAsync(fCallback) {
          this.onAfterMarshalToViews();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Render View                              */
        /* -------------------------------------------------------------------------- */
        /**
         * @return {boolean}
         */
        onBeforeRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onBeforeRender:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onBeforeRenderAsync(fCallback) {
          this.onBeforeRender();
          return fCallback();
        }

        /**
         * @param {string} [pViewIdentifier] - The hash of the view to render. By default, the main viewport view is rendered.
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string} [pTemplateDataAddress] - The address where the data for the template is stored.
         *
         * TODO: Should we support objects for pTemplateDataAddress for parity with pict-view?
         */
        render(pViewIdentifier, pRenderableHash, pRenderDestinationAddress, pTemplateDataAddress) {
          let tmpViewIdentifier = typeof pViewIdentifier !== 'string' ? this.options.MainViewportViewIdentifier : pViewIdentifier;
          let tmpRenderableHash = typeof pRenderableHash !== 'string' ? this.options.MainViewportRenderableHash : pRenderableHash;
          let tmpRenderDestinationAddress = typeof pRenderDestinationAddress !== 'string' ? this.options.MainViewportDestinationAddress : pRenderDestinationAddress;
          let tmpTemplateDataAddress = typeof pTemplateDataAddress !== 'string' ? this.options.MainViewportDefaultDataAddress : pTemplateDataAddress;
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} VIEW Renderable[${tmpRenderableHash}] Destination[${tmpRenderDestinationAddress}] TemplateDataAddress[${tmpTemplateDataAddress}] render:`);
          }
          this.onBeforeRender();

          // Now get the view (by hash) from the loaded views
          let tmpView = typeof tmpViewIdentifier === 'string' ? this.servicesMap.PictView[tmpViewIdentifier] : false;
          if (!tmpView) {
            this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} could not render from View ${tmpViewIdentifier} because it is not a valid view.`);
            return false;
          }
          this.onRender();
          tmpView.render(tmpRenderableHash, tmpRenderDestinationAddress, tmpTemplateDataAddress);
          this.onAfterRender();
          return true;
        }
        /**
         * @return {boolean}
         */
        onRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onRender:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onRenderAsync(fCallback) {
          this.onRender();
          return fCallback();
        }

        /**
         * @param {string|((error?: Error) => void)} pViewIdentifier - The hash of the view to render. By default, the main viewport view is rendered. (or the callback)
         * @param {string|((error?: Error) => void)} [pRenderableHash] - The hash of the renderable to render. (or the callback)
         * @param {string|((error?: Error) => void)} [pRenderDestinationAddress] - The address where the renderable will be rendered. (or the callback)
         * @param {string|((error?: Error) => void)} [pTemplateDataAddress] - The address where the data for the template is stored. (or the callback)
         * @param {(error?: Error) => void} [fCallback] - The callback, if all other parameters are provided.
         *
         * TODO: Should we support objects for pTemplateDataAddress for parity with pict-view?
         */
        renderAsync(pViewIdentifier, pRenderableHash, pRenderDestinationAddress, pTemplateDataAddress, fCallback) {
          let tmpViewIdentifier = typeof pViewIdentifier !== 'string' ? this.options.MainViewportViewIdentifier : pViewIdentifier;
          let tmpRenderableHash = typeof pRenderableHash !== 'string' ? this.options.MainViewportRenderableHash : pRenderableHash;
          let tmpRenderDestinationAddress = typeof pRenderDestinationAddress !== 'string' ? this.options.MainViewportDestinationAddress : pRenderDestinationAddress;
          let tmpTemplateDataAddress = typeof pTemplateDataAddress !== 'string' ? this.options.MainViewportDefaultDataAddress : pTemplateDataAddress;

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : typeof pTemplateDataAddress === 'function' ? pTemplateDataAddress : typeof pRenderDestinationAddress === 'function' ? pRenderDestinationAddress : typeof pRenderableHash === 'function' ? pRenderableHash : typeof pViewIdentifier === 'function' ? pViewIdentifier : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} VIEW Renderable[${tmpRenderableHash}] Destination[${tmpRenderDestinationAddress}] TemplateDataAddress[${tmpTemplateDataAddress}] renderAsync:`);
          }
          let tmpRenderAnticipate = this.fable.newAnticipate();
          tmpRenderAnticipate.anticipate(this.onBeforeRenderAsync.bind(this));
          let tmpView = typeof tmpViewIdentifier === 'string' ? this.servicesMap.PictView[tmpViewIdentifier] : false;
          if (!tmpView) {
            let tmpErrorMessage = `PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} could not asynchronously render from View ${tmpViewIdentifier} because it is not a valid view.`;
            if (this.pict.LogNoisiness > 3) {
              this.log.error(tmpErrorMessage);
            }
            return tmpCallback(new Error(tmpErrorMessage));
          }
          tmpRenderAnticipate.anticipate(this.onRenderAsync.bind(this));
          tmpRenderAnticipate.anticipate(fNext => {
            tmpView.renderAsync.call(tmpView, tmpRenderableHash, tmpRenderDestinationAddress, tmpTemplateDataAddress, fNext);
          });
          tmpRenderAnticipate.anticipate(this.onAfterRenderAsync.bind(this));
          return tmpRenderAnticipate.wait(tmpCallback);
        }

        /**
         * @return {boolean}
         */
        onAfterRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} onAfterRender:`);
          }
          return true;
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        onAfterRenderAsync(fCallback) {
          this.onAfterRender();
          return fCallback();
        }

        /**
         * @return {boolean}
         */
        renderMainViewport() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderMainViewport:`);
          }
          return this.render();
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        renderMainViewportAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow APPLICATION [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderMainViewportAsync:`);
          }
          return this.renderAsync(fCallback);
        }
        /**
         * @return {void}
         */
        renderAutoViews() {
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} beginning renderAutoViews...`);
          }
          // Now walk through any loaded views and sort them by the AutoRender ordinal
          let tmpLoadedViews = Object.keys(this.pict.views);
          // Sort the views by their priority
          // If they are all the default priority 0, it will end up being add order due to JSON Object Property Key order stuff
          tmpLoadedViews.sort((a, b) => {
            return this.pict.views[a].options.AutoRenderOrdinal - this.pict.views[b].options.AutoRenderOrdinal;
          });
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoRender) {
              tmpView.render();
            }
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync complete.`);
          }
        }
        /**
         * @param {(error?: Error) => void} fCallback
         */
        renderAutoViewsAsync(fCallback) {
          let tmpAnticipate = this.fable.instantiateServiceProviderWithoutRegistration('Anticipate');

          // Allow the callback to be passed in as the last parameter no matter what
          let tmpCallback = typeof fCallback === 'function' ? fCallback : false;
          if (!tmpCallback) {
            this.log.warn(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} beginning renderAutoViewsAsync...`);
          }

          // Now walk through any loaded views and sort them by the AutoRender ordinal
          // TODO: Some optimization cleverness could be gained by grouping them into a parallelized async operation, by ordinal.
          let tmpLoadedViews = Object.keys(this.pict.views);
          // Sort the views by their priority
          // If they are all the default priority 0, it will end up being add order due to JSON Object Property Key order stuff
          tmpLoadedViews.sort((a, b) => {
            return this.pict.views[a].options.AutoRenderOrdinal - this.pict.views[b].options.AutoRenderOrdinal;
          });
          for (let i = 0; i < tmpLoadedViews.length; i++) {
            let tmpView = this.pict.views[tmpLoadedViews[i]];
            if (tmpView.options.AutoRender) {
              tmpAnticipate.anticipate(tmpView.renderAsync.bind(tmpView));
            }
          }
          tmpAnticipate.wait(pError => {
            this.lastAutoRenderTimestamp = this.fable.log.getTimeStamp();
            if (this.pict.LogNoisiness > 0) {
              this.log.trace(`PictApp [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAutoViewsAsync complete.`);
            }
            return tmpCallback(pError);
          });
        }

        /**
         * @return {boolean}
         */
        get isPictApplication() {
          return true;
        }
      }
      module.exports = PictApplication;
    }, {
      "../package.json": 4,
      "fable-serviceproviderbase": 2
    }],
    6: [function (require, module, exports) {
      module.exports = {
        "name": "pict-provider",
        "version": "1.0.12",
        "description": "Pict Provider Base Class",
        "main": "source/Pict-Provider.js",
        "scripts": {
          "start": "node source/Pict-Provider.js",
          "test": "npx quack test",
          "tests": "npx quack test -g",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "docker-dev-build": "docker build ./ -f Dockerfile_LUXURYCode -t pict-provider-image:local",
          "docker-dev-run": "docker run -it -d --name pict-provider-dev -p 24125:8080 -p 30027:8086 -v \"$PWD/.config:/home/coder/.config\"  -v \"$PWD:/home/coder/pict-provider\" -u \"$(id -u):$(id -g)\" -e \"DOCKER_USER=$USER\" pict-provider-image:local",
          "docker-dev-shell": "docker exec -it pict-provider-dev /bin/bash",
          "lint": "eslint source/**",
          "types": "tsc -p ."
        },
        "types": "types/source/Pict-Provider.d.ts",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/stevenvelozo/pict-provider.git"
        },
        "author": "steven velozo <steven@velozo.com>",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/pict-provider/issues"
        },
        "homepage": "https://github.com/stevenvelozo/pict-provider#readme",
        "devDependencies": {
          "@eslint/js": "^9.39.1",
          "eslint": "^9.39.1",
          "pict": "^1.0.351",
          "quackage": "^1.0.58",
          "typescript": "^5.9.3"
        },
        "dependencies": {
          "fable-serviceproviderbase": "^3.0.19"
        },
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        }
      };
    }, {}],
    7: [function (require, module, exports) {
      const libFableServiceBase = require('fable-serviceproviderbase');
      const libPackage = require('../package.json');
      const defaultPictProviderSettings = {
        ProviderIdentifier: false,
        // If this is set to true, when the App initializes this will.
        // After the App initializes, initialize will be called as soon as it's added.
        AutoInitialize: true,
        AutoInitializeOrdinal: 0,
        AutoLoadDataWithApp: true,
        AutoLoadDataOrdinal: 0,
        AutoSolveWithApp: true,
        AutoSolveOrdinal: 0,
        Manifests: {},
        Templates: []
      };
      class PictProvider extends libFableServiceBase {
        /**
         * @param {import('fable')} pFable - The Fable instance.
         * @param {Record<string, any>} [pOptions] - The options for the provider.
         * @param {string} [pServiceHash] - The service hash for the provider.
         */
        constructor(pFable, pOptions, pServiceHash) {
          // Intersect default options, parent constructor, service information
          let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultPictProviderSettings)), pOptions);
          super(pFable, tmpOptions, pServiceHash);

          /** @type {import('fable') & import('pict') & { instantiateServiceProviderWithoutRegistration(pServiceType: string, pOptions?: Record<string, any>, pCustomServiceHash?: string): any }} */
          this.fable;
          /** @type {import('fable') & import('pict') & { instantiateServiceProviderWithoutRegistration(pServiceType: string, pOptions?: Record<string, any>, pCustomServiceHash?: string): any }} */
          this.pict;
          /** @type {any} */
          this.log;
          /** @type {Record<string, any>} */
          this.options;
          /** @type {string} */
          this.UUID;
          /** @type {string} */
          this.Hash;
          if (!this.options.ProviderIdentifier) {
            this.options.ProviderIdentifier = `AutoProviderID-${this.fable.getUUID()}`;
          }
          this.serviceType = 'PictProvider';
          /** @type {Record<string, any>} */
          this._Package = libPackage;

          // Convenience and consistency naming
          this.pict = this.fable;

          // Wire in the essential Pict application state
          /** @type {Record<string, any>} */
          this.AppData = this.pict.AppData;
          /** @type {Record<string, any>} */
          this.Bundle = this.pict.Bundle;
          this.initializeTimestamp = false;
          this.lastSolvedTimestamp = false;
          for (let i = 0; i < this.options.Templates.length; i++) {
            let tmpDefaultTemplate = this.options.Templates[i];
            if (!tmpDefaultTemplate.hasOwnProperty('Postfix') || !tmpDefaultTemplate.hasOwnProperty('Template')) {
              this.log.error(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} could not load Default Template ${i} in the options array.`, tmpDefaultTemplate);
            } else {
              if (!tmpDefaultTemplate.Source) {
                tmpDefaultTemplate.Source = `PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} options object.`;
              }
              this.pict.TemplateProvider.addDefaultTemplate(tmpDefaultTemplate.Prefix, tmpDefaultTemplate.Postfix, tmpDefaultTemplate.Template, tmpDefaultTemplate.Source);
            }
          }
        }

        /* -------------------------------------------------------------------------- */
        /*                        Code Section: Initialization                        */
        /* -------------------------------------------------------------------------- */
        onBeforeInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onBeforeInitialize:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after pre-pinitialization.
         *
         * @return {void}
         */
        onBeforeInitializeAsync(fCallback) {
          this.onBeforeInitialize();
          return fCallback();
        }
        onInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onInitialize:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after initialization.
         *
         * @return {void}
         */
        onInitializeAsync(fCallback) {
          this.onInitialize();
          return fCallback();
        }
        initialize() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow PROVIDER [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialize:`);
          }
          if (!this.initializeTimestamp) {
            this.onBeforeInitialize();
            this.onInitialize();
            this.onAfterInitialize();
            this.initializeTimestamp = this.pict.log.getTimeStamp();
            return true;
          } else {
            this.log.warn(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialize called but initialization is already completed.  Aborting.`);
            return false;
          }
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after initialization.
         *
         * @return {void}
         */
        initializeAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow PROVIDER [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initializeAsync:`);
          }
          if (!this.initializeTimestamp) {
            let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');
            if (this.pict.LogNoisiness > 0) {
              this.log.info(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} beginning initialization...`);
            }
            tmpAnticipate.anticipate(this.onBeforeInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onAfterInitializeAsync.bind(this));
            tmpAnticipate.wait(pError => {
              this.initializeTimestamp = this.pict.log.getTimeStamp();
              if (pError) {
                this.log.error(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialization failed: ${pError.message || pError}`, {
                  Stack: pError.stack
                });
              } else if (this.pict.LogNoisiness > 0) {
                this.log.info(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} initialization complete.`);
              }
              return fCallback();
            });
          } else {
            this.log.warn(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} async initialize called but initialization is already completed.  Aborting.`);
            // TODO: Should this be an error?
            return fCallback();
          }
        }
        onAfterInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onAfterInitialize:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after initialization.
         *
         * @return {void}
         */
        onAfterInitializeAsync(fCallback) {
          this.onAfterInitialize();
          return fCallback();
        }
        onPreRender() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onPreRender:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after pre-render.
         *
         * @return {void}
         */
        onPreRenderAsync(fCallback) {
          this.onPreRender();
          return fCallback();
        }
        render() {
          return this.onPreRender();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after render.
         *
         * @return {void}
         */
        renderAsync(fCallback) {
          this.onPreRender();
          return fCallback();
        }
        onPreSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onPreSolve:`);
          }
          return true;
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after pre-solve.
         *
         * @return {void}
         */
        onPreSolveAsync(fCallback) {
          this.onPreSolve();
          return fCallback();
        }
        solve() {
          return this.onPreSolve();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after solve.
         *
         * @return {void}
         */
        solveAsync(fCallback) {
          this.onPreSolve();
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data pre-load.
         */
        onBeforeLoadDataAsync(fCallback) {
          return fCallback();
        }

        /**
         * Hook to allow the provider to load data during application data load.
         *
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data load.
         */
        onLoadDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onLoadDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data post-load.
         */
        onAfterLoadDataAsync(fCallback) {
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data pre-load.
         *
         * @return {void}
         */
        onBeforeSaveDataAsync(fCallback) {
          return fCallback();
        }

        /**
         * Hook to allow the provider to load data during application data load.
         *
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data load.
         *
         * @return {void}
         */
        onSaveDataAsync(fCallback) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictProvider [${this.UUID}]::[${this.Hash}] ${this.options.ProviderIdentifier} onSaveDataAsync:`);
          }
          return fCallback();
        }

        /**
         * @param {(pError?: Error) => void} fCallback - The callback to call after the data post-load.
         *
         * @return {void}
         */
        onAfterSaveDataAsync(fCallback) {
          return fCallback();
        }
      }
      module.exports = PictProvider;
    }, {
      "../package.json": 6,
      "fable-serviceproviderbase": 2
    }],
    8: [function (require, module, exports) {
      const libPictProvider = require('pict-provider');
      const libNavigo = require('navigo');
      const _DEFAULT_PROVIDER_CONFIGURATION = {
        ProviderIdentifier: 'Pict-Router',
        AutoInitialize: true,
        AutoInitializeOrdinal: 0,
        // When true, addRoute() will NOT auto-resolve after each route is added.
        // This is useful in auth-gated SPAs where routes should only resolve after
        // the DOM is ready (e.g. after login).  Can also be set globally via
        // pict.settings.RouterSkipRouteResolveOnAdd — either one enables the skip.
        SkipRouteResolveOnAdd: false
      };
      class PictRouter extends libPictProvider {
        constructor(pFable, pOptions, pServiceHash) {
          let tmpOptions = Object.assign({}, _DEFAULT_PROVIDER_CONFIGURATION, pOptions);
          super(pFable, tmpOptions, pServiceHash);

          // Initialize the navigo router and set the base path to '/'
          this.router = new libNavigo('/', {
            strategy: 'ONE',
            hash: true
          });
          if (this.options.Routes) {
            for (let i = 0; i < this.options.Routes.length; i++) {
              if (this.options.Routes[i].path && this.options.Routes[i].template) {
                this.addRoute(this.options.Routes[i].path, this.options.Routes[i].template);
              } else if (this.options.Routes[i].path && this.options.Routes[i].render) {
                this.addRoute(this.options.Routes[i].path, this.options.Routes[i].render);
              } else {
                this.pict.log.warn(`Route ${i} is missing a render function or template string.`);
              }
            }
          }

          // This is the route to render after load
          this.afterPersistView = '/Manyfest/Overview';
        }
        get currentScope() {
          return this.AppData?.ManyfestRecord?.Scope ?? 'Default';
        }
        forwardToScopedRoute(pData) {
          this.navigate(`${pData.url}/${this.currentScope}`);
        }
        onInitializeAsync(fCallback) {
          return super.onInitializeAsync(fCallback);
        }

        /**
         * Add a route to the router.
         */
        addRoute(pRoute, pRenderable) {
          if (typeof pRenderable === 'function') {
            this.router.on(pRoute, pRenderable);
          } else if (typeof pRenderable === 'string') {
            // Run this as a template, allowing some whack things with functions in template expressions.
            this.router.on(pRoute, pData => {
              this.pict.parseTemplate(pRenderable, pData, null, this.pict);
            });
          } else {
            // renderable isn't usable!
            this.pict.log.warn(`Route ${pRoute} has an invalid renderable.`);
            return;
          }

          // By default, resolve after each route is added (legacy behavior).
          // Applications can skip this by setting SkipRouteResolveOnAdd: true in
          // the provider config JSON, or globally via
          // pict.settings.RouterSkipRouteResolveOnAdd.  Either one will prevent
          // premature route resolution before views are rendered.
          if (!this.options.SkipRouteResolveOnAdd && !this.pict.settings.RouterSkipRouteResolveOnAdd) {
            this.resolve();
          }
        }

        /**
         * Navigate to a given route (set the browser URL string, add to history, trigger router)
         * 
         * @param {string} pRoute - The route to navigate to
         */
        navigate(pRoute) {
          this.router.navigate(pRoute);
        }

        /**
         * Navigate to the route currently in the browser's location hash.
         *
         * This is useful in auth-gated SPAs: when the user pastes a deep-link
         * (e.g. #/Books) and then logs in, calling navigateCurrent() will force
         * the router to fire the handler for whatever hash is already in the URL.
         * Unlike resolve(), navigate() always triggers the handler even if Navigo
         * has already "consumed" that URL.
         *
         * If the hash is empty or just "#/", this is a no-op and returns false.
         *
         * @returns {boolean} true if a route was navigated to, false otherwise
         */
        navigateCurrent() {
          let tmpHash = typeof window !== 'undefined' && window.location ? window.location.hash : '';
          if (tmpHash && tmpHash.length > 2 && tmpHash !== '#/') {
            let tmpRoute = tmpHash.replace(/^#/, '');
            this.navigate(tmpRoute);
            return true;
          }
          return false;
        }

        /**
         * Trigger the router resolving logic; this is expected to be called after all routes are added (to go to the default route).
         *
         */
        resolve() {
          this.router.resolve();
        }
      }
      module.exports = PictRouter;
      module.exports.default_configuration = _DEFAULT_PROVIDER_CONFIGURATION;
    }, {
      "navigo": 3,
      "pict-provider": 7
    }],
    9: [function (require, module, exports) {
      /**
       * Pict-Modal-Confirm
       *
       * Builds confirm and double-confirm dialog DOM, returns Promises.
       */
      class PictModalConfirm {
        constructor(pModal) {
          this._modal = pModal;
        }

        /**
         * Show a single-step confirmation dialog.
         *
         * @param {string} pMessage - The confirmation message
         * @param {object} [pOptions] - Options (title, confirmLabel, cancelLabel, dangerous)
         * @returns {Promise<boolean>}
         */
        confirm(pMessage, pOptions) {
          let tmpOptions = Object.assign({}, this._modal.options.DefaultConfirmOptions, pOptions);
          return new Promise(fResolve => {
            let tmpDialog = this._buildDialog(tmpOptions.title, pMessage, fResolve, tmpOptions);
            this._showDialog(tmpDialog, fResolve);
          });
        }

        /**
         * Show a two-step confirmation dialog.
         *
         * If confirmPhrase is provided, user must type it to enable the confirm button.
         * Otherwise, first click changes button text, second click confirms.
         *
         * @param {string} pMessage - The confirmation message
         * @param {object} [pOptions] - Options (title, confirmPhrase, phrasePrompt, confirmLabel, cancelLabel)
         * @returns {Promise<boolean>}
         */
        doubleConfirm(pMessage, pOptions) {
          let tmpOptions = Object.assign({}, this._modal.options.DefaultDoubleConfirmOptions, pOptions);
          return new Promise(fResolve => {
            let tmpDialog = this._buildDoubleConfirmDialog(tmpOptions.title, pMessage, fResolve, tmpOptions);
            this._showDialog(tmpDialog, fResolve);
          });
        }

        /**
         * Build a standard confirm dialog element.
         *
         * @param {string} pTitle
         * @param {string} pMessage
         * @param {function} fResolve - Promise resolver
         * @param {object} pOptions
         * @returns {HTMLElement}
         */
        _buildDialog(pTitle, pMessage, fResolve, pOptions) {
          let tmpId = this._modal._nextId();
          let tmpBtnStyle = pOptions.dangerous ? 'danger' : 'primary';
          let tmpDialog = document.createElement('div');
          tmpDialog.className = 'pict-modal-dialog';
          if (pOptions.unbounded) {
            tmpDialog.className += ' pict-modal-dialog--unbounded';
          }
          tmpDialog.id = 'pict-modal-' + tmpId;
          tmpDialog.setAttribute('role', 'dialog');
          tmpDialog.setAttribute('aria-modal', 'true');
          tmpDialog.style.width = '420px';
          tmpDialog.innerHTML = '<div class="pict-modal-dialog-header">' + '<span class="pict-modal-dialog-title">' + this._escapeHTML(pTitle) + '</span>' + '<button class="pict-modal-dialog-close" aria-label="Close">&times;</button>' + '</div>' + '<div class="pict-modal-dialog-body">' + '<p>' + this._escapeHTML(pMessage) + '</p>' + '</div>' + '<div class="pict-modal-dialog-footer">' + '<button class="pict-modal-btn" data-action="cancel">' + this._escapeHTML(pOptions.cancelLabel) + '</button>' + '<button class="pict-modal-btn pict-modal-btn--' + tmpBtnStyle + '" data-action="confirm">' + this._escapeHTML(pOptions.confirmLabel) + '</button>' + '</div>';
          let tmpCloseBtn = tmpDialog.querySelector('.pict-modal-dialog-close');
          let tmpCancelBtn = tmpDialog.querySelector('[data-action="cancel"]');
          let tmpConfirmBtn = tmpDialog.querySelector('[data-action="confirm"]');
          let tmpDismiss = pResult => {
            this._dismissDialog(tmpDialog, pResult, fResolve);
          };
          tmpCloseBtn.addEventListener('click', () => {
            tmpDismiss(false);
          });
          tmpCancelBtn.addEventListener('click', () => {
            tmpDismiss(false);
          });
          tmpConfirmBtn.addEventListener('click', () => {
            tmpDismiss(true);
          });
          tmpDialog._dismiss = tmpDismiss;
          tmpDialog._focusTarget = tmpCancelBtn;
          return tmpDialog;
        }

        /**
         * Build a double-confirm dialog element.
         *
         * @param {string} pTitle
         * @param {string} pMessage
         * @param {function} fResolve - Promise resolver
         * @param {object} pOptions
         * @returns {HTMLElement}
         */
        _buildDoubleConfirmDialog(pTitle, pMessage, fResolve, pOptions) {
          let tmpId = this._modal._nextId();
          let tmpHasPhrase = typeof pOptions.confirmPhrase === 'string' && pOptions.confirmPhrase.length > 0;
          let tmpDialog = document.createElement('div');
          tmpDialog.className = 'pict-modal-dialog';
          if (pOptions.unbounded) {
            tmpDialog.className += ' pict-modal-dialog--unbounded';
          }
          tmpDialog.id = 'pict-modal-' + tmpId;
          tmpDialog.setAttribute('role', 'dialog');
          tmpDialog.setAttribute('aria-modal', 'true');
          tmpDialog.style.width = '420px';
          let tmpBodyContent = '<p>' + this._escapeHTML(pMessage) + '</p>';
          if (tmpHasPhrase) {
            let tmpPromptText = pOptions.phrasePrompt.replace('{phrase}', pOptions.confirmPhrase);
            tmpBodyContent += '<div class="pict-modal-confirm-prompt">' + this._escapeHTML(tmpPromptText) + '</div>' + '<input type="text" class="pict-modal-confirm-input" autocomplete="off" spellcheck="false" />';
          }
          tmpDialog.innerHTML = '<div class="pict-modal-dialog-header">' + '<span class="pict-modal-dialog-title">' + this._escapeHTML(pTitle) + '</span>' + '<button class="pict-modal-dialog-close" aria-label="Close">&times;</button>' + '</div>' + '<div class="pict-modal-dialog-body">' + tmpBodyContent + '</div>' + '<div class="pict-modal-dialog-footer">' + '<button class="pict-modal-btn" data-action="cancel">' + this._escapeHTML(pOptions.cancelLabel) + '</button>' + '<button class="pict-modal-btn pict-modal-btn--danger" data-action="confirm" disabled>' + this._escapeHTML(pOptions.confirmLabel) + '</button>' + '</div>';
          let tmpCloseBtn = tmpDialog.querySelector('.pict-modal-dialog-close');
          let tmpCancelBtn = tmpDialog.querySelector('[data-action="cancel"]');
          let tmpConfirmBtn = tmpDialog.querySelector('[data-action="confirm"]');
          let tmpDismiss = pResult => {
            this._dismissDialog(tmpDialog, pResult, fResolve);
          };
          tmpCloseBtn.addEventListener('click', () => {
            tmpDismiss(false);
          });
          tmpCancelBtn.addEventListener('click', () => {
            tmpDismiss(false);
          });
          if (tmpHasPhrase) {
            // Phrase-based: enable confirm button when input matches
            let tmpInput = tmpDialog.querySelector('.pict-modal-confirm-input');
            tmpInput.addEventListener('input', () => {
              tmpConfirmBtn.disabled = tmpInput.value !== pOptions.confirmPhrase;
            });
            tmpConfirmBtn.addEventListener('click', () => {
              if (!tmpConfirmBtn.disabled) {
                tmpDismiss(true);
              }
            });
            tmpDialog._focusTarget = tmpInput;
          } else {
            // Two-click: first click changes label, second click confirms
            let tmpClickCount = 0;
            let tmpOriginalLabel = pOptions.confirmLabel;
            tmpConfirmBtn.disabled = false;
            tmpConfirmBtn.addEventListener('click', () => {
              tmpClickCount++;
              if (tmpClickCount === 1) {
                tmpConfirmBtn.textContent = 'Click again to confirm';
              } else {
                tmpDismiss(true);
              }
            });
            tmpDialog._focusTarget = tmpCancelBtn;
          }
          tmpDialog._dismiss = tmpDismiss;
          return tmpDialog;
        }

        /**
         * Show a dialog element: append to body, show overlay, animate in.
         *
         * @param {HTMLElement} pDialog
         * @param {function} fResolve - Promise resolver (for overlay click dismiss)
         */
        _showDialog(pDialog, fResolve) {
          let tmpModalEntry = {
            element: pDialog,
            dismiss: pDialog._dismiss,
            type: 'confirm'
          };

          // Show overlay
          let tmpOverlayClickHandler = null;
          if (this._modal.options.OverlayClickDismisses) {
            tmpOverlayClickHandler = () => {
              pDialog._dismiss(false);
            };
          }
          this._modal._overlay.show(tmpOverlayClickHandler);

          // Append to body
          document.body.appendChild(pDialog);

          // Track active modal
          this._modal._activeModals.push(tmpModalEntry);

          // Animate in
          void pDialog.offsetHeight;
          pDialog.classList.add('pict-modal-visible');

          // Focus
          if (pDialog._focusTarget) {
            pDialog._focusTarget.focus();
          }

          // Keyboard handler
          pDialog._keyHandler = pEvent => {
            if (pEvent.key === 'Escape') {
              pDialog._dismiss(false);
            }
          };
          document.addEventListener('keydown', pDialog._keyHandler);
        }

        /**
         * Dismiss a dialog: animate out, remove from DOM, hide overlay.
         *
         * @param {HTMLElement} pDialog
         * @param {*} pResult - Value to resolve the promise with
         * @param {function} fResolve - Promise resolver
         */
        _dismissDialog(pDialog, pResult, fResolve) {
          // Prevent double-dismiss
          if (pDialog._dismissed) {
            return;
          }
          pDialog._dismissed = true;

          // Remove keyboard handler
          if (pDialog._keyHandler) {
            document.removeEventListener('keydown', pDialog._keyHandler);
          }

          // Animate out
          pDialog.classList.remove('pict-modal-visible');

          // Remove from active modals
          this._modal._activeModals = this._modal._activeModals.filter(pEntry => {
            return pEntry.element !== pDialog;
          });

          // Update overlay click handler to point to new topmost modal
          if (this._modal._activeModals.length > 0) {
            let tmpTopModal = this._modal._activeModals[this._modal._activeModals.length - 1];
            this._modal._overlay.updateClickHandler(this._modal.options.OverlayClickDismisses ? tmpTopModal.dismiss : null);
          }

          // Hide overlay
          this._modal._overlay.hide();

          // Remove from DOM after transition
          setTimeout(() => {
            if (pDialog.parentNode) {
              pDialog.parentNode.removeChild(pDialog);
            }
          }, 220);

          // Resolve promise
          fResolve(pResult);
        }

        /**
         * Escape HTML special characters.
         *
         * @param {string} pText
         * @returns {string}
         */
        _escapeHTML(pText) {
          if (typeof pText !== 'string') {
            return '';
          }
          return pText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
      }
      module.exports = PictModalConfirm;
    }, {}],
    10: [function (require, module, exports) {
      /**
       * Pict-Modal-Overlay
       *
       * Manages a shared backdrop overlay element appended to document.body.
       * Reference-counted — created on first modal open, removed when last closes.
       */
      class PictModalOverlay {
        constructor(pModal) {
          this._modal = pModal;
          this._element = null;
          this._refCount = 0;
        }

        /**
         * Show the overlay (incrementing reference count).
         * Creates the DOM element on first call.
         *
         * @param {function} [fOnClick] - Optional click handler (e.g. dismiss topmost modal)
         */
        show(fOnClick) {
          this._refCount++;
          if (!this._element) {
            this._element = document.createElement('div');
            this._element.className = 'pict-modal-overlay';
            document.body.appendChild(this._element);

            // Force reflow so the transition animates
            void this._element.offsetHeight;
            this._element.classList.add('pict-modal-visible');
          }
          if (fOnClick) {
            // Store the latest click handler (for the topmost modal)
            this._currentClickHandler = fOnClick;
            this._element.onclick = pEvent => {
              if (pEvent.target === this._element && this._currentClickHandler) {
                this._currentClickHandler();
              }
            };
          }
        }

        /**
         * Update the overlay click handler (e.g. when topmost modal changes).
         *
         * @param {function} [fOnClick] - New click handler
         */
        updateClickHandler(fOnClick) {
          this._currentClickHandler = fOnClick || null;
        }

        /**
         * Hide the overlay (decrementing reference count).
         * Removes the DOM element when reference count reaches zero.
         */
        hide() {
          this._refCount--;
          if (this._refCount <= 0) {
            this._refCount = 0;
            if (this._element) {
              this._element.classList.remove('pict-modal-visible');
              let tmpElement = this._element;
              // Remove after transition
              setTimeout(() => {
                if (tmpElement.parentNode) {
                  tmpElement.parentNode.removeChild(tmpElement);
                }
              }, 220);
              this._element = null;
              this._currentClickHandler = null;
            }
          }
        }

        /**
         * Force-remove the overlay regardless of reference count.
         */
        destroy() {
          this._refCount = 0;
          if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
          }
          this._element = null;
          this._currentClickHandler = null;
        }
      }
      module.exports = PictModalOverlay;
    }, {}],
    11: [function (require, module, exports) {
      /**
       * Pict-Modal-Panel
       *
       * Adds resizable and collapsible panel behavior to any DOM element.
       * Follows the handler composition pattern used by the other modal
       * handlers (confirm, window, toast, tooltip).
       *
       * Usage:
       *   let handle = modal.panel('#my-panel', { position: 'right', width: 340 });
       *   handle.toggle();
       *   handle.destroy();
       */
      class PictModalPanel {
        constructor(pModal) {
          this._modal = pModal;
          this._panels = [];
        }

        /**
         * Attach resizable/collapsible panel behavior to an element.
         *
         * @param {string} pTargetSelector - CSS selector for the panel element
         * @param {object} [pOptions] - Panel options
         * @returns {{ collapse, expand, toggle, setWidth, destroy }} Panel handle
         */
        create(pTargetSelector, pOptions) {
          let tmpDefaults = this._modal && this._modal.options && this._modal.options.DefaultPanelOptions || {};
          let tmpOptions = Object.assign({}, {
            position: 'right',
            width: 340,
            minWidth: 200,
            maxWidth: 600,
            collapsible: true,
            collapsed: false,
            persist: false,
            persistKey: '',
            onResize: null,
            onToggle: null
          }, tmpDefaults, pOptions);
          if (typeof document === 'undefined') return this._nullHandle();
          let tmpTarget = document.querySelector(pTargetSelector);
          if (!tmpTarget) return this._nullHandle();
          let tmpId = this._modal._nextId();
          let tmpIsRight = tmpOptions.position === 'right';
          let tmpIsCollapsed = false;
          let tmpCurrentWidth = tmpOptions.width;
          let tmpDestroyed = false;

          // Restore persisted state
          if (tmpOptions.persist && tmpOptions.persistKey) {
            try {
              let tmpStored = localStorage.getItem('pict-panel-' + tmpOptions.persistKey);
              if (tmpStored) {
                let tmpParsed = JSON.parse(tmpStored);
                if (typeof tmpParsed.width === 'number') tmpCurrentWidth = tmpParsed.width;
                if (typeof tmpParsed.collapsed === 'boolean') tmpOptions.collapsed = tmpParsed.collapsed;
              }
            } catch (e) {/* ignore */}
          }

          // Apply classes and initial width
          tmpTarget.classList.add('pict-panel');
          tmpTarget.classList.add(tmpIsRight ? 'pict-panel-right' : 'pict-panel-left');
          tmpTarget.style.width = tmpCurrentWidth + 'px';

          // Remove display:none if present — panel uses width collapse instead
          if (tmpTarget.style.display === 'none') {
            tmpTarget.style.display = '';
          }

          // ── Create the edge container ───────────────────────
          let tmpEdge = document.createElement('div');
          tmpEdge.className = 'pict-panel-edge ' + (tmpIsRight ? 'pict-panel-edge-right' : 'pict-panel-edge-left');

          // Resize handle
          let tmpResize = document.createElement('div');
          tmpResize.className = 'pict-panel-resize';
          tmpEdge.appendChild(tmpResize);

          // Collapse tab (chevron SVG)
          let tmpTab = null;
          if (tmpOptions.collapsible) {
            tmpTab = document.createElement('div');
            tmpTab.className = 'pict-panel-tab';
            tmpTab.title = 'Toggle panel';
            tmpEdge.appendChild(tmpTab);
          }

          // Insert edge as a sibling so it is not clipped by the
          // panel's own overflow (e.g. overflow-y: auto for scrolling).
          // Right panels: edge goes BEFORE the panel (left side).
          // Left panels: edge goes AFTER the panel (right side).
          if (tmpTarget.parentNode) {
            if (tmpIsRight) {
              tmpTarget.parentNode.insertBefore(tmpEdge, tmpTarget);
            } else {
              tmpTarget.parentNode.insertBefore(tmpEdge, tmpTarget.nextSibling);
            }
          } else {
            tmpTarget.insertBefore(tmpEdge, tmpTarget.firstChild);
          }

          // ── Chevron SVG helper ──────────────────────────────
          let tmpChevronRight = '<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,3 11,8 6,13"/></svg>';
          let tmpChevronLeft = '<svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,3 5,8 10,13"/></svg>';
          let tmpUpdateChevron = () => {
            if (!tmpTab) return;
            if (tmpIsRight) {
              tmpTab.innerHTML = tmpIsCollapsed ? tmpChevronLeft : tmpChevronRight;
            } else {
              tmpTab.innerHTML = tmpIsCollapsed ? tmpChevronRight : tmpChevronLeft;
            }
          };

          // ── Persist helper ──────────────────────────────────
          let tmpPersist = () => {
            if (!tmpOptions.persist || !tmpOptions.persistKey) return;
            try {
              localStorage.setItem('pict-panel-' + tmpOptions.persistKey, JSON.stringify({
                width: tmpCurrentWidth,
                collapsed: tmpIsCollapsed
              }));
            } catch (e) {/* ignore */}
          };

          // ── Collapse / expand ───────────────────────────────
          let tmpCollapse = () => {
            if (tmpIsCollapsed || tmpDestroyed) return;
            tmpIsCollapsed = true;
            tmpTarget.classList.add('pict-panel-collapsed');
            tmpEdge.classList.add('pict-panel-edge-collapsed');
            tmpUpdateChevron();
            tmpPersist();
            if (typeof tmpOptions.onToggle === 'function') tmpOptions.onToggle(true);
          };
          let tmpExpand = () => {
            if (!tmpIsCollapsed || tmpDestroyed) return;
            tmpIsCollapsed = false;
            tmpEdge.classList.remove('pict-panel-edge-collapsed');
            tmpTarget.classList.remove('pict-panel-collapsed');
            tmpTarget.style.width = tmpCurrentWidth + 'px';
            tmpUpdateChevron();
            tmpPersist();
            if (typeof tmpOptions.onToggle === 'function') tmpOptions.onToggle(false);
          };
          let tmpToggle = () => {
            if (tmpIsCollapsed) tmpExpand();else tmpCollapse();
          };
          let tmpSetWidth = pWidth => {
            if (tmpDestroyed) return;
            let tmpWidth = Math.max(tmpOptions.minWidth, Math.min(tmpOptions.maxWidth, pWidth));
            tmpCurrentWidth = tmpWidth;
            if (!tmpIsCollapsed) {
              tmpTarget.style.width = tmpWidth + 'px';
            }
            tmpPersist();
            if (typeof tmpOptions.onResize === 'function') tmpOptions.onResize(tmpWidth);
          };

          // ── Tab click ───────────────────────────────────────
          if (tmpTab) {
            tmpTab.addEventListener('click', pEvent => {
              pEvent.stopPropagation();
              tmpToggle();
            });
          }

          // ── Resize drag ─────────────────────────────────────
          let tmpOnMouseDown = pEvent => {
            if (tmpIsCollapsed) return;
            pEvent.preventDefault();
            let tmpStartX = pEvent.clientX;
            let tmpStartWidth = tmpTarget.offsetWidth;
            tmpResize.classList.add('dragging');
            tmpTarget.style.transition = 'none';
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
            let tmpOnMouseMove = pMoveEvent => {
              let tmpDelta = tmpIsRight ? tmpStartX - pMoveEvent.clientX : pMoveEvent.clientX - tmpStartX;
              let tmpNewWidth = Math.max(tmpOptions.minWidth, Math.min(tmpOptions.maxWidth, tmpStartWidth + tmpDelta));
              tmpTarget.style.width = tmpNewWidth + 'px';
            };
            let tmpOnMouseUp = pUpEvent => {
              document.removeEventListener('mousemove', tmpOnMouseMove);
              document.removeEventListener('mouseup', tmpOnMouseUp);
              tmpResize.classList.remove('dragging');
              tmpTarget.style.transition = '';
              document.body.style.userSelect = '';
              document.body.style.cursor = '';

              // Capture the final width
              tmpCurrentWidth = tmpTarget.offsetWidth;
              tmpPersist();
              if (typeof tmpOptions.onResize === 'function') tmpOptions.onResize(tmpCurrentWidth);
            };
            document.addEventListener('mousemove', tmpOnMouseMove);
            document.addEventListener('mouseup', tmpOnMouseUp);
          };
          tmpResize.addEventListener('mousedown', tmpOnMouseDown);

          // ── Initial state ───────────────────────────────────
          tmpUpdateChevron();
          if (tmpOptions.collapsed) {
            tmpIsCollapsed = true;
            tmpTarget.classList.add('pict-panel-collapsed');
            tmpEdge.classList.add('pict-panel-edge-collapsed');
            tmpUpdateChevron();
          }

          // ── Destroy ─────────────────────────────────────────
          let tmpDestroy = () => {
            if (tmpDestroyed) return;
            tmpDestroyed = true;
            tmpResize.removeEventListener('mousedown', tmpOnMouseDown);
            if (tmpEdge.parentNode) tmpEdge.remove();
            tmpTarget.classList.remove('pict-panel', 'pict-panel-right', 'pict-panel-left', 'pict-panel-collapsed');
            tmpTarget.style.width = '';
            tmpTarget.style.transition = '';
            let tmpIdx = this._panels.indexOf(tmpHandle);
            if (tmpIdx >= 0) this._panels.splice(tmpIdx, 1);
          };

          // ── Return handle ───────────────────────────────────
          let tmpHandle = {
            id: tmpId,
            collapse: tmpCollapse,
            expand: tmpExpand,
            toggle: tmpToggle,
            setWidth: tmpSetWidth,
            destroy: tmpDestroy
          };
          this._panels.push(tmpHandle);
          return tmpHandle;
        }

        /**
         * Return a no-op handle for server-side or missing-element cases.
         */
        _nullHandle() {
          return {
            id: 0,
            collapse: () => {},
            expand: () => {},
            toggle: () => {},
            setWidth: () => {},
            destroy: () => {}
          };
        }

        /**
         * Destroy all active panels.
         */
        destroyAll() {
          let tmpPanels = this._panels.slice();
          for (let i = 0; i < tmpPanels.length; i++) {
            tmpPanels[i].destroy();
          }
        }
      }
      module.exports = PictModalPanel;
    }, {}],
    12: [function (require, module, exports) {
      /**
       * Pict-Modal-Toast
       *
       * Manages toast notification elements with auto-dismiss and stacking.
       */
      class PictModalToast {
        constructor(pModal) {
          this._modal = pModal;
          this._containers = {};
        }

        /**
         * Show a toast notification.
         *
         * @param {string} pMessage - Toast message text
         * @param {object} [pOptions] - Options (type, duration, position, dismissible)
         * @returns {{ dismiss: function }} Handle with dismiss method
         */
        toast(pMessage, pOptions) {
          let tmpOptions = Object.assign({}, this._modal.options.DefaultToastOptions, pOptions);
          let tmpContainer = this._getContainer(tmpOptions.position);
          let tmpId = this._modal._nextId();
          let tmpToast = document.createElement('div');
          tmpToast.className = 'pict-modal-toast pict-modal-toast--' + tmpOptions.type;
          tmpToast.id = 'pict-modal-toast-' + tmpId;
          let tmpContent = '<span class="pict-modal-toast-message">' + this._escapeHTML(pMessage) + '</span>';
          if (tmpOptions.dismissible) {
            tmpContent += '<button class="pict-modal-toast-dismiss" aria-label="Dismiss">&times;</button>';
          }
          tmpToast.innerHTML = tmpContent;

          // Create handle
          let tmpDismissed = false;
          let tmpTimeoutHandle = null;
          let tmpDismiss = () => {
            if (tmpDismissed) {
              return;
            }
            tmpDismissed = true;
            if (tmpTimeoutHandle) {
              clearTimeout(tmpTimeoutHandle);
            }

            // Exit animation
            tmpToast.classList.remove('pict-modal-visible');
            tmpToast.classList.add('pict-modal-toast-exit');

            // Remove from active list
            this._modal._activeToasts = this._modal._activeToasts.filter(pEntry => {
              return pEntry.element !== tmpToast;
            });

            // Remove from DOM after transition
            setTimeout(() => {
              if (tmpToast.parentNode) {
                tmpToast.parentNode.removeChild(tmpToast);
              }
              this._cleanupContainer(tmpOptions.position);
            }, 220);
          };
          let tmpHandle = {
            dismiss: tmpDismiss
          };

          // Wire dismiss button
          if (tmpOptions.dismissible) {
            let tmpDismissBtn = tmpToast.querySelector('.pict-modal-toast-dismiss');
            if (tmpDismissBtn) {
              tmpDismissBtn.addEventListener('click', tmpDismiss);
            }
          }

          // Append to container
          tmpContainer.appendChild(tmpToast);

          // Track
          let tmpEntry = {
            element: tmpToast,
            dismiss: tmpDismiss,
            handle: tmpHandle
          };
          this._modal._activeToasts.push(tmpEntry);

          // Animate in
          void tmpToast.offsetHeight;
          tmpToast.classList.add('pict-modal-visible');

          // Auto-dismiss
          if (tmpOptions.duration > 0) {
            tmpTimeoutHandle = setTimeout(tmpDismiss, tmpOptions.duration);
          }
          return tmpHandle;
        }

        /**
         * Get or create a toast container for the given position.
         *
         * @param {string} pPosition - Position key (e.g. 'top-right')
         * @returns {HTMLElement}
         */
        _getContainer(pPosition) {
          if (this._containers[pPosition]) {
            return this._containers[pPosition];
          }
          let tmpContainer = document.createElement('div');
          tmpContainer.className = 'pict-modal-toast-container pict-modal-toast-container--' + pPosition;
          document.body.appendChild(tmpContainer);
          this._containers[pPosition] = tmpContainer;
          return tmpContainer;
        }

        /**
         * Remove a container if it has no more toasts.
         *
         * @param {string} pPosition
         */
        _cleanupContainer(pPosition) {
          let tmpContainer = this._containers[pPosition];
          if (tmpContainer && tmpContainer.children.length === 0) {
            if (tmpContainer.parentNode) {
              tmpContainer.parentNode.removeChild(tmpContainer);
            }
            delete this._containers[pPosition];
          }
        }

        /**
         * Dismiss all active toasts.
         */
        dismissAll() {
          let tmpToasts = this._modal._activeToasts.slice();
          for (let i = 0; i < tmpToasts.length; i++) {
            tmpToasts[i].dismiss();
          }
        }

        /**
         * Destroy all containers.
         */
        destroy() {
          this.dismissAll();
          let tmpPositions = Object.keys(this._containers);
          for (let i = 0; i < tmpPositions.length; i++) {
            let tmpContainer = this._containers[tmpPositions[i]];
            if (tmpContainer && tmpContainer.parentNode) {
              tmpContainer.parentNode.removeChild(tmpContainer);
            }
          }
          this._containers = {};
        }

        /**
         * Escape HTML special characters.
         *
         * @param {string} pText
         * @returns {string}
         */
        _escapeHTML(pText) {
          if (typeof pText !== 'string') {
            return '';
          }
          return pText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
      }
      module.exports = PictModalToast;
    }, {}],
    13: [function (require, module, exports) {
      /**
       * Pict-Modal-Tooltip
       *
       * Manages simple text and rich HTML tooltips with positioning and auto-flip.
       */
      class PictModalTooltip {
        constructor(pModal) {
          this._modal = pModal;
        }

        /**
         * Attach a simple text tooltip to an element.
         *
         * @param {HTMLElement} pElement - Target element
         * @param {string} pText - Tooltip text
         * @param {object} [pOptions] - Options (position, delay, maxWidth)
         * @returns {{ destroy: function }} Handle to remove the tooltip
         */
        tooltip(pElement, pText, pOptions) {
          let tmpOptions = Object.assign({}, this._modal.options.DefaultTooltipOptions, pOptions);
          return this._attachTooltip(pElement, pText, false, tmpOptions);
        }

        /**
         * Attach a rich HTML tooltip to an element.
         *
         * @param {HTMLElement} pElement - Target element
         * @param {string} pHTMLContent - HTML content for the tooltip
         * @param {object} [pOptions] - Options (position, delay, maxWidth, interactive)
         * @returns {{ destroy: function }} Handle to remove the tooltip
         */
        richTooltip(pElement, pHTMLContent, pOptions) {
          let tmpOptions = Object.assign({}, this._modal.options.DefaultTooltipOptions, pOptions);
          return this._attachTooltip(pElement, pHTMLContent, true, tmpOptions);
        }

        /**
         * Internal: attach tooltip event listeners to an element.
         *
         * @param {HTMLElement} pElement
         * @param {string} pContent
         * @param {boolean} pIsHTML
         * @param {object} pOptions
         * @returns {{ destroy: function }}
         */
        _attachTooltip(pElement, pContent, pIsHTML, pOptions) {
          let tmpTooltipElement = null;
          let tmpShowTimeout = null;
          let tmpHideTimeout = null;
          let tmpDestroyed = false;
          let tmpId = this._modal._nextId();
          let tmpShow = () => {
            if (tmpDestroyed || tmpTooltipElement) {
              return;
            }
            tmpTooltipElement = document.createElement('div');
            tmpTooltipElement.className = 'pict-modal-tooltip pict-modal-tooltip--' + pOptions.position;
            tmpTooltipElement.id = 'pict-modal-tooltip-' + tmpId;
            tmpTooltipElement.setAttribute('role', 'tooltip');
            tmpTooltipElement.style.maxWidth = pOptions.maxWidth;
            if (pOptions.interactive) {
              tmpTooltipElement.classList.add('pict-modal-tooltip-interactive');
            }

            // Arrow
            let tmpArrow = document.createElement('div');
            tmpArrow.className = 'pict-modal-tooltip-arrow';

            // Content
            let tmpContentDiv = document.createElement('div');
            if (pIsHTML) {
              tmpContentDiv.innerHTML = pContent;
            } else {
              tmpContentDiv.textContent = pContent;
            }
            tmpTooltipElement.appendChild(tmpArrow);
            tmpTooltipElement.appendChild(tmpContentDiv);
            document.body.appendChild(tmpTooltipElement);

            // Set aria-describedby on target
            pElement.setAttribute('aria-describedby', tmpTooltipElement.id);

            // Position
            this._positionTooltip(tmpTooltipElement, pElement, pOptions.position);

            // Animate in
            void tmpTooltipElement.offsetHeight;
            tmpTooltipElement.classList.add('pict-modal-visible');

            // Track
            this._modal._activeTooltips.push({
              element: tmpTooltipElement,
              targetElement: pElement,
              destroy: tmpDestroy
            });

            // For interactive tooltips, allow hovering over the tooltip itself
            if (pOptions.interactive && tmpTooltipElement) {
              tmpTooltipElement.addEventListener('mouseenter', () => {
                if (tmpHideTimeout) {
                  clearTimeout(tmpHideTimeout);
                  tmpHideTimeout = null;
                }
              });
              tmpTooltipElement.addEventListener('mouseleave', () => {
                tmpHide();
              });
            }
          };
          let tmpHide = () => {
            if (!tmpTooltipElement) {
              return;
            }
            tmpTooltipElement.classList.remove('pict-modal-visible');
            let tmpEl = tmpTooltipElement;
            tmpTooltipElement = null;

            // Remove aria
            pElement.removeAttribute('aria-describedby');

            // Remove from tracking
            this._modal._activeTooltips = this._modal._activeTooltips.filter(pEntry => {
              return pEntry.element !== tmpEl;
            });
            setTimeout(() => {
              if (tmpEl.parentNode) {
                tmpEl.parentNode.removeChild(tmpEl);
              }
            }, 220);
          };
          let tmpOnMouseEnter = () => {
            if (tmpHideTimeout) {
              clearTimeout(tmpHideTimeout);
              tmpHideTimeout = null;
            }
            tmpShowTimeout = setTimeout(tmpShow, pOptions.delay);
          };
          let tmpOnMouseLeave = () => {
            if (tmpShowTimeout) {
              clearTimeout(tmpShowTimeout);
              tmpShowTimeout = null;
            }
            // Small delay before hiding to allow moving to interactive tooltip
            if (pOptions.interactive) {
              tmpHideTimeout = setTimeout(tmpHide, 100);
            } else {
              tmpHide();
            }
          };
          let tmpOnFocusIn = () => {
            tmpShowTimeout = setTimeout(tmpShow, pOptions.delay);
          };
          let tmpOnFocusOut = () => {
            if (tmpShowTimeout) {
              clearTimeout(tmpShowTimeout);
              tmpShowTimeout = null;
            }
            tmpHide();
          };

          // Attach listeners
          pElement.addEventListener('mouseenter', tmpOnMouseEnter);
          pElement.addEventListener('mouseleave', tmpOnMouseLeave);
          pElement.addEventListener('focusin', tmpOnFocusIn);
          pElement.addEventListener('focusout', tmpOnFocusOut);
          let tmpDestroy = () => {
            if (tmpDestroyed) {
              return;
            }
            tmpDestroyed = true;
            if (tmpShowTimeout) {
              clearTimeout(tmpShowTimeout);
            }
            if (tmpHideTimeout) {
              clearTimeout(tmpHideTimeout);
            }
            tmpHide();
            pElement.removeEventListener('mouseenter', tmpOnMouseEnter);
            pElement.removeEventListener('mouseleave', tmpOnMouseLeave);
            pElement.removeEventListener('focusin', tmpOnFocusIn);
            pElement.removeEventListener('focusout', tmpOnFocusOut);
          };
          return {
            destroy: tmpDestroy
          };
        }

        /**
         * Position a tooltip element relative to the target element.
         * Flips direction if the tooltip would overflow the viewport.
         *
         * @param {HTMLElement} pTooltip
         * @param {HTMLElement} pTarget
         * @param {string} pPosition - 'top', 'bottom', 'left', 'right'
         */
        _positionTooltip(pTooltip, pTarget, pPosition) {
          let tmpTargetRect = pTarget.getBoundingClientRect();
          let tmpTooltipRect = pTooltip.getBoundingClientRect();
          let tmpGap = 8;
          let tmpPosition = pPosition;

          // Flip if needed
          if (tmpPosition === 'top' && tmpTargetRect.top < tmpTooltipRect.height + tmpGap) {
            tmpPosition = 'bottom';
          } else if (tmpPosition === 'bottom' && window.innerHeight - tmpTargetRect.bottom < tmpTooltipRect.height + tmpGap) {
            tmpPosition = 'top';
          } else if (tmpPosition === 'left' && tmpTargetRect.left < tmpTooltipRect.width + tmpGap) {
            tmpPosition = 'right';
          } else if (tmpPosition === 'right' && window.innerWidth - tmpTargetRect.right < tmpTooltipRect.width + tmpGap) {
            tmpPosition = 'left';
          }

          // Update class for arrow direction
          pTooltip.className = pTooltip.className.replace(/pict-modal-tooltip--\w+/, 'pict-modal-tooltip--' + tmpPosition);
          let tmpTop = 0;
          let tmpLeft = 0;
          switch (tmpPosition) {
            case 'top':
              tmpTop = tmpTargetRect.top - tmpTooltipRect.height - tmpGap;
              tmpLeft = tmpTargetRect.left + tmpTargetRect.width / 2 - tmpTooltipRect.width / 2;
              break;
            case 'bottom':
              tmpTop = tmpTargetRect.bottom + tmpGap;
              tmpLeft = tmpTargetRect.left + tmpTargetRect.width / 2 - tmpTooltipRect.width / 2;
              break;
            case 'left':
              tmpTop = tmpTargetRect.top + tmpTargetRect.height / 2 - tmpTooltipRect.height / 2;
              tmpLeft = tmpTargetRect.left - tmpTooltipRect.width - tmpGap;
              break;
            case 'right':
              tmpTop = tmpTargetRect.top + tmpTargetRect.height / 2 - tmpTooltipRect.height / 2;
              tmpLeft = tmpTargetRect.right + tmpGap;
              break;
          }

          // Clamp to viewport
          tmpLeft = Math.max(4, Math.min(tmpLeft, window.innerWidth - tmpTooltipRect.width - 4));
          tmpTop = Math.max(4, Math.min(tmpTop, window.innerHeight - tmpTooltipRect.height - 4));
          pTooltip.style.top = tmpTop + 'px';
          pTooltip.style.left = tmpLeft + 'px';
        }

        /**
         * Dismiss all active tooltips.
         */
        dismissAll() {
          let tmpTooltips = this._modal._activeTooltips.slice();
          for (let i = 0; i < tmpTooltips.length; i++) {
            tmpTooltips[i].destroy();
          }
        }
      }
      module.exports = PictModalTooltip;
    }, {}],
    14: [function (require, module, exports) {
      /**
       * Pict-Modal-Window
       *
       * Builds custom floating modal windows with arbitrary content and buttons.
       */
      class PictModalWindow {
        constructor(pModal) {
          this._modal = pModal;
        }

        /**
         * Show a custom modal window.
         *
         * @param {object} [pOptions] - Options
         * @param {string} [pOptions.title] - Dialog title
         * @param {string} [pOptions.content] - HTML content for the body
         * @param {Array} [pOptions.buttons] - Array of { Hash, Label, Style }
         * @param {boolean} [pOptions.closeable] - Whether the close button and overlay dismiss are enabled
         * @param {string} [pOptions.width] - CSS width value
         * @param {boolean} [pOptions.unbounded] - If true, removes the default 90vh/90vw viewport cap. The dialog will grow with its content and may extend beyond the viewport.
         * @param {function} [pOptions.onOpen] - Called after dialog is shown, receives dialog element
         * @param {function} [pOptions.onClose] - Called after dialog is dismissed
         * @returns {Promise<string|null>} Resolves with clicked button Hash, or null on close
         */
        show(pOptions) {
          let tmpOptions = Object.assign({}, this._modal.options.DefaultModalOptions, pOptions);
          return new Promise(fResolve => {
            let tmpDialog = this._buildDialog(tmpOptions, fResolve);
            this._showDialog(tmpDialog, tmpOptions, fResolve);
          });
        }

        /**
         * Build the modal dialog element.
         *
         * @param {object} pOptions
         * @param {function} fResolve
         * @returns {HTMLElement}
         */
        _buildDialog(pOptions, fResolve) {
          let tmpId = this._modal._nextId();
          let tmpDialog = document.createElement('div');
          tmpDialog.className = 'pict-modal-dialog';
          if (pOptions.unbounded) {
            tmpDialog.className += ' pict-modal-dialog--unbounded';
          }
          tmpDialog.id = 'pict-modal-' + tmpId;
          tmpDialog.setAttribute('role', 'dialog');
          tmpDialog.setAttribute('aria-modal', 'true');
          tmpDialog.style.width = pOptions.width;

          // Header
          let tmpHeaderHTML = '';
          if (pOptions.title || pOptions.closeable) {
            tmpHeaderHTML = '<div class="pict-modal-dialog-header">';
            tmpHeaderHTML += '<span class="pict-modal-dialog-title">' + this._escapeHTML(pOptions.title) + '</span>';
            if (pOptions.closeable) {
              tmpHeaderHTML += '<button class="pict-modal-dialog-close" aria-label="Close">&times;</button>';
            }
            tmpHeaderHTML += '</div>';
          }

          // Body
          let tmpBodyHTML = '<div class="pict-modal-dialog-body">' + (pOptions.content || '') + '</div>';

          // Footer with buttons
          let tmpFooterHTML = '';
          if (pOptions.buttons && pOptions.buttons.length > 0) {
            tmpFooterHTML = '<div class="pict-modal-dialog-footer">';
            for (let i = 0; i < pOptions.buttons.length; i++) {
              let tmpButton = pOptions.buttons[i];
              let tmpBtnClass = 'pict-modal-btn';
              if (tmpButton.Style) {
                tmpBtnClass += ' pict-modal-btn--' + tmpButton.Style;
              }
              tmpFooterHTML += '<button class="' + tmpBtnClass + '" data-hash="' + this._escapeHTML(tmpButton.Hash) + '">' + this._escapeHTML(tmpButton.Label) + '</button>';
            }
            tmpFooterHTML += '</div>';
          }
          tmpDialog.innerHTML = tmpHeaderHTML + tmpBodyHTML + tmpFooterHTML;
          let tmpDismiss = pResult => {
            this._dismissDialog(tmpDialog, pResult, fResolve, pOptions);
          };

          // Wire close button
          if (pOptions.closeable) {
            let tmpCloseBtn = tmpDialog.querySelector('.pict-modal-dialog-close');
            if (tmpCloseBtn) {
              tmpCloseBtn.addEventListener('click', () => {
                tmpDismiss(null);
              });
            }
          }

          // Wire action buttons
          let tmpActionButtons = tmpDialog.querySelectorAll('[data-hash]');
          for (let i = 0; i < tmpActionButtons.length; i++) {
            let tmpBtn = tmpActionButtons[i];
            tmpBtn.addEventListener('click', () => {
              tmpDismiss(tmpBtn.getAttribute('data-hash'));
            });
          }
          tmpDialog._dismiss = tmpDismiss;
          return tmpDialog;
        }

        /**
         * Show the dialog: append to body, show overlay, animate in.
         *
         * @param {HTMLElement} pDialog
         * @param {object} pOptions
         * @param {function} fResolve
         */
        _showDialog(pDialog, pOptions, fResolve) {
          let tmpModalEntry = {
            element: pDialog,
            dismiss: pDialog._dismiss,
            type: 'window'
          };

          // Show overlay
          let tmpOverlayClickHandler = null;
          if (this._modal.options.OverlayClickDismisses && pOptions.closeable) {
            tmpOverlayClickHandler = () => {
              pDialog._dismiss(null);
            };
          }
          this._modal._overlay.show(tmpOverlayClickHandler);

          // Append to body
          document.body.appendChild(pDialog);

          // Track
          this._modal._activeModals.push(tmpModalEntry);

          // Animate in
          void pDialog.offsetHeight;
          pDialog.classList.add('pict-modal-visible');

          // Focus first button or close button
          let tmpFocusTarget = pDialog.querySelector('.pict-modal-btn') || pDialog.querySelector('.pict-modal-dialog-close');
          if (tmpFocusTarget) {
            tmpFocusTarget.focus();
          }

          // Keyboard handler
          pDialog._keyHandler = pEvent => {
            if (pEvent.key === 'Escape' && pOptions.closeable) {
              pDialog._dismiss(null);
            }
          };
          document.addEventListener('keydown', pDialog._keyHandler);

          // onOpen callback
          if (typeof pOptions.onOpen === 'function') {
            pOptions.onOpen(pDialog);
          }
        }

        /**
         * Dismiss the dialog: animate out, remove from DOM, hide overlay.
         *
         * @param {HTMLElement} pDialog
         * @param {*} pResult
         * @param {function} fResolve
         * @param {object} pOptions
         */
        _dismissDialog(pDialog, pResult, fResolve, pOptions) {
          if (pDialog._dismissed) {
            return;
          }
          pDialog._dismissed = true;
          if (pDialog._keyHandler) {
            document.removeEventListener('keydown', pDialog._keyHandler);
          }
          pDialog.classList.remove('pict-modal-visible');
          this._modal._activeModals = this._modal._activeModals.filter(pEntry => {
            return pEntry.element !== pDialog;
          });
          if (this._modal._activeModals.length > 0) {
            let tmpTopModal = this._modal._activeModals[this._modal._activeModals.length - 1];
            this._modal._overlay.updateClickHandler(this._modal.options.OverlayClickDismisses ? tmpTopModal.dismiss : null);
          }
          this._modal._overlay.hide();
          setTimeout(() => {
            if (pDialog.parentNode) {
              pDialog.parentNode.removeChild(pDialog);
            }
          }, 220);
          if (typeof pOptions.onClose === 'function') {
            pOptions.onClose(pResult);
          }
          fResolve(pResult);
        }

        /**
         * Escape HTML special characters.
         *
         * @param {string} pText
         * @returns {string}
         */
        _escapeHTML(pText) {
          if (typeof pText !== 'string') {
            return '';
          }
          return pText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
      }
      module.exports = PictModalWindow;
    }, {}],
    15: [function (require, module, exports) {
      module.exports = {
        "AutoInitialize": true,
        "AutoRender": false,
        "AutoSolveWithApp": false,
        "ViewIdentifier": "Pict-Section-Modal",
        "OverlayClickDismisses": true,
        "DefaultConfirmOptions": {
          "title": "Confirm",
          "confirmLabel": "OK",
          "cancelLabel": "Cancel",
          "dangerous": false,
          "unbounded": false
        },
        "DefaultDoubleConfirmOptions": {
          "title": "Are you sure?",
          "confirmLabel": "Confirm",
          "cancelLabel": "Cancel",
          "phrasePrompt": "Type \"{phrase}\" to confirm:",
          "confirmPhrase": "",
          "unbounded": false
        },
        "DefaultModalOptions": {
          "title": "",
          "content": "",
          "buttons": [],
          "closeable": true,
          "width": "480px",
          "unbounded": false
        },
        "DefaultTooltipOptions": {
          "position": "top",
          "delay": 200,
          "maxWidth": "300px",
          "interactive": false
        },
        "DefaultToastOptions": {
          "type": "info",
          "duration": 3000,
          "position": "top-right",
          "dismissible": true
        },
        "DefaultPanelOptions": {
          "position": "right",
          "width": 340,
          "minWidth": 200,
          "maxWidth": 600,
          "collapsible": true,
          "collapsed": false,
          "persist": false,
          "persistKey": ""
        },
        "Templates": [],
        "Renderables": [],
        "CSS": /*css*/`
/* pict-section-modal */
.pict-modal-root
{
	/* Overlay */
	--pict-modal-overlay-bg: rgba(0, 0, 0, 0.5);

	/* Dialog */
	--pict-modal-bg: #ffffff;
	--pict-modal-fg: #1a1a1a;
	--pict-modal-border: #e0e0e0;
	--pict-modal-border-radius: 8px;
	--pict-modal-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
	--pict-modal-header-bg: #f5f5f5;
	--pict-modal-header-fg: #1a1a1a;
	--pict-modal-header-border: #e0e0e0;

	/* Buttons */
	--pict-modal-btn-bg: #e0e0e0;
	--pict-modal-btn-fg: #1a1a1a;
	--pict-modal-btn-hover-bg: #d0d0d0;
	--pict-modal-btn-primary-bg: #2563eb;
	--pict-modal-btn-primary-fg: #ffffff;
	--pict-modal-btn-primary-hover-bg: #1d4ed8;
	--pict-modal-btn-danger-bg: #dc2626;
	--pict-modal-btn-danger-fg: #ffffff;
	--pict-modal-btn-danger-hover-bg: #b91c1c;
	--pict-modal-btn-border-radius: 4px;

	/* Toast */
	--pict-modal-toast-bg: #333333;
	--pict-modal-toast-fg: #ffffff;
	--pict-modal-toast-success-bg: #16a34a;
	--pict-modal-toast-warning-bg: #d97706;
	--pict-modal-toast-error-bg: #dc2626;
	--pict-modal-toast-info-bg: #2563eb;
	--pict-modal-toast-border-radius: 6px;
	--pict-modal-toast-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

	/* Tooltip */
	--pict-modal-tooltip-bg: #1a1a1a;
	--pict-modal-tooltip-fg: #ffffff;
	--pict-modal-tooltip-border-radius: 4px;
	--pict-modal-tooltip-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

	/* Typography */
	--pict-modal-font-family: system-ui, -apple-system, sans-serif;
	--pict-modal-font-size: 14px;
	--pict-modal-title-font-size: 16px;

	/* Animation */
	--pict-modal-transition-duration: 200ms;
}

/* Overlay */
.pict-modal-overlay
{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 1000;
	background: var(--pict-modal-overlay-bg);
	opacity: 0;
	transition: opacity var(--pict-modal-transition-duration) ease;
}

.pict-modal-overlay.pict-modal-visible
{
	opacity: 1;
}

/* Dialog */
.pict-modal-dialog
{
	position: fixed;
	z-index: 1010;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%) translateY(-20px);
	opacity: 0;
	transition: opacity var(--pict-modal-transition-duration) ease,
	            transform var(--pict-modal-transition-duration) ease;

	max-width: 90vw;
	max-height: 90vh;
	display: flex;
	flex-direction: column;

	background: var(--pict-modal-bg);
	color: var(--pict-modal-fg);
	border: 1px solid var(--pict-modal-border);
	border-radius: var(--pict-modal-border-radius);
	box-shadow: var(--pict-modal-shadow);
	font-family: var(--pict-modal-font-family);
	font-size: var(--pict-modal-font-size);
}

.pict-modal-dialog.pict-modal-visible
{
	opacity: 1;
	transform: translate(-50%, -50%) translateY(0);
}

/* Unbounded modifier — lets callers opt out of the 90vh/90vw viewport cap.
   Use with caution: content taller than the viewport will push buttons
   below the fold. */
.pict-modal-dialog.pict-modal-dialog--unbounded
{
	max-height: none;
	max-width: none;
}

.pict-modal-dialog-header
{
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--pict-modal-header-bg);
	color: var(--pict-modal-header-fg);
	border-bottom: 1px solid var(--pict-modal-header-border);
	border-radius: var(--pict-modal-border-radius) var(--pict-modal-border-radius) 0 0;
}

.pict-modal-dialog-title
{
	font-size: var(--pict-modal-title-font-size);
	font-weight: 600;
}

.pict-modal-dialog-close
{
	background: none;
	border: none;
	font-size: 20px;
	cursor: pointer;
	color: var(--pict-modal-fg);
	padding: 0 4px;
	line-height: 1;
	opacity: 0.6;
}

.pict-modal-dialog-close:hover
{
	opacity: 1;
}

.pict-modal-dialog-body
{
	padding: 16px;
	overflow-y: auto;
	flex: 1;
}

.pict-modal-dialog-footer
{
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding: 12px 16px;
	border-top: 1px solid var(--pict-modal-border);
}

/* Buttons */
.pict-modal-btn
{
	padding: 8px 16px;
	border: none;
	border-radius: var(--pict-modal-btn-border-radius);
	font-family: var(--pict-modal-font-family);
	font-size: var(--pict-modal-font-size);
	cursor: pointer;
	background: var(--pict-modal-btn-bg);
	color: var(--pict-modal-btn-fg);
	transition: background var(--pict-modal-transition-duration) ease;
}

.pict-modal-btn:hover
{
	background: var(--pict-modal-btn-hover-bg);
}

.pict-modal-btn:disabled
{
	opacity: 0.5;
	cursor: not-allowed;
}

.pict-modal-btn--primary
{
	background: var(--pict-modal-btn-primary-bg);
	color: var(--pict-modal-btn-primary-fg);
}

.pict-modal-btn--primary:hover
{
	background: var(--pict-modal-btn-primary-hover-bg);
}

.pict-modal-btn--danger
{
	background: var(--pict-modal-btn-danger-bg);
	color: var(--pict-modal-btn-danger-fg);
}

.pict-modal-btn--danger:hover
{
	background: var(--pict-modal-btn-danger-hover-bg);
}

/* Double confirm input */
.pict-modal-confirm-input
{
	width: 100%;
	padding: 8px 12px;
	margin-top: 12px;
	border: 1px solid var(--pict-modal-border);
	border-radius: var(--pict-modal-btn-border-radius);
	font-family: var(--pict-modal-font-family);
	font-size: var(--pict-modal-font-size);
	box-sizing: border-box;
}

.pict-modal-confirm-input:focus
{
	outline: 2px solid var(--pict-modal-btn-primary-bg);
	outline-offset: -1px;
}

.pict-modal-confirm-prompt
{
	margin-top: 12px;
	font-size: 13px;
	color: var(--pict-modal-fg);
	opacity: 0.7;
}

/* Toast container */
.pict-modal-toast-container
{
	position: fixed;
	z-index: 1030;
	display: flex;
	flex-direction: column;
	gap: 8px;
	pointer-events: none;
	max-width: 400px;
}

.pict-modal-toast-container--top-right
{
	top: 16px;
	right: 16px;
}

.pict-modal-toast-container--top-left
{
	top: 16px;
	left: 16px;
}

.pict-modal-toast-container--bottom-right
{
	bottom: 16px;
	right: 16px;
}

.pict-modal-toast-container--bottom-left
{
	bottom: 16px;
	left: 16px;
}

.pict-modal-toast-container--top-center
{
	top: 16px;
	left: 50%;
	transform: translateX(-50%);
}

.pict-modal-toast-container--bottom-center
{
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
}

/* Toast */
.pict-modal-toast
{
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 16px;
	border-radius: var(--pict-modal-toast-border-radius);
	box-shadow: var(--pict-modal-toast-shadow);
	font-family: var(--pict-modal-font-family);
	font-size: var(--pict-modal-font-size);
	background: var(--pict-modal-toast-bg);
	color: var(--pict-modal-toast-fg);
	pointer-events: auto;
	opacity: 0;
	transform: translateX(100%);
	transition: opacity var(--pict-modal-transition-duration) ease,
	            transform var(--pict-modal-transition-duration) ease;
}

.pict-modal-toast.pict-modal-visible
{
	opacity: 1;
	transform: translateX(0);
}

.pict-modal-toast.pict-modal-toast-exit
{
	opacity: 0;
	transform: translateX(100%);
}

.pict-modal-toast--info
{
	background: var(--pict-modal-toast-info-bg);
}

.pict-modal-toast--success
{
	background: var(--pict-modal-toast-success-bg);
}

.pict-modal-toast--warning
{
	background: var(--pict-modal-toast-warning-bg);
}

.pict-modal-toast--error
{
	background: var(--pict-modal-toast-error-bg);
}

.pict-modal-toast-message
{
	flex: 1;
}

.pict-modal-toast-dismiss
{
	background: none;
	border: none;
	color: inherit;
	font-size: 18px;
	cursor: pointer;
	padding: 0 2px;
	line-height: 1;
	opacity: 0.7;
}

.pict-modal-toast-dismiss:hover
{
	opacity: 1;
}

/* Tooltip */
.pict-modal-tooltip
{
	position: fixed;
	z-index: 1020;
	padding: 6px 10px;
	border-radius: var(--pict-modal-tooltip-border-radius);
	box-shadow: var(--pict-modal-tooltip-shadow);
	background: var(--pict-modal-tooltip-bg);
	color: var(--pict-modal-tooltip-fg);
	font-family: var(--pict-modal-font-family);
	font-size: 13px;
	pointer-events: none;
	opacity: 0;
	transition: opacity var(--pict-modal-transition-duration) ease;
	white-space: normal;
	word-wrap: break-word;
}

.pict-modal-tooltip.pict-modal-tooltip-interactive
{
	pointer-events: auto;
}

.pict-modal-tooltip.pict-modal-visible
{
	opacity: 1;
}

.pict-modal-tooltip-arrow
{
	position: absolute;
	width: 8px;
	height: 8px;
	background: var(--pict-modal-tooltip-bg);
	transform: rotate(45deg);
}

.pict-modal-tooltip--top .pict-modal-tooltip-arrow
{
	bottom: -4px;
	left: 50%;
	margin-left: -4px;
}

.pict-modal-tooltip--bottom .pict-modal-tooltip-arrow
{
	top: -4px;
	left: 50%;
	margin-left: -4px;
}

.pict-modal-tooltip--left .pict-modal-tooltip-arrow
{
	right: -4px;
	top: 50%;
	margin-top: -4px;
}

.pict-modal-tooltip--right .pict-modal-tooltip-arrow
{
	left: -4px;
	top: 50%;
	margin-top: -4px;
}

/* ── Resizable / Collapsible Panels ──────────────── */
.pict-panel
{
	position: relative;
	transition: width 0.2s ease;
	flex-shrink: 0;
	overflow: visible;
}
.pict-panel-collapsed
{
	width: 0 !important;
	min-width: 0 !important;
	overflow: visible;
}
.pict-panel-collapsed > *:not(.pict-panel-edge)
{
	display: none;
}

/* Edge container — zero-width flex sibling of the panel.
   Sits next to the panel in the flex layout; children
   use absolute positioning to overlap the panel boundary. */
.pict-panel-edge
{
	position: relative;
	width: 0;
	flex-shrink: 0;
	z-index: 50;
	overflow: visible;
}

/* Resize handle — thin strip on the panel boundary */
.pict-panel-resize
{
	position: absolute;
	top: 0;
	bottom: 0;
	width: 4px;
	cursor: col-resize;
	background: transparent;
	transition: background 0.15s, width 0.15s;
}
.pict-panel-edge-right .pict-panel-resize
{
	right: 0;
	border-right: 1px solid var(--pict-panel-border, #DDD6CA);
}
.pict-panel-edge-left .pict-panel-resize
{
	left: 0;
	border-left: 1px solid var(--pict-panel-border, #DDD6CA);
}
.pict-panel-resize:hover,
.pict-panel-edge:hover .pict-panel-resize
{
	width: 5px;
	background: var(--pict-panel-accent, #2E7D74);
	opacity: 0.5;
}
.pict-panel-resize.dragging
{
	width: 5px;
	background: var(--pict-panel-accent, #2E7D74);
	opacity: 1;
	transition: none;
}
.pict-panel-edge-collapsed .pict-panel-resize
{
	display: none;
}

/* Collapse tab — tucked sliver at rest, slides out on hover */
.pict-panel-tab
{
	position: absolute;
	top: 8px;
	width: 8px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	background: var(--pict-panel-border, #DDD6CA);
	border: 1px solid var(--pict-panel-border, #DDD6CA);
	cursor: pointer;
	color: var(--pict-panel-fg, #8A7F72);
	font-size: 10px;
	line-height: 1;
	opacity: 0.5;
	transition: opacity 0.25s, width 0.2s ease, height 0.2s ease, left 0.2s ease, right 0.2s ease, background 0.2s;
	z-index: 51;
}
.pict-panel-edge:hover .pict-panel-tab,
.pict-panel-tab:hover
{
	width: 20px;
	height: 32px;
	opacity: 1;
	overflow: visible;
	background: var(--pict-panel-bg, #FAF8F4);
}
/* Right panel: tab to the left of the edge */
.pict-panel-edge-right .pict-panel-tab
{
	right: 0;
	border-right: none;
	border-radius: 4px 0 0 4px;
}
.pict-panel-edge-right:hover .pict-panel-tab,
.pict-panel-edge-right .pict-panel-tab:hover
{
	right: 0;
}
/* Left panel: tab to the right of the edge */
.pict-panel-edge-left .pict-panel-tab
{
	left: 0;
	border-left: none;
	border-radius: 0 4px 4px 0;
}
.pict-panel-edge-left:hover .pict-panel-tab,
.pict-panel-edge-left .pict-panel-tab:hover
{
	left: 0;
}
/* When collapsed — more visible */
.pict-panel-edge-collapsed .pict-panel-tab
{
	width: 10px;
	height: 28px;
	opacity: 0.6;
}
.pict-panel-edge-collapsed .pict-panel-tab:hover,
.pict-panel-edge-collapsed:hover .pict-panel-tab
{
	width: 20px;
	height: 32px;
	opacity: 1;
	overflow: visible;
	background: var(--pict-panel-bg, #FAF8F4);
}
`
      };
    }, {}],
    16: [function (require, module, exports) {
      const libPictViewClass = require('pict-view');
      const libPictModalOverlay = require('./Pict-Modal-Overlay.js');
      const libPictModalConfirm = require('./Pict-Modal-Confirm.js');
      const libPictModalWindow = require('./Pict-Modal-Window.js');
      const libPictModalToast = require('./Pict-Modal-Toast.js');
      const libPictModalTooltip = require('./Pict-Modal-Tooltip.js');
      const libPictModalPanel = require('./Pict-Modal-Panel.js');
      const _DefaultConfiguration = require('./Pict-Section-Modal-DefaultConfiguration.js');
      class PictSectionModal extends libPictViewClass {
        constructor(pFable, pOptions, pServiceHash) {
          let tmpOptions = Object.assign({}, _DefaultConfiguration, pOptions);
          super(pFable, tmpOptions, pServiceHash);
          this._activeModals = [];
          this._activeTooltips = [];
          this._activeToasts = [];
          this._idCounter = 0;
          this._overlay = new libPictModalOverlay(this);
          this._confirm = new libPictModalConfirm(this);
          this._window = new libPictModalWindow(this);
          this._toast = new libPictModalToast(this);
          this._tooltip = new libPictModalTooltip(this);
          this._panel = new libPictModalPanel(this);
        }
        onBeforeInitialize() {
          super.onBeforeInitialize();

          // Ensure the root class is on the body for CSS variable scoping
          if (typeof document !== 'undefined' && document.body) {
            if (!document.body.classList.contains('pict-modal-root')) {
              document.body.classList.add('pict-modal-root');
            }
          }
          return super.onBeforeInitialize();
        }

        /**
         * Generate a unique ID for DOM elements.
         *
         * @returns {number}
         */
        _nextId() {
          this._idCounter++;
          return this._idCounter;
        }

        // -- Confirm API --

        /**
         * Show a confirmation dialog.
         *
         * @param {string} pMessage - The confirmation message
         * @param {object} [pOptions] - Options { title, confirmLabel, cancelLabel, dangerous }
         * @returns {Promise<boolean>}
         */
        confirm(pMessage, pOptions) {
          return this._confirm.confirm(pMessage, pOptions);
        }

        /**
         * Show a two-step confirmation dialog.
         *
         * If confirmPhrase is set, the user must type it to enable the confirm button.
         * If no confirmPhrase, the first click changes the button text and the second click confirms.
         *
         * @param {string} pMessage - The confirmation message
         * @param {object} [pOptions] - Options { title, confirmPhrase, phrasePrompt, confirmLabel, cancelLabel }
         * @returns {Promise<boolean>}
         */
        doubleConfirm(pMessage, pOptions) {
          return this._confirm.doubleConfirm(pMessage, pOptions);
        }

        // -- Modal Window API --

        /**
         * Show a custom modal window.
         *
         * @param {object} [pOptions] - Options { title, content, buttons, closeable, width, onOpen, onClose }
         * @returns {Promise<string|null>} Resolves with the clicked button Hash, or null on close
         */
        show(pOptions) {
          return this._window.show(pOptions);
        }

        // -- Tooltip API --

        /**
         * Attach a simple text tooltip to an element.
         *
         * @param {HTMLElement} pElement - Target element
         * @param {string} pText - Tooltip text
         * @param {object} [pOptions] - Options { position, delay, maxWidth }
         * @returns {{ destroy: function }}
         */
        tooltip(pElement, pText, pOptions) {
          return this._tooltip.tooltip(pElement, pText, pOptions);
        }

        /**
         * Attach a rich HTML tooltip to an element.
         *
         * @param {HTMLElement} pElement - Target element
         * @param {string} pHTMLContent - HTML content
         * @param {object} [pOptions] - Options { position, delay, maxWidth, interactive }
         * @returns {{ destroy: function }}
         */
        richTooltip(pElement, pHTMLContent, pOptions) {
          return this._tooltip.richTooltip(pElement, pHTMLContent, pOptions);
        }

        // -- Toast API --

        /**
         * Show a toast notification.
         *
         * @param {string} pMessage - Toast message
         * @param {object} [pOptions] - Options { type, duration, position, dismissible }
         * @returns {{ dismiss: function }}
         */
        toast(pMessage, pOptions) {
          return this._toast.toast(pMessage, pOptions);
        }

        // -- Panel API --

        /**
         * Attach resizable/collapsible panel behavior to a DOM element.
         *
         * @param {string} pTargetSelector - CSS selector for the panel element
         * @param {object} [pOptions] - Options { position, width, minWidth, maxWidth, collapsible, collapsed, persist, persistKey, onResize, onToggle }
         * @returns {{ collapse, expand, toggle, setWidth, destroy }} Panel handle
         */
        panel(pTargetSelector, pOptions) {
          return this._panel.create(pTargetSelector, pOptions);
        }

        // -- Cleanup API --

        /**
         * Dismiss all open modals.
         */
        dismissModals() {
          let tmpModals = this._activeModals.slice();
          for (let i = tmpModals.length - 1; i >= 0; i--) {
            tmpModals[i].dismiss(null);
          }
        }

        /**
         * Dismiss all active tooltips.
         */
        dismissTooltips() {
          this._tooltip.dismissAll();
        }

        /**
         * Dismiss all active toasts.
         */
        dismissToasts() {
          this._toast.dismissAll();
        }

        /**
         * Dismiss everything: modals, tooltips, and toasts.
         */
        dismissAll() {
          this.dismissModals();
          this.dismissTooltips();
          this.dismissToasts();
        }

        /**
         * Clean up all DOM elements when the view is destroyed.
         */
        /**
         * Destroy all active panels.
         */
        destroyPanels() {
          this._panel.destroyAll();
        }
        destroy() {
          this.dismissAll();
          this.destroyPanels();
          this._overlay.destroy();
          this._toast.destroy();
          if (typeof super.destroy === 'function') {
            return super.destroy();
          }
        }
      }
      module.exports = PictSectionModal;
      module.exports.default_configuration = _DefaultConfiguration;
    }, {
      "./Pict-Modal-Confirm.js": 9,
      "./Pict-Modal-Overlay.js": 10,
      "./Pict-Modal-Panel.js": 11,
      "./Pict-Modal-Toast.js": 12,
      "./Pict-Modal-Tooltip.js": 13,
      "./Pict-Modal-Window.js": 14,
      "./Pict-Section-Modal-DefaultConfiguration.js": 15,
      "pict-view": 18
    }],
    17: [function (require, module, exports) {
      module.exports = {
        "name": "pict-view",
        "version": "1.0.68",
        "description": "Pict View Base Class",
        "main": "source/Pict-View.js",
        "scripts": {
          "test": "npx quack test",
          "tests": "npx quack test -g",
          "start": "node source/Pict-View.js",
          "coverage": "npx quack coverage",
          "build": "npx quack build",
          "docker-dev-build": "docker build ./ -f Dockerfile_LUXURYCode -t pict-view-image:local",
          "docker-dev-run": "docker run -it -d --name pict-view-dev -p 30001:8080 -p 38086:8086 -v \"$PWD/.config:/home/coder/.config\"  -v \"$PWD:/home/coder/pict-view\" -u \"$(id -u):$(id -g)\" -e \"DOCKER_USER=$USER\" pict-view-image:local",
          "docker-dev-shell": "docker exec -it pict-view-dev /bin/bash",
          "types": "tsc -p .",
          "lint": "eslint source/**"
        },
        "types": "types/source/Pict-View.d.ts",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/stevenvelozo/pict-view.git"
        },
        "author": "steven velozo <steven@velozo.com>",
        "license": "MIT",
        "bugs": {
          "url": "https://github.com/stevenvelozo/pict-view/issues"
        },
        "homepage": "https://github.com/stevenvelozo/pict-view#readme",
        "devDependencies": {
          "@eslint/js": "^9.39.1",
          "browser-env": "^3.3.0",
          "eslint": "^9.39.1",
          "pict": "^1.0.363",
          "quackage": "^1.0.65",
          "typescript": "^5.9.3"
        },
        "mocha": {
          "diff": true,
          "extension": ["js"],
          "package": "./package.json",
          "reporter": "spec",
          "slow": "75",
          "timeout": "5000",
          "ui": "tdd",
          "watch-files": ["source/**/*.js", "test/**/*.js"],
          "watch-ignore": ["lib/vendor"]
        },
        "dependencies": {
          "fable": "^3.1.67",
          "fable-serviceproviderbase": "^3.0.19"
        }
      };
    }, {}],
    18: [function (require, module, exports) {
      const libFableServiceBase = require('fable-serviceproviderbase');
      const libPackage = require('../package.json');
      const defaultPictViewSettings = {
        DefaultRenderable: false,
        DefaultDestinationAddress: false,
        DefaultTemplateRecordAddress: false,
        ViewIdentifier: false,
        // If this is set to true, when the App initializes this will.
        // After the App initializes, initialize will be called as soon as it's added.
        AutoInitialize: true,
        AutoInitializeOrdinal: 0,
        // If this is set to true, when the App autorenders (on load) this will.
        // After the App initializes, render will be called as soon as it's added.
        AutoRender: true,
        AutoRenderOrdinal: 0,
        AutoSolveWithApp: true,
        AutoSolveOrdinal: 0,
        CSSHash: false,
        CSS: false,
        CSSProvider: false,
        CSSPriority: 500,
        Templates: [],
        DefaultTemplates: [],
        Renderables: [],
        Manifests: {}
      };

      /** @typedef {(error?: Error) => void} ErrorCallback */
      /** @typedef {number | boolean} PictTimestamp */

      /**
       * @typedef {'replace' | 'append' | 'prepend' | 'append_once' | 'virtual-assignment'} RenderMethod
       */
      /**
       * @typedef {Object} Renderable
       *
       * @property {string} RenderableHash - A unique hash for the renderable.
       * @property {string} TemplateHash - The hash of the template to use for rendering this renderable.
       * @property {string} [DefaultTemplateRecordAddress] - The default address for resolving the data record for this renderable.
       * @property {string} [ContentDestinationAddress] - The default address (DOM CSS selector) for rendering the content of this renderable.
       * @property {RenderMethod} [RenderMethod=replace] - The method to use when projecting the renderable to the DOM ('replace', 'append', 'prepend', 'append_once', 'virtual-assignment').
       * @property {string} [TestAddress] - The address to use for testing the renderable.
       * @property {string} [TransactionHash] - The transaction hash for the root renderable.
       * @property {string} [RootRenderableViewHash] - The hash of the root renderable.
       * @property {string} [Content] - The rendered content for this renderable, if applicable.
       */

      /**
       * Represents a view in the Pict ecosystem.
       */
      class PictView extends libFableServiceBase {
        /**
         * @param {any} pFable - The Fable object that this service is attached to.
         * @param {any} [pOptions] - (optional) The options for this service.
         * @param {string} [pServiceHash] - (optional) The hash of the service.
         */
        constructor(pFable, pOptions, pServiceHash) {
          // Intersect default options, parent constructor, service information
          let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultPictViewSettings)), pOptions);
          super(pFable, tmpOptions, pServiceHash);
          //FIXME: add types to fable and ancillaries
          /** @type {any} */
          this.fable;
          /** @type {any} */
          this.options;
          /** @type {String} */
          this.UUID;
          /** @type {String} */
          this.Hash;
          /** @type {any} */
          this.log;
          const tmpHashIsUUID = this.Hash === this.UUID;
          //NOTE: since many places are using the view UUID as the HTML element ID, we prefix it to avoid starting with a number
          this.UUID = `V-${this.UUID}`;
          if (tmpHashIsUUID) {
            this.Hash = this.UUID;
          }
          if (!this.options.ViewIdentifier) {
            this.options.ViewIdentifier = `AutoViewID-${this.fable.getUUID()}`;
          }
          this.serviceType = 'PictView';
          /** @type {Record<string, any>} */
          this._Package = libPackage;
          // Convenience and consistency naming
          /** @type {import('pict') & { log: any, instantiateServiceProviderWithoutRegistration: (hash: String) => any, instantiateServiceProviderIfNotExists: (hash: string) => any, TransactionTracking: import('pict/types/source/services/Fable-Service-TransactionTracking') }} */
          this.pict = this.fable;
          // Wire in the essential Pict application state
          this.AppData = this.pict.AppData;
          this.Bundle = this.pict.Bundle;

          /** @type {PictTimestamp} */
          this.initializeTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastSolvedTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastRenderedTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastMarshalFromViewTimestamp = false;
          /** @type {PictTimestamp} */
          this.lastMarshalToViewTimestamp = false;
          this.pict.instantiateServiceProviderIfNotExists('TransactionTracking');

          // Load all templates from the array in the options
          // Templates are in the form of {Hash:'Some-Template-Hash',Template:'Template content',Source:'TemplateSource'}
          for (let i = 0; i < this.options.Templates.length; i++) {
            let tmpTemplate = this.options.Templates[i];
            if (!('Hash' in tmpTemplate) || !('Template' in tmpTemplate)) {
              this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not load Template ${i} in the options array.`, tmpTemplate);
            } else {
              if (!tmpTemplate.Source) {
                tmpTemplate.Source = `PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} options object.`;
              }
              this.pict.TemplateProvider.addTemplate(tmpTemplate.Hash, tmpTemplate.Template, tmpTemplate.Source);
            }
          }

          // Load all default templates from the array in the options
          // Templates are in the form of {Prefix:'',Postfix:'-List-Row',Template:'Template content',Source:'TemplateSourceString'}
          for (let i = 0; i < this.options.DefaultTemplates.length; i++) {
            let tmpDefaultTemplate = this.options.DefaultTemplates[i];
            if (!('Postfix' in tmpDefaultTemplate) || !('Template' in tmpDefaultTemplate)) {
              this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not load Default Template ${i} in the options array.`, tmpDefaultTemplate);
            } else {
              if (!tmpDefaultTemplate.Source) {
                tmpDefaultTemplate.Source = `PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} options object.`;
              }
              this.pict.TemplateProvider.addDefaultTemplate(tmpDefaultTemplate.Prefix, tmpDefaultTemplate.Postfix, tmpDefaultTemplate.Template, tmpDefaultTemplate.Source);
            }
          }

          // Load the CSS if it's available
          if (this.options.CSS) {
            let tmpCSSHash = this.options.CSSHash ? this.options.CSSHash : `View-${this.options.ViewIdentifier}`;
            let tmpCSSProvider = this.options.CSSProvider ? this.options.CSSProvider : tmpCSSHash;
            this.pict.CSSMap.addCSS(tmpCSSHash, this.options.CSS, tmpCSSProvider, this.options.CSSPriority);
          }

          // Load all renderables
          // Renderables are launchable renderable instructions with templates
          // They look as such: {Identifier:'ContentEntry', TemplateHash:'Content-Entry-Section-Main', ContentDestinationAddress:'#ContentSection', RecordAddress:'AppData.Content.DefaultText', ManifestTransformation:'ManyfestHash', ManifestDestinationAddress:'AppData.Content.DataToTransformContent'}
          // The only parts that are necessary are Identifier and Template
          // A developer can then do render('ContentEntry') and it just kinda works.  Or they can override the ContentDestinationAddress
          /** @type {Record<String, Renderable>} */
          this.renderables = {};
          for (let i = 0; i < this.options.Renderables.length; i++) {
            /** @type {Renderable} */
            let tmpRenderable = this.options.Renderables[i];
            this.addRenderable(tmpRenderable);
          }
        }

        /**
         * Adds a renderable to the view.
         *
         * @param {string | Renderable} pRenderableHash - The hash of the renderable, or a renderable object.
         * @param {string} [pTemplateHash] - (optional) The hash of the template for the renderable.
         * @param {string} [pDefaultTemplateRecordAddress] - (optional) The default data address for the template.
         * @param {string} [pDefaultDestinationAddress] - (optional) The default destination address for the renderable.
         * @param {RenderMethod} [pRenderMethod=replace] - (optional) The method to use when rendering the renderable (ex. 'replace').
         */
        addRenderable(pRenderableHash, pTemplateHash, pDefaultTemplateRecordAddress, pDefaultDestinationAddress, pRenderMethod) {
          /** @type {Renderable} */
          let tmpRenderable;
          if (typeof pRenderableHash == 'object') {
            // The developer passed in the renderable as an object.
            // Use theirs instead!
            tmpRenderable = pRenderableHash;
          } else {
            /** @type {RenderMethod} */
            let tmpRenderMethod = typeof pRenderMethod !== 'string' ? pRenderMethod : 'replace';
            tmpRenderable = {
              RenderableHash: pRenderableHash,
              TemplateHash: pTemplateHash,
              DefaultTemplateRecordAddress: pDefaultTemplateRecordAddress,
              ContentDestinationAddress: pDefaultDestinationAddress,
              RenderMethod: tmpRenderMethod
            };
          }
          if (typeof tmpRenderable.RenderableHash != 'string' || typeof tmpRenderable.TemplateHash != 'string') {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not load Renderable; RenderableHash or TemplateHash are invalid.`, tmpRenderable);
          } else {
            if (this.pict.LogNoisiness > 0) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} adding renderable [${tmpRenderable.RenderableHash}] pointed to template ${tmpRenderable.TemplateHash}.`);
            }
            this.renderables[tmpRenderable.RenderableHash] = tmpRenderable;
          }
        }

        /* -------------------------------------------------------------------------- */
        /*                        Code Section: Initialization                        */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before the view is initialized.
         */
        onBeforeInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeInitialize:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is initialized (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeInitializeAsync(fCallback) {
          this.onBeforeInitialize();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when the view is initialized.
         */
        onInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onInitialize:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when the view is initialized (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onInitializeAsync(fCallback) {
          this.onInitialize();
          return fCallback();
        }

        /**
         * Performs view initialization.
         */
        initialize() {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialize:`);
          }
          if (!this.initializeTimestamp) {
            this.onBeforeInitialize();
            this.onInitialize();
            this.onAfterInitialize();
            this.initializeTimestamp = this.pict.log.getTimeStamp();
            return true;
          } else {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialize called but initialization is already completed.  Aborting.`);
            return false;
          }
        }

        /**
         * Performs view initialization (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        initializeAsync(fCallback) {
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initializeAsync:`);
          }
          if (!this.initializeTimestamp) {
            let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');
            if (this.pict.LogNoisiness > 0) {
              this.log.info(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} beginning initialization...`);
            }
            tmpAnticipate.anticipate(this.onBeforeInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onInitializeAsync.bind(this));
            tmpAnticipate.anticipate(this.onAfterInitializeAsync.bind(this));
            tmpAnticipate.wait(/** @param {Error} pError */
            pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialization failed: ${pError.message || pError}`, {
                  stack: pError.stack
                });
              }
              this.initializeTimestamp = this.pict.log.getTimeStamp();
              if (this.pict.LogNoisiness > 0) {
                this.log.info(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} initialization complete.`);
              }
              return fCallback();
            });
          } else {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} async initialize called but initialization is already completed.  Aborting.`);
            // TODO: Should this be an error?
            return fCallback();
          }
        }
        onAfterInitialize() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterInitialize:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is initialized (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterInitializeAsync(fCallback) {
          this.onAfterInitialize();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                            Code Section: Render                            */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before the view is rendered.
         *
         * @param {Renderable} pRenderable - The renderable that will be rendered.
         */
        onBeforeRender(pRenderable) {
          // Overload this to mess with stuff before the content gets generated from the template
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeRender:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is rendered (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that will be rendered.
         */
        onBeforeRenderAsync(fCallback, pRenderable) {
          this.onBeforeRender(pRenderable);
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers before the view is projected into the DOM.
         *
         * @param {Renderable} pRenderable - The renderable that will be projected.
         */
        onBeforeProject(pRenderable) {
          // Overload this to mess with stuff before the content gets generated from the template
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeProject:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is projected into the DOM (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that will be projected.
         */
        onBeforeProjectAsync(fCallback, pRenderable) {
          this.onBeforeProject(pRenderable);
          return fCallback();
        }

        /**
         * Builds the render options for a renderable.
         *
         * For DRY purposes on the three flavors of render.
         *
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object|ErrorCallback} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         */
        buildRenderOptions(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress) {
          let tmpRenderOptions = {
            Valid: true
          };
          tmpRenderOptions.RenderableHash = typeof pRenderableHash === 'string' ? pRenderableHash : typeof this.options.DefaultRenderable == 'string' ? this.options.DefaultRenderable : false;
          if (!tmpRenderOptions.RenderableHash) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not find a suitable RenderableHash ${tmpRenderOptions.RenderableHash} (param ${pRenderableHash}because it is not a valid renderable.`);
            tmpRenderOptions.Valid = false;
          }
          tmpRenderOptions.Renderable = this.renderables[tmpRenderOptions.RenderableHash];
          if (!tmpRenderOptions.Renderable) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderOptions.RenderableHash} (param ${pRenderableHash}) because it does not exist.`);
            tmpRenderOptions.Valid = false;
          }
          tmpRenderOptions.DestinationAddress = typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderOptions.Renderable.ContentDestinationAddress === 'string' ? tmpRenderOptions.Renderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : false;
          if (!tmpRenderOptions.DestinationAddress) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderOptions.RenderableHash} (param ${pRenderableHash}) because it does not have a valid destination address (param ${pRenderDestinationAddress}).`);
            tmpRenderOptions.Valid = false;
          }
          if (typeof pTemplateRecordAddress === 'object') {
            tmpRenderOptions.RecordAddress = 'Passed in as object';
            tmpRenderOptions.Record = pTemplateRecordAddress;
          } else {
            tmpRenderOptions.RecordAddress = typeof pTemplateRecordAddress === 'string' ? pTemplateRecordAddress : typeof tmpRenderOptions.Renderable.DefaultTemplateRecordAddress === 'string' ? tmpRenderOptions.Renderable.DefaultTemplateRecordAddress : typeof this.options.DefaultTemplateRecordAddress === 'string' ? this.options.DefaultTemplateRecordAddress : false;
            tmpRenderOptions.Record = typeof tmpRenderOptions.RecordAddress === 'string' ? this.pict.DataProvider.getDataByAddress(tmpRenderOptions.RecordAddress) : undefined;
          }
          return tmpRenderOptions;
        }

        /**
         * Assigns the content to the destination address.
         *
         * For DRY purposes on the three flavors of render.
         *
         * @param {Renderable} pRenderable - The renderable to render.
         * @param {string} pRenderDestinationAddress - The address where the renderable will be rendered.
         * @param {string} pContent - The content to render.
         * @returns {boolean} - Returns true if the content was assigned successfully.
         * @memberof PictView
         */
        assignRenderContent(pRenderable, pRenderDestinationAddress, pContent) {
          return this.pict.ContentAssignment.projectContent(pRenderable.RenderMethod, pRenderDestinationAddress, pContent, pRenderable.TestAddress);
        }

        /**
         * Render a renderable from this view.
         *
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @return {boolean}
         */
        render(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable) {
          return this.renderWithScope(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable);
        }

        /**
         * Render a renderable from this view, providing a specifici scope for the template.
         *
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @return {boolean}
         */
        renderWithScope(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable) {
          let tmpRenderableHash = typeof pRenderableHash === 'string' ? pRenderableHash : typeof this.options.DefaultRenderable == 'string' ? this.options.DefaultRenderable : false;
          if (!tmpRenderableHash) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it is not a valid renderable.`);
            return false;
          }

          /** @type {Renderable} */
          let tmpRenderable;
          if (tmpRenderableHash == '__Virtual') {
            tmpRenderable = {
              RenderableHash: '__Virtual',
              TemplateHash: this.renderables[this.options.DefaultRenderable].TemplateHash,
              ContentDestinationAddress: typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderable.ContentDestinationAddress === 'string' ? tmpRenderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null,
              RenderMethod: 'virtual-assignment',
              TransactionHash: pRootRenderable && pRootRenderable.TransactionHash,
              RootRenderableViewHash: pRootRenderable && pRootRenderable.RootRenderableViewHash
            };
          } else {
            tmpRenderable = Object.assign({}, this.renderables[tmpRenderableHash]);
            tmpRenderable.ContentDestinationAddress = typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderable.ContentDestinationAddress === 'string' ? tmpRenderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null;
          }
          if (!tmpRenderable.TransactionHash) {
            tmpRenderable.TransactionHash = `ViewRender-V-${this.options.ViewIdentifier}-R-${tmpRenderableHash}-U-${this.pict.getUUID()}`;
            tmpRenderable.RootRenderableViewHash = this.Hash;
            this.pict.TransactionTracking.registerTransaction(tmpRenderable.TransactionHash);
          }
          if (!tmpRenderable) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not exist.`);
            return false;
          }
          if (!tmpRenderable.ContentDestinationAddress) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not have a valid destination address.`);
            return false;
          }
          let tmpRecordAddress;
          let tmpRecord;
          if (typeof pTemplateRecordAddress === 'object') {
            tmpRecord = pTemplateRecordAddress;
            tmpRecordAddress = 'Passed in as object';
          } else {
            tmpRecordAddress = typeof pTemplateRecordAddress === 'string' ? pTemplateRecordAddress : typeof tmpRenderable.DefaultTemplateRecordAddress === 'string' ? tmpRenderable.DefaultTemplateRecordAddress : typeof this.options.DefaultTemplateRecordAddress === 'string' ? this.options.DefaultTemplateRecordAddress : false;
            tmpRecord = typeof tmpRecordAddress === 'string' ? this.pict.DataProvider.getDataByAddress(tmpRecordAddress) : undefined;
          }

          // Execute the developer-overridable pre-render behavior
          this.onBeforeRender(tmpRenderable);
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] Renderable[${tmpRenderableHash}] Destination[${tmpRenderable.ContentDestinationAddress}] TemplateRecordAddress[${tmpRecordAddress}] render:`);
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Beginning Render of Renderable[${tmpRenderableHash}] to Destination [${tmpRenderable.ContentDestinationAddress}]...`);
          }
          // Generate the content output from the template and data
          tmpRenderable.Content = this.pict.parseTemplateByHash(tmpRenderable.TemplateHash, tmpRecord, null, [this], pScope, {
            RootRenderable: typeof pRootRenderable === 'object' ? pRootRenderable : tmpRenderable
          });
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Assigning Renderable[${tmpRenderableHash}] content length ${tmpRenderable.Content.length} to Destination [${tmpRenderable.ContentDestinationAddress}] using render method [${tmpRenderable.RenderMethod}].`);
          }
          this.onBeforeProject(tmpRenderable);
          this.onProject(tmpRenderable);
          if (tmpRenderable.RenderMethod !== 'virtual-assignment') {
            this.onAfterProject(tmpRenderable);

            // Execute the developer-overridable post-render behavior
            this.onAfterRender(tmpRenderable);
          }
          return true;
        }

        /**
         * Render a renderable from this view.
         *
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object|ErrorCallback} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable|ErrorCallback} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         *
         * @return {void}
         */
        renderAsync(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable, fCallback) {
          return this.renderWithScopeAsync(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable, fCallback);
        }

        /**
         * Render a renderable from this view.
         *
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object|ErrorCallback} [pTemplateRecordAddress] - The address where the data for the template is stored.
         * @param {Renderable|ErrorCallback} [pRootRenderable] - The root renderable for the render operation, if applicable.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         *
         * @return {void}
         */
        renderWithScopeAsync(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, pRootRenderable, fCallback) {
          let tmpRenderableHash = typeof pRenderableHash === 'string' ? pRenderableHash : typeof this.options.DefaultRenderable == 'string' ? this.options.DefaultRenderable : false;

          // Allow the callback to be passed in as the last parameter no matter what
          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : typeof pTemplateRecordAddress === 'function' ? pTemplateRecordAddress : typeof pRenderDestinationAddress === 'function' ? pRenderDestinationAddress : typeof pRenderableHash === 'function' ? pRenderableHash : typeof pRootRenderable === 'function' ? pRootRenderable : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} renderAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          if (!tmpRenderableHash) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not asynchronously render ${tmpRenderableHash} (param ${pRenderableHash}because it is not a valid renderable.`);
            return tmpCallback(new Error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not asynchronously render ${tmpRenderableHash} (param ${pRenderableHash}because it is not a valid renderable.`));
          }

          /** @type {Renderable} */
          let tmpRenderable;
          if (tmpRenderableHash == '__Virtual') {
            tmpRenderable = {
              RenderableHash: '__Virtual',
              TemplateHash: this.renderables[this.options.DefaultRenderable].TemplateHash,
              ContentDestinationAddress: typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null,
              RenderMethod: 'virtual-assignment',
              TransactionHash: pRootRenderable && typeof pRootRenderable !== 'function' && pRootRenderable.TransactionHash,
              RootRenderableViewHash: pRootRenderable && typeof pRootRenderable !== 'function' && pRootRenderable.RootRenderableViewHash
            };
          } else {
            tmpRenderable = Object.assign({}, this.renderables[tmpRenderableHash]);
            tmpRenderable.ContentDestinationAddress = typeof pRenderDestinationAddress === 'string' ? pRenderDestinationAddress : typeof tmpRenderable.ContentDestinationAddress === 'string' ? tmpRenderable.ContentDestinationAddress : typeof this.options.DefaultDestinationAddress === 'string' ? this.options.DefaultDestinationAddress : null;
          }
          if (!tmpRenderable.TransactionHash) {
            tmpRenderable.TransactionHash = `ViewRender-V-${this.options.ViewIdentifier}-R-${tmpRenderableHash}-U-${this.pict.getUUID()}`;
            tmpRenderable.RootRenderableViewHash = this.Hash;
            this.pict.TransactionTracking.registerTransaction(tmpRenderable.TransactionHash);
          }
          if (!tmpRenderable) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not exist.`);
            return tmpCallback(new Error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not exist.`));
          }
          if (!tmpRenderable.ContentDestinationAddress) {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render ${tmpRenderableHash} (param ${pRenderableHash}) because it does not have a valid destination address.`);
            return tmpCallback(new Error(`Could not render ${tmpRenderableHash}`));
          }
          let tmpRecordAddress;
          let tmpRecord;
          if (typeof pTemplateRecordAddress === 'object') {
            tmpRecord = pTemplateRecordAddress;
            tmpRecordAddress = 'Passed in as object';
          } else {
            tmpRecordAddress = typeof pTemplateRecordAddress === 'string' ? pTemplateRecordAddress : typeof tmpRenderable.DefaultTemplateRecordAddress === 'string' ? tmpRenderable.DefaultTemplateRecordAddress : typeof this.options.DefaultTemplateRecordAddress === 'string' ? this.options.DefaultTemplateRecordAddress : false;
            tmpRecord = typeof tmpRecordAddress === 'string' ? this.pict.DataProvider.getDataByAddress(tmpRecordAddress) : undefined;
          }
          if (this.pict.LogControlFlow) {
            this.log.trace(`PICT-ControlFlow VIEW [${this.UUID}]::[${this.Hash}] Renderable[${tmpRenderableHash}] Destination[${tmpRenderable.ContentDestinationAddress}] TemplateRecordAddress[${tmpRecordAddress}] renderAsync:`);
          }
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Beginning Asynchronous Render (callback-style)...`);
          }
          let tmpAnticipate = this.fable.newAnticipate();
          tmpAnticipate.anticipate(fOnBeforeRenderCallback => {
            this.onBeforeRenderAsync(fOnBeforeRenderCallback, tmpRenderable);
          });
          tmpAnticipate.anticipate(fAsyncTemplateCallback => {
            // Render the template (asynchronously)
            this.pict.parseTemplateByHash(tmpRenderable.TemplateHash, tmpRecord, (pError, pContent) => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render (asynchronously) ${tmpRenderableHash} (param ${pRenderableHash}) because it did not parse the template.`, pError);
                return fAsyncTemplateCallback(pError);
              }
              tmpRenderable.Content = pContent;
              return fAsyncTemplateCallback();
            }, [this], pScope, {
              RootRenderable: typeof pRootRenderable === 'object' ? pRootRenderable : tmpRenderable
            });
          });
          tmpAnticipate.anticipate(fNext => {
            this.onBeforeProjectAsync(fNext, tmpRenderable);
          });
          tmpAnticipate.anticipate(fNext => {
            this.onProjectAsync(fNext, tmpRenderable);
          });
          if (tmpRenderable.RenderMethod !== 'virtual-assignment') {
            tmpAnticipate.anticipate(fNext => {
              this.onAfterProjectAsync(fNext, tmpRenderable);
            });

            // Execute the developer-overridable post-render behavior
            tmpAnticipate.anticipate(fNext => {
              this.onAfterRenderAsync(fNext, tmpRenderable);
            });
          }
          tmpAnticipate.wait(tmpCallback);
        }

        /**
         * Renders the default renderable.
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        renderDefaultAsync(fCallback) {
          // Render the default renderable
          this.renderAsync(fCallback);
        }

        /**
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         */
        basicRender(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress) {
          return this.basicRenderWithScope(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress);
        }

        /**
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string} [pRenderableHash] - The hash of the renderable to render.
         * @param {string} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|object} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         */
        basicRenderWithScope(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress) {
          let tmpRenderOptions = this.buildRenderOptions(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress);
          if (tmpRenderOptions.Valid) {
            this.assignRenderContent(tmpRenderOptions.Renderable, tmpRenderOptions.DestinationAddress, this.pict.parseTemplateByHash(tmpRenderOptions.Renderable.TemplateHash, tmpRenderOptions.Record, null, [this], pScope, {
              RootRenderable: tmpRenderOptions.Renderable
            }));
            return true;
          } else {
            this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not perform a basic render of ${tmpRenderOptions.RenderableHash} because it is not valid.`);
            return false;
          }
        }

        /**
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|Object|ErrorCallback} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         */
        basicRenderAsync(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, fCallback) {
          return this.basicRenderWithScopeAsync(this, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, fCallback);
        }

        /**
         * @param {any} pScope - The scope to use for the template rendering.
         * @param {string|ErrorCallback} [pRenderableHash] - The hash of the renderable to render.
         * @param {string|ErrorCallback} [pRenderDestinationAddress] - The address where the renderable will be rendered.
         * @param {string|Object|ErrorCallback} [pTemplateRecordAddress] - The address of (or actual obejct) where the data for the template is stored.
         * @param {ErrorCallback} [fCallback] - The callback to call when the async operation is complete.
         */
        basicRenderWithScopeAsync(pScope, pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress, fCallback) {
          // Allow the callback to be passed in as the last parameter no matter what
          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : typeof pTemplateRecordAddress === 'function' ? pTemplateRecordAddress : typeof pRenderDestinationAddress === 'function' ? pRenderDestinationAddress : typeof pRenderableHash === 'function' ? pRenderableHash : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} basicRenderAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} basicRenderAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          const tmpRenderOptions = this.buildRenderOptions(pRenderableHash, pRenderDestinationAddress, pTemplateRecordAddress);
          if (tmpRenderOptions.Valid) {
            this.pict.parseTemplateByHash(tmpRenderOptions.Renderable.TemplateHash, tmpRenderOptions.Record,
            /**
             * @param {Error} [pError] - The error that occurred during template parsing.
             * @param {string} [pContent] - The content that was rendered from the template.
             */
            (pError, pContent) => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not render (asynchronously) ${tmpRenderOptions.RenderableHash} because it did not parse the template.`, pError);
                return tmpCallback(pError);
              }
              this.assignRenderContent(tmpRenderOptions.Renderable, tmpRenderOptions.DestinationAddress, pContent);
              return tmpCallback();
            }, [this], pScope, {
              RootRenderable: tmpRenderOptions.Renderable
            });
          } else {
            let tmpErrorMessage = `PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} could not perform a basic render of ${tmpRenderOptions.RenderableHash} because it is not valid.`;
            this.log.error(tmpErrorMessage);
            return tmpCallback(new Error(tmpErrorMessage));
          }
        }

        /**
         * @param {Renderable} pRenderable - The renderable that was rendered.
         */
        onProject(pRenderable) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onProject:`);
          }
          if (pRenderable.RenderMethod === 'virtual-assignment') {
            this.pict.TransactionTracking.pushToTransactionQueue(pRenderable.TransactionHash, {
              ViewHash: this.Hash,
              Renderable: pRenderable
            }, 'Deferred-Post-Content-Assignment');
          }
          if (this.pict.LogNoisiness > 0) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} Assigning Renderable[${pRenderable.RenderableHash}] content length ${pRenderable.Content.length} to Destination [${pRenderable.ContentDestinationAddress}] using Async render method ${pRenderable.RenderMethod}.`);
          }

          // Assign the content to the destination address
          this.pict.ContentAssignment.projectContent(pRenderable.RenderMethod, pRenderable.ContentDestinationAddress, pRenderable.Content, pRenderable.TestAddress);
          this.lastRenderedTimestamp = this.pict.log.getTimeStamp();
        }

        /**
         * Lifecycle hook that triggers after the view is projected into the DOM (async flow).
         *
         * @param {(error?: Error, content?: string) => void} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that is being projected.
         */
        onProjectAsync(fCallback, pRenderable) {
          this.onProject(pRenderable);
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers after the view is rendered.
         *
         * @param {Renderable} pRenderable - The renderable that was rendered.
         */
        onAfterRender(pRenderable) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterRender:`);
          }
          if (pRenderable && pRenderable.RootRenderableViewHash === this.Hash) {
            const tmpTransactionQueue = this.pict.TransactionTracking.clearTransactionQueue(pRenderable.TransactionHash) || [];
            for (const tmpEvent of tmpTransactionQueue) {
              const tmpView = this.pict.views[tmpEvent.Data.ViewHash];
              if (!tmpView) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterRender: Could not find view for transaction hash ${pRenderable.TransactionHash} and ViewHash ${tmpEvent.Data.ViewHash}.`);
                continue;
              }
              tmpView.onAfterProject();

              // Execute the developer-overridable post-render behavior
              tmpView.onAfterRender(tmpEvent.Data.Renderable);
            }
            // Queue is drained and nested child renders have each cleaned up
            // their own transactions; remove this root render's entry from
            // the tracking map so it does not leak.
            this.pict.TransactionTracking.unregisterTransaction(pRenderable.TransactionHash);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is rendered (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that was rendered.
         */
        onAfterRenderAsync(fCallback, pRenderable) {
          // NOTE: this.onAfterRender(pRenderable) will itself clear the
          // transaction queue and unregister the transaction if this view is
          // the root renderable - see onAfterRender above. So by the time the
          // loop below runs, the queue is already empty and there is nothing
          // to drain. Keeping the async queue walk here defensively in case
          // future subclasses override onAfterRender in ways that skip the
          // drain, but the common path is now "sync drain, async no-op".
          this.onAfterRender(pRenderable);
          const tmpAnticipate = this.fable.newAnticipate();
          const tmpIsRootRenderable = pRenderable && pRenderable.RootRenderableViewHash === this.Hash;
          if (tmpIsRootRenderable) {
            const queue = this.pict.TransactionTracking.clearTransactionQueue(pRenderable.TransactionHash) || [];
            for (const event of queue) {
              /** @type {PictView} */
              const tmpView = this.pict.views[event.Data.ViewHash];
              if (!tmpView) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterRenderAsync: Could not find view for transaction hash ${pRenderable.TransactionHash} and ViewHash ${event.Data.ViewHash}.`);
                continue;
              }
              tmpAnticipate.anticipate(tmpView.onAfterProjectAsync.bind(tmpView));
              tmpAnticipate.anticipate(fNext => {
                tmpView.onAfterRenderAsync(fNext, event.Data.Renderable);
              });

              // Execute the developer-overridable post-render behavior
            }
          }
          return tmpAnticipate.wait(pError => {
            // Nested virtual-assignment children have now settled their own
            // onAfterRenderAsync chains (and unregistered their own
            // transactions along the way). Ensure this root render's entry
            // is also gone - unregisterTransaction is a no-op if the sync
            // onAfterRender above already removed it, so this is safe to
            // call unconditionally on the root path.
            if (tmpIsRootRenderable && pRenderable && pRenderable.TransactionHash) {
              this.pict.TransactionTracking.unregisterTransaction(pRenderable.TransactionHash);
            }
            return fCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after the view is projected into the DOM.
         *
         * @param {Renderable} pRenderable - The renderable that was projected.
         */
        onAfterProject(pRenderable) {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterProject:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is projected into the DOM (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         * @param {Renderable} pRenderable - The renderable that was projected.
         */
        onAfterProjectAsync(fCallback, pRenderable) {
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                            Code Section: Solver                            */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before the view is solved.
         */
        onBeforeSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeSolve:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before the view is solved (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeSolveAsync(fCallback) {
          this.onBeforeSolve();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when the view is solved.
         */
        onSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onSolve:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when the view is solved (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onSolveAsync(fCallback) {
          this.onSolve();
          return fCallback();
        }

        /**
         * Performs view solving and triggers lifecycle hooks.
         *
         * @return {boolean} - True if the view was solved successfully, false otherwise.
         */
        solve() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} executing solve() function...`);
          }
          this.onBeforeSolve();
          this.onSolve();
          this.onAfterSolve();
          this.lastSolvedTimestamp = this.pict.log.getTimeStamp();
          return true;
        }

        /**
         * Performs view solving and triggers lifecycle hooks (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        solveAsync(fCallback) {
          let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');

          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} solveAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeSolveAsync.bind(this));
          tmpAnticipate.anticipate(this.onSolveAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterSolveAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} solveAsync() complete.`);
            }
            this.lastSolvedTimestamp = this.pict.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after the view is solved.
         */
        onAfterSolve() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterSolve:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after the view is solved (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterSolveAsync(fCallback) {
          this.onAfterSolve();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal From View                        */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before data is marshaled from the view.
         *
         * @return {boolean} - True if the operation was successful, false otherwise.
         */
        onBeforeMarshalFromView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeMarshalFromView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before data is marshaled from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeMarshalFromViewAsync(fCallback) {
          this.onBeforeMarshalFromView();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when data is marshaled from the view.
         */
        onMarshalFromView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onMarshalFromView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when data is marshaled from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onMarshalFromViewAsync(fCallback) {
          this.onMarshalFromView();
          return fCallback();
        }

        /**
         * Marshals data from the view.
         *
         * @return {boolean} - True if the operation was successful, false otherwise.
         */
        marshalFromView() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} executing solve() function...`);
          }
          this.onBeforeMarshalFromView();
          this.onMarshalFromView();
          this.onAfterMarshalFromView();
          this.lastMarshalFromViewTimestamp = this.pict.log.getTimeStamp();
          return true;
        }

        /**
         * Marshals data from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        marshalFromViewAsync(fCallback) {
          let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');

          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalFromViewAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalFromViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onMarshalFromViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalFromViewAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} marshalFromViewAsync() complete.`);
            }
            this.lastMarshalFromViewTimestamp = this.pict.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after data is marshaled from the view.
         */
        onAfterMarshalFromView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterMarshalFromView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after data is marshaled from the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterMarshalFromViewAsync(fCallback) {
          this.onAfterMarshalFromView();
          return fCallback();
        }

        /* -------------------------------------------------------------------------- */
        /*                     Code Section: Marshal To View                          */
        /* -------------------------------------------------------------------------- */
        /**
         * Lifecycle hook that triggers before data is marshaled into the view.
         */
        onBeforeMarshalToView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onBeforeMarshalToView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers before data is marshaled into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onBeforeMarshalToViewAsync(fCallback) {
          this.onBeforeMarshalToView();
          return fCallback();
        }

        /**
         * Lifecycle hook that triggers when data is marshaled into the view.
         */
        onMarshalToView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onMarshalToView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers when data is marshaled into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onMarshalToViewAsync(fCallback) {
          this.onMarshalToView();
          return fCallback();
        }

        /**
         * Marshals data into the view.
         *
         * @return {boolean} - True if the operation was successful, false otherwise.
         */
        marshalToView() {
          if (this.pict.LogNoisiness > 2) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} executing solve() function...`);
          }
          this.onBeforeMarshalToView();
          this.onMarshalToView();
          this.onAfterMarshalToView();
          this.lastMarshalToViewTimestamp = this.pict.log.getTimeStamp();
          return true;
        }

        /**
         * Marshals data into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        marshalToViewAsync(fCallback) {
          let tmpAnticipate = this.pict.instantiateServiceProviderWithoutRegistration('Anticipate');

          /** @type {ErrorCallback} */
          let tmpCallback = typeof fCallback === 'function' ? fCallback : null;
          if (!tmpCallback) {
            this.log.warn(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewAsync was called without a valid callback.  A callback will be generated but this could lead to race conditions.`);
            tmpCallback = pError => {
              if (pError) {
                this.log.error(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.Name} marshalToViewAsync Auto Callback Error: ${pError}`, pError);
              }
            };
          }
          tmpAnticipate.anticipate(this.onBeforeMarshalToViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onMarshalToViewAsync.bind(this));
          tmpAnticipate.anticipate(this.onAfterMarshalToViewAsync.bind(this));
          tmpAnticipate.wait(pError => {
            if (this.pict.LogNoisiness > 2) {
              this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} marshalToViewAsync() complete.`);
            }
            this.lastMarshalToViewTimestamp = this.pict.log.getTimeStamp();
            return tmpCallback(pError);
          });
        }

        /**
         * Lifecycle hook that triggers after data is marshaled into the view.
         */
        onAfterMarshalToView() {
          if (this.pict.LogNoisiness > 3) {
            this.log.trace(`PictView [${this.UUID}]::[${this.Hash}] ${this.options.ViewIdentifier} onAfterMarshalToView:`);
          }
          return true;
        }

        /**
         * Lifecycle hook that triggers after data is marshaled into the view (async flow).
         *
         * @param {ErrorCallback} fCallback - The callback to call when the async operation is complete.
         */
        onAfterMarshalToViewAsync(fCallback) {
          this.onAfterMarshalToView();
          return fCallback();
        }

        /** @return {boolean} - True if the object is a PictView. */
        get isPictView() {
          return true;
        }
      }
      module.exports = PictView;
    }, {
      "../package.json": 17,
      "fable-serviceproviderbase": 2
    }],
    19: [function (require, module, exports) {
      module.exports = {
        "Name": "Retold Manager",
        "Hash": "RetoldManager",
        "MainViewportViewIdentifier": "Manager-Layout",
        "MainViewportDestinationAddress": "#RetoldManager-Application-Container",
        "MainViewportDefaultDataAddress": "AppData.Manager",
        "AutoSolveAfterInitialize": true,
        "AutoRenderMainViewportViewAfterInitialize": false,
        "AutoRenderViewsAfterInitialize": false,
        "pict_configuration": {
          "Product": "Retold-Manager"
        }
      };
    }, {}],
    20: [function (require, module, exports) {
      const libPictApplication = require('pict-application');
      const libPictRouter = require('pict-router');
      const libPictSectionModal = require('pict-section-modal');

      // Providers (business logic, no UI)
      const libProviderApi = require('./providers/Pict-Provider-Manager-API.js');
      const libProviderOperationsWS = require('./providers/Pict-Provider-Manager-OperationsWS.js');

      // Shell views (always present)
      const libViewLayout = require('./views/PictView-Manager-Layout.js');
      const libViewTopBar = require('./views/PictView-Manager-TopBar.js');
      const libViewSidebar = require('./views/PictView-Manager-Sidebar.js');
      const libViewStatusBar = require('./views/PictView-Manager-StatusBar.js');
      const libViewOutputPanel = require('./views/PictView-Manager-OutputPanel.js');
      const libViewLogModal = require('./views/PictView-Manager-LogModal.js');

      // Content views (swapped by the router)
      const libViewHome = require('./views/PictView-Manager-Home.js');
      const libViewModuleWorkspace = require('./views/PictView-Manager-ModuleWorkspace.js');
      const libViewManifestEditor = require('./views/PictView-Manager-ManifestEditor.js');
      const libViewLogViewer = require('./views/PictView-Manager-LogViewer.js');
      const libViewOpsRunner = require('./views/PictView-Manager-OpsRunner.js');
      const libViewRipple = require('./views/PictView-Manager-Ripple.js');

      // Modal views (render into #RM-ModalRoot)
      const libModalCommit = require('./views/modals/PictView-Manager-Modal-Commit.js');
      const libModalNcu = require('./views/modals/PictView-Manager-Modal-Ncu.js');
      const libModalPublish = require('./views/modals/PictView-Manager-Modal-Publish.js');
      const libModalEditModule = require('./views/modals/PictView-Manager-Modal-EditModule.js');
      const libModalRipplePlan = require('./views/modals/PictView-Manager-Modal-RipplePlan.js');
      const libModalDiff = require('./views/modals/PictView-Manager-Modal-Diff.js');
      class RetoldManagerApplication extends libPictApplication {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);

          // The layout view calls resolve() explicitly after the DOM is ready.
          this.pict.settings.RouterSkipRouteResolveOnAdd = true;

          // Providers first so views can reach them during construction.
          this.pict.addProvider('ManagerAPI', libProviderApi.default_configuration, libProviderApi);
          this.pict.addProvider('ManagerOperationsWS', libProviderOperationsWS.default_configuration, libProviderOperationsWS);

          // Router
          this.pict.addProvider('PictRouter', require('./providers/PictRouter-RetoldManager-Configuration.json'), libPictRouter);

          // Shell views
          this.pict.addView('Manager-Layout', libViewLayout.default_configuration, libViewLayout);
          this.pict.addView('Manager-TopBar', libViewTopBar.default_configuration, libViewTopBar);
          this.pict.addView('Manager-Sidebar', libViewSidebar.default_configuration, libViewSidebar);
          this.pict.addView('Manager-StatusBar', libViewStatusBar.default_configuration, libViewStatusBar);
          this.pict.addView('Manager-OutputPanel', libViewOutputPanel.default_configuration, libViewOutputPanel);

          // Modal section view (toasts, confirms, custom dialogs).
          this.pict.addView('Pict-Section-Modal', {}, libPictSectionModal);

          // Content views
          this.pict.addView('Manager-Home', libViewHome.default_configuration, libViewHome);
          this.pict.addView('Manager-ModuleWorkspace', libViewModuleWorkspace.default_configuration, libViewModuleWorkspace);
          this.pict.addView('Manager-ManifestEditor', libViewManifestEditor.default_configuration, libViewManifestEditor);
          this.pict.addView('Manager-LogViewer', libViewLogViewer.default_configuration, libViewLogViewer);
          this.pict.addView('Manager-LogModal', libViewLogModal.default_configuration, libViewLogModal);
          this.pict.addView('Manager-OpsRunner', libViewOpsRunner.default_configuration, libViewOpsRunner);
          this.pict.addView('Manager-Ripple', libViewRipple.default_configuration, libViewRipple);

          // Modal views
          this.pict.addView('Manager-Modal-Commit', libModalCommit.default_configuration, libModalCommit);
          this.pict.addView('Manager-Modal-Ncu', libModalNcu.default_configuration, libModalNcu);
          this.pict.addView('Manager-Modal-Publish', libModalPublish.default_configuration, libModalPublish);
          this.pict.addView('Manager-Modal-EditModule', libModalEditModule.default_configuration, libModalEditModule);
          this.pict.addView('Manager-Modal-RipplePlan', libModalRipplePlan.default_configuration, libModalRipplePlan);
          this.pict.addView('Manager-Modal-Diff', libModalDiff.default_configuration, libModalDiff);
        }
        onAfterInitializeAsync(fCallback) {
          // Single source of truth for all UI state.
          this.pict.AppData.Manager = {
            StatusMessage: 'Loading...',
            Health: {
              state: 'connecting',
              text: 'connecting...'
            },
            CurrentRoute: 'Home',
            // derived from pict-router path
            Modules: [],
            // [{Name, Group, GitHub, Documentation, ...}]
            ModulesByGroup: {},
            // { Fable: [...], Meadow: [...], ... }
            Filter: {
              Query: '',
              DirtyOnly: false,
              SortByTime: false
            },
            Scan: {
              Results: {},
              // { moduleName: { Dirty, Ahead, Behind, Branch } }
              When: null,
              Running: false
            },
            SelectedModule: null,
            // module name
            SelectedModuleDetail: null,
            // the /modules/:name payload
            ActiveOperation: {
              OperationId: null,
              CommandTag: null,
              Lines: [],
              // [{Class, Text}]
              HeaderState: 'idle',
              // 'idle' | 'running' | 'success' | 'error'
              HeaderText: 'idle'
            },
            OpsScript: null,
            // 'status' | 'update' | 'checkout' — when on /Ops/:script
            RecentModules: [] // ordered MRU list, persisted to localStorage
          };
          this._loadRecentModules();

          // Parameterized routes are registered from JS so the handler gets the
          // navigo match object directly — template `:param` expressions don't
          // flow cleanly into `{~LV~}` closures.
          let tmpRouter = this.pict.providers.PictRouter;
          tmpRouter.addRoute('/Module/:name', pMatch => {
            let tmpName = pMatch && pMatch.data ? pMatch.data.name : null;
            if (tmpName) {
              this.showModule(decodeURIComponent(tmpName));
            }
          });
          tmpRouter.addRoute('/Ops/:script', pMatch => {
            let tmpScript = pMatch && pMatch.data ? pMatch.data.script : null;
            if (tmpScript) {
              this.showOps(tmpScript);
            }
          });

          // Render the shell (Layout calls into TopBar/Sidebar/OutputPanel/StatusBar).
          this.pict.views['Manager-Layout'].render();

          // Resolve the router now that all routes are registered and the DOM is
          // ready; this picks up hash deep-links on first load.
          tmpRouter.resolve();

          // Kick off the initial data load + live WS stream.
          this.pict.providers.ManagerAPI.loadModules();
          this.pict.providers.ManagerAPI.pollHealth();
          this.pict.providers.ManagerOperationsWS.connect();
          return super.onAfterInitializeAsync(fCallback);
        }

        // ─────────────────────────────────────────────
        //  Navigation helpers called from templates + buttons
        // ─────────────────────────────────────────────

        navigateTo(pPath) {
          this.pict.providers.PictRouter.navigate(pPath);
        }
        showView(pViewIdentifier) {
          let tmpView = this.pict.views[pViewIdentifier];
          if (!tmpView) {
            this.pict.log.warn('View [' + pViewIdentifier + '] not found; falling back to home.');
            this.pict.views['Manager-Home'].render();
            this.setActiveRoute('Home');
            return;
          }

          // Per-view entry hooks — a route change is a good moment for the
          // view to (re)fetch data instead of relying on a stale record.
          if (pViewIdentifier === 'Manager-ManifestEditor' && typeof tmpView.reload === 'function') {
            tmpView.reload();
          } else if (pViewIdentifier === 'Manager-Ripple' && typeof tmpView.showFromRoute === 'function') {
            tmpView.showFromRoute();
          } else {
            tmpView.render();
          }
          let tmpRoute = pViewIdentifier.replace('Manager-', '');
          this.setActiveRoute(tmpRoute);
        }
        showModule(pName) {
          this.pict.AppData.Manager.SelectedModule = pName;
          this._touchRecentModule(pName);
          this.pict.views['Manager-ModuleWorkspace'].loadModule(pName);
          this.setActiveRoute('Module:' + pName);
        }
        showOps(pScript) {
          this.pict.AppData.Manager.OpsScript = pScript;
          // OpsRunner now opens the streaming log modal rather than swapping the
          // workspace content area, so the user keeps their current context.
          this.pict.views['Manager-OpsRunner'].runScript(pScript);
          this.setActiveRoute('Ops:' + pScript);
        }

        // ─────────────────────────────────────────────
        //  Recent-module MRU (drives the "Sort by time" filter)
        // ─────────────────────────────────────────────

        _loadRecentModules() {
          try {
            let tmpRaw = window.localStorage.getItem('rm:recent:modules');
            if (!tmpRaw) {
              return;
            }
            let tmpList = JSON.parse(tmpRaw);
            if (Array.isArray(tmpList)) {
              this.pict.AppData.Manager.RecentModules = tmpList.filter(pName => typeof pName === 'string').slice(0, 100);
            }
          } catch (e) {/* ignore */}
        }
        _touchRecentModule(pName) {
          if (!pName) {
            return;
          }
          let tmpList = this.pict.AppData.Manager.RecentModules || [];
          // Move-to-front, dedupe, cap at 100.
          tmpList = [pName].concat(tmpList.filter(pN => pN !== pName)).slice(0, 100);
          this.pict.AppData.Manager.RecentModules = tmpList;
          try {
            window.localStorage.setItem('rm:recent:modules', JSON.stringify(tmpList));
          } catch (e) {/* quota */}
          // Re-render the sidebar so "Sort by time" reflects the new ordering.
          if (this.pict.views['Manager-Sidebar']) {
            this.pict.views['Manager-Sidebar'].render();
          }
        }
        setActiveRoute(pRoute) {
          this.pict.AppData.Manager.CurrentRoute = pRoute;

          // Re-render sidebar so the selected module row highlights correctly,
          // and the top bar so the active toggle styling updates.
          if (this.pict.views['Manager-Sidebar']) {
            this.pict.views['Manager-Sidebar'].render();
          }
          if (this.pict.views['Manager-TopBar']) {
            this.pict.views['Manager-TopBar'].render();
          }
        }
        setStatus(pMessage) {
          this.pict.AppData.Manager.StatusMessage = pMessage;
          if (this.pict.views['Manager-StatusBar']) {
            this.pict.views['Manager-StatusBar'].render();
          }
        }
      }
      module.exports = RetoldManagerApplication;
      module.exports.default_configuration = require('./Pict-Application-RetoldManager-Configuration.json');
    }, {
      "./Pict-Application-RetoldManager-Configuration.json": 19,
      "./providers/Pict-Provider-Manager-API.js": 22,
      "./providers/Pict-Provider-Manager-OperationsWS.js": 23,
      "./providers/PictRouter-RetoldManager-Configuration.json": 24,
      "./views/PictView-Manager-Home.js": 25,
      "./views/PictView-Manager-Layout.js": 26,
      "./views/PictView-Manager-LogModal.js": 27,
      "./views/PictView-Manager-LogViewer.js": 28,
      "./views/PictView-Manager-ManifestEditor.js": 29,
      "./views/PictView-Manager-ModuleWorkspace.js": 30,
      "./views/PictView-Manager-OpsRunner.js": 31,
      "./views/PictView-Manager-OutputPanel.js": 32,
      "./views/PictView-Manager-Ripple.js": 33,
      "./views/PictView-Manager-Sidebar.js": 34,
      "./views/PictView-Manager-StatusBar.js": 35,
      "./views/PictView-Manager-TopBar.js": 36,
      "./views/modals/PictView-Manager-Modal-Commit.js": 37,
      "./views/modals/PictView-Manager-Modal-Diff.js": 38,
      "./views/modals/PictView-Manager-Modal-EditModule.js": 39,
      "./views/modals/PictView-Manager-Modal-Ncu.js": 40,
      "./views/modals/PictView-Manager-Modal-Publish.js": 41,
      "./views/modals/PictView-Manager-Modal-RipplePlan.js": 42,
      "pict-application": 5,
      "pict-router": 8,
      "pict-section-modal": 16
    }],
    21: [function (require, module, exports) {
      module.exports = {
        RetoldManagerApplication: require('./Pict-Application-RetoldManager.js')
      };
      if (typeof window !== 'undefined') {
        window.RetoldManagerApplication = module.exports.RetoldManagerApplication;
      }
    }, {
      "./Pict-Application-RetoldManager.js": 20
    }],
    22: [function (require, module, exports) {
      const libPictProvider = require('pict-provider');
      const API_BASE = '/api/manager';
      const _Configuration = {
        ProviderIdentifier: 'ManagerAPI',
        AutoInitialize: true,
        AutoInitializeOrdinal: 1
      };
      class ManagerAPIProvider extends libPictProvider {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }

        // ─────────────────────────────────────────────
        //  Low-level fetch wrappers
        // ─────────────────────────────────────────────

        get(pPath) {
          return fetch(API_BASE + pPath, {
            headers: {
              Accept: 'application/json'
            }
          }).then(pResponse => this._parseResponse(pResponse));
        }
        request(pMethod, pPath, pBody) {
          let tmpInit = {
            method: pMethod,
            headers: {
              Accept: 'application/json'
            }
          };
          if (pBody !== undefined && pBody !== null) {
            tmpInit.headers['Content-Type'] = 'application/json';
            tmpInit.body = JSON.stringify(pBody);
          }
          return fetch(API_BASE + pPath, tmpInit).then(pResponse => this._parseResponse(pResponse));
        }
        post(pPath, pBody) {
          return this.request('POST', pPath, pBody || {});
        }
        patch(pPath, pBody) {
          return this.request('PATCH', pPath, pBody || {});
        }
        delete(pPath) {
          return this.request('DELETE', pPath);
        }
        _parseResponse(pResponse) {
          return pResponse.text().then(pRaw => {
            let tmpBody;
            try {
              tmpBody = pRaw ? JSON.parse(pRaw) : {};
            } catch (e) {
              tmpBody = {
                Message: pRaw
              };
            }
            if (!pResponse.ok) {
              let tmpErr = new Error(tmpBody.Message || 'HTTP ' + pResponse.status);
              tmpErr.Status = pResponse.status;
              tmpErr.Info = tmpBody;
              throw tmpErr;
            }
            return tmpBody;
          });
        }

        // ─────────────────────────────────────────────
        //  Domain-specific loads
        // ─────────────────────────────────────────────

        loadModules() {
          this.pict.PictApplication.setStatus('Loading modules...');
          return this.get('/modules').then(pModules => {
            this.pict.AppData.Manager.Modules = pModules;
            this.pict.AppData.Manager.ModulesByGroup = this._groupBy(pModules, 'Group');
            if (this.pict.views['Manager-Sidebar']) {
              this.pict.views['Manager-Sidebar'].render();
            }
            this.pict.PictApplication.setStatus('Ready. ' + pModules.length + ' modules.');
            return pModules;
          }, pError => {
            this.pict.PictApplication.setStatus('Could not load modules: ' + pError.message);
            throw pError;
          });
        }
        loadModuleDetail(pName) {
          return this.get('/modules/' + encodeURIComponent(pName));
        }
        pollHealth() {
          let tmpSelf = this;
          let fTick = function () {
            tmpSelf.get('/health').then(pHealth => {
              tmpSelf.pict.AppData.Manager.Health = {
                state: 'ok',
                text: 'ok ' + (pHealth.ModuleCount || 0) + ' modules'
              };
              if (tmpSelf.pict.views['Manager-TopBar']) {
                tmpSelf.pict.views['Manager-TopBar'].render();
              }
            }, () => {
              tmpSelf.pict.AppData.Manager.Health = {
                state: 'error',
                text: 'offline'
              };
              if (tmpSelf.pict.views['Manager-TopBar']) {
                tmpSelf.pict.views['Manager-TopBar'].render();
              }
            });
          };
          fTick();
          setInterval(fTick, 30000);
        }
        runAllModulesScript(pScript) {
          return this.post('/all/operations/' + encodeURIComponent(pScript));
        }
        runModuleOperation(pModuleName, pCommand, pArgs, pLabel) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/run', {
            Command: pCommand,
            Args: pArgs,
            Label: pLabel || null
          });
        }
        runModuleDiff(pModuleName) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/diff');
        }

        // Fetch unified git diff as plain text (dist/ excluded). Used by the diff
        // modal to render a syntax-highlighted view, separate from the streaming
        // run-diff that pushes raw lines through the output panel.
        fetchGitDiffText(pModuleName) {
          return fetch(API_BASE + '/modules/' + encodeURIComponent(pModuleName) + '/git/diff', {
            headers: {
              Accept: 'text/plain'
            }
          }).then(pResponse => {
            if (!pResponse.ok) {
              let tmpErr = new Error('HTTP ' + pResponse.status);
              tmpErr.Status = pResponse.status;
              throw tmpErr;
            }
            return pResponse.text();
          });
        }
        bumpVersion(pModuleName, pKind, pVersion) {
          let tmpBody = {
            Kind: pKind
          };
          if (pVersion) {
            tmpBody.Version = pVersion;
          }
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/version', tmpBody);
        }
        cancelOperation(pOperationId) {
          return this.post('/operations/' + encodeURIComponent(pOperationId) + '/cancel');
        }

        // Scan every module for dirty/ahead/behind state.
        scanAllModules() {
          return this.get('/modules/scan');
        }

        // Commit
        commitModule(pModuleName, pMessage) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/commit', {
            Message: pMessage
          });
        }

        // Git add (stages untracked/new files)
        gitAddAll(pModuleName) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/git-add', {
            All: true
          });
        }
        gitAddPaths(pModuleName, pPaths) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/git-add', {
            Paths: pPaths
          });
        }

        // Publish preview + publish
        loadPublishPreview(pModuleName) {
          return this.get('/modules/' + encodeURIComponent(pModuleName) + '/publish/preview');
        }
        publishModule(pModuleName, pPreviewHash, pWithDocker) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/publish', {
            Confirm: true,
            PreviewHash: pPreviewHash,
            WithDocker: !!pWithDocker
          });
        }

        // npm-check-updates
        runNcu(pModuleName, pApply, pScope) {
          return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/ncu', {
            Apply: !!pApply,
            Scope: pScope || 'retold'
          });
        }

        // Manifest CRUD
        loadManifest() {
          return this.get('/manifest');
        }
        loadManifestAudit() {
          return this.get('/manifest/audit');
        }
        createManifestModule(pEntry) {
          return this.post('/manifest/modules', pEntry);
        }
        updateManifestModule(pOriginalName, pEntry) {
          return this.patch('/manifest/modules/' + encodeURIComponent(pOriginalName), pEntry);
        }
        deleteManifestModule(pName) {
          return this.delete('/manifest/modules/' + encodeURIComponent(pName));
        }

        // Ripple
        planRipple(pOptions) {
          return this.post('/ripple/plan', pOptions);
        }
        runRipple(pPlan) {
          return this.post('/ripple/run', {
            Plan: pPlan
          });
        }
        cancelRipple(pRippleId) {
          return this.post('/ripple/' + encodeURIComponent(pRippleId) + '/cancel');
        }
        confirmRippleStep(pRippleId, pStepOrder, pPreviewHash) {
          return this.post('/ripple/' + encodeURIComponent(pRippleId) + '/confirm', {
            StepOrder: pStepOrder,
            Action: 'publish',
            PreviewHash: pPreviewHash
          });
        }

        // ─────────────────────────────────────────────
        //  Internals
        // ─────────────────────────────────────────────

        _groupBy(pList, pKey) {
          let tmpResult = {};
          for (let i = 0; i < pList.length; i++) {
            let tmpEntry = pList[i];
            let tmpGroup = tmpEntry[pKey] || 'Other';
            if (!tmpResult[tmpGroup]) {
              tmpResult[tmpGroup] = [];
            }
            tmpResult[tmpGroup].push(tmpEntry);
          }
          return tmpResult;
        }
      }
      module.exports = ManagerAPIProvider;
      module.exports.default_configuration = _Configuration;
    }, {
      "pict-provider": 7
    }],
    23: [function (require, module, exports) {
      const libPictProvider = require('pict-provider');
      const WS_PATH = '/ws/manager/operations';
      const RECONNECT_DELAY_MS = 2500;
      const _Configuration = {
        ProviderIdentifier: 'ManagerOperationsWS',
        AutoInitialize: true,
        AutoInitializeOrdinal: 2
      };
      class ManagerOperationsWSProvider extends libPictProvider {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._ws = null;
          this._reconnectTimer = null;
        }
        connect() {
          if (this._ws) {
            return;
          }
          let tmpProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          let tmpUrl = tmpProtocol + '//' + window.location.host + WS_PATH;
          this._ws = new WebSocket(tmpUrl);
          this._ws.onopen = () => {
            if (this._reconnectTimer) {
              clearTimeout(this._reconnectTimer);
              this._reconnectTimer = null;
            }
          };
          this._ws.onmessage = pEvent => {
            let tmpFrame;
            try {
              tmpFrame = JSON.parse(pEvent.data);
            } catch (e) {
              return;
            }
            this._handleFrame(tmpFrame);
          };
          this._ws.onclose = () => {
            this._ws = null;
            if (!this._reconnectTimer) {
              this._reconnectTimer = setTimeout(() => {
                this.connect();
              }, RECONNECT_DELAY_MS);
            }
          };
          this._ws.onerror = () => {/* onclose will fire right after */};
        }

        // ─────────────────────────────────────────────
        //  Frame dispatch — updates AppData.Manager.ActiveOperation + triggers re-renders
        // ─────────────────────────────────────────────

        _handleFrame(pFrame) {
          // Ripple frames carry a RippleId and route to the Ripple view first.
          // While a ripple is active, op-scoped frames (start/stdout/progress/
          // complete/error) are also mirrored into the current step's output so
          // the user can see install/test/publish output inline with the timeline.
          if (pFrame.Type && pFrame.Type.indexOf('ripple-') === 0) {
            let tmpRippleView = this.pict.views['Manager-Ripple'];
            if (tmpRippleView && typeof tmpRippleView.handleFrame === 'function') {
              tmpRippleView.handleFrame(pFrame);
            }
            return;
          }
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (tmpRipple && tmpRipple.Status === 'running') {
            let tmpRippleView = this.pict.views['Manager-Ripple'];
            if (tmpRippleView && typeof tmpRippleView.handleFrame === 'function') {
              tmpRippleView.handleFrame(pFrame);
            }
            // Still fall through so the output panel mirrors the frames too.
          }
          let tmpOp = this.pict.AppData.Manager.ActiveOperation;
          if (!tmpOp) {
            return;
          }
          let tmpComplete = false;
          switch (pFrame.Type) {
            case 'hello':
              // server handshake; nothing to do
              break;
            case 'start':
              tmpOp.OperationId = pFrame.OperationId;
              tmpOp.HeaderState = 'running';
              tmpOp.HeaderText = pFrame.CommandString || pFrame.OperationId;
              // Preserve the optimistic Lines / Scope set by the initiator
              // (so the user immediately sees the cmd they kicked off, even
              // if the WS is a beat behind the HTTP response).
              if (!tmpOp.Lines) {
                tmpOp.Lines = [];
              }
              tmpOp.Lines.push({
                Class: 'cmd',
                Text: '$ ' + (pFrame.CommandString || '')
              });
              if (pFrame.Cwd) {
                tmpOp.Lines.push({
                  Class: 'meta',
                  Text: '  cwd: ' + pFrame.Cwd
                });
              }
              if (pFrame.Label) {
                tmpOp.Lines.push({
                  Class: 'meta',
                  Text: '  ' + pFrame.Label
                });
              }
              break;
            case 'stdout':
              tmpOp.Lines.push({
                Class: pFrame.Channel === 'stderr' ? 'stderr' : '',
                Text: pFrame.Text || ''
              });
              break;
            case 'progress':
              if (pFrame.Message) {
                tmpOp.Lines.push({
                  Class: 'meta',
                  Text: '... ' + pFrame.Message
                });
              }
              break;
            case 'complete':
              if (pFrame.ExitCode === 0) {
                tmpOp.HeaderState = 'success';
                tmpOp.HeaderText = 'Completed' + (pFrame.Duration ? ' (' + pFrame.Duration + ')' : '');
                tmpOp.Lines.push({
                  Class: 'success',
                  Text: 'Done' + (pFrame.Duration ? '  ' + pFrame.Duration : '')
                });
              } else {
                tmpOp.HeaderState = 'error';
                tmpOp.HeaderText = 'Failed exit ' + pFrame.ExitCode;
                tmpOp.Lines.push({
                  Class: 'error',
                  Text: 'exit ' + pFrame.ExitCode + (pFrame.Duration ? '  (' + pFrame.Duration + ')' : '')
                });
              }
              tmpComplete = true;
              break;
            case 'error':
              tmpOp.HeaderState = 'error';
              tmpOp.HeaderText = 'Error';
              tmpOp.Lines.push({
                Class: 'error',
                Text: 'Error: ' + (pFrame.Error || 'unknown')
              });
              tmpComplete = true;
              break;
            case 'cancelled':
              tmpOp.HeaderState = 'error';
              tmpOp.HeaderText = 'Cancelled';
              tmpOp.Lines.push({
                Class: 'error',
                Text: 'Cancelled'
              });
              tmpComplete = true;
              break;
            default:
              return;
          }

          // Stdout frames are the hot path during noisy ops — append-only +
          // rAF coalescing keeps the renderer from quadratically rebuilding
          // the whole log on every line. Lifecycle frames (start/complete/
          // error/cancelled) reset the shell template.
          let tmpHotPath = pFrame.Type === 'stdout' || pFrame.Type === 'progress';
          let tmpPanel = this.pict.views['Manager-OutputPanel'];
          if (tmpPanel) {
            if (tmpHotPath && typeof tmpPanel.scheduleAppend === 'function') {
              tmpPanel.scheduleAppend();
            } else {
              tmpPanel.render();
            }
          }
          // Live log modal (open during cross-module ops or when the user
          // explicitly requested the live view). renderFrame is rAF-batched.
          if (this.pict.views['Manager-LogModal']) {
            this.pict.views['Manager-LogModal'].renderFrame();
          }

          // On completion of a module-scoped op, reload the module detail so the
          // dirty-files list, package version, and dep ranges reflect reality.
          if (tmpComplete && tmpOp.Scope === 'module' && tmpOp.ModuleName) {
            let tmpWs = this.pict.views['Manager-ModuleWorkspace'];
            if (tmpWs && this.pict.AppData.Manager.SelectedModule === tmpOp.ModuleName && typeof tmpWs.refreshDetail === 'function') {
              tmpWs.refreshDetail();
            }
          }
        }
      }
      module.exports = ManagerOperationsWSProvider;
      module.exports.default_configuration = _Configuration;
    }, {
      "pict-provider": 7
    }],
    24: [function (require, module, exports) {
      module.exports = {
        "ProviderIdentifier": "Pict-Router",
        "AutoInitialize": true,
        "AutoInitializeOrdinal": 0,
        "Routes": [{
          "path": "/Home",
          "template": "{~LV:Pict.PictApplication.showView(`Manager-Home`)~}"
        }, {
          "path": "/Manifest",
          "template": "{~LV:Pict.PictApplication.showView(`Manager-ManifestEditor`)~}"
        }, {
          "path": "/Log",
          "template": "{~LV:Pict.PictApplication.showView(`Manager-LogViewer`)~}"
        }, {
          "path": "/Ripple",
          "template": "{~LV:Pict.PictApplication.showView(`Manager-Ripple`)~}"
        }]
      };
    }, {}],
    25: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Home',
        DefaultRenderable: 'Manager-Home-Content',
        DefaultDestinationAddress: '#RM-Workspace-Content',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-Home-Template',
          Template: /*html*/`
<div class="placeholder">
	<h2>Select a module</h2>
	<p>Pick a module from the sidebar to review its status, bump, commit, and publish.</p>
	<p class="hint">Pict migration in progress — additional flows land over the next few sessions.</p>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Home-Content',
          TemplateHash: 'Manager-Home-Template',
          DestinationAddress: '#RM-Workspace-Content',
          RenderMethod: 'replace'
        }]
      };
      class ManagerHomeView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerHomeView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    26: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Layout',
        DefaultRenderable: 'Manager-Layout-Shell',
        DefaultDestinationAddress: '#RetoldManager-Application-Container',
        AutoRender: false,
        CSS: /*css*/`
		/* The pict layout shell renders inside #RetoldManager-Application-Container,
		   NOT directly under <body>. Make that container a viewport-sized flex
		   column so #RM-Main gets a bounded height and the workspace can scroll. */
		#RetoldManager-Application-Container
		{
			display: flex;
			flex-direction: column;
			height: 100vh;
			min-height: 0;
			overflow: hidden;
		}
		#RM-TopBar    { flex: 0 0 var(--topbar-height); }
		#RM-StatusBar { flex: 0 0 var(--statusbar-height); }
		#RM-Main      { flex: 1 1 0; min-height: 0; }

		#RM-Main > aside,
		#RM-Main > section { min-height: 0; }

		#RM-Workspace
		{
			position: relative;
			display: flex;
			flex-direction: column;
			min-height: 0;
			overflow-y: auto;
		}
		#RM-Workspace-Content { flex: 1 1 auto; min-height: 0; }
	`,
        Templates: [{
          Hash: 'Manager-Layout-Shell-Template',
          Template: /*html*/`
<header id="RM-TopBar"></header>
<main id="RM-Main">
	<aside id="RM-Sidebar"></aside>
	<section id="RM-Workspace">
		<div id="RM-Workspace-Content"></div>
	</section>
</main>
<footer id="RM-StatusBar"></footer>
<div id="RM-ModalRoot"></div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Layout-Shell',
          TemplateHash: 'Manager-Layout-Shell-Template',
          DestinationAddress: '#RetoldManager-Application-Container',
          RenderMethod: 'replace'
        }]
      };
      class ManagerLayoutView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent) {
          // Cascade into the fixed shell views.
          this.pict.views['Manager-TopBar'].render();
          this.pict.views['Manager-Sidebar'].render();
          this.pict.views['Manager-StatusBar'].render();

          // Default workspace content — the router will override on resolve().
          // (The output panel renders inside the module workspace template, so
          // we don't kick it off here at the layout level.)
          this.pict.views['Manager-Home'].render();
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerLayoutView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    27: [function (require, module, exports) {
      const libPictView = require('pict-view');

      /**
       * Manager-LogModal
       *
       * A pict-section-modal-backed log viewer with a fullscreen toggle.
       *
       * Two modes:
       *   openForLogFile()  - reads /api/manager/log on demand with a refresh button.
       *   openForOperation(pLabel) - streams live frames from AppData.Manager.ActiveOperation
       *                              into the modal body until completion.
       *
       * Exposes a single dialog at a time. Re-opening swaps the content.
       */

      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-LogModal',
        AutoRender: false,
        CSS: /*css*/`
		.rm-log-modal-body
		{
			background: #05070a;
			color: #c9d1d9;
			font-family: var(--font-mono);
			font-size: 12px;
			line-height: 1.4;
			padding: 12px;
			margin: 0;
			border-radius: 6px;
			border: 1px solid var(--color-border);
			height: 60vh;
			max-height: 70vh;
			overflow: auto;
			white-space: pre-wrap;
			word-break: break-word;
		}
		.rm-log-modal-body.empty { color: var(--color-muted); font-style: italic; }
		.rm-log-modal-body .line { display: block; }
		.rm-log-modal-body .line.cmd     { color: var(--color-accent); font-weight: 600; }
		.rm-log-modal-body .line.meta    { color: var(--color-muted); }
		.rm-log-modal-body .line.stderr  { color: var(--color-danger); }
		.rm-log-modal-body .line.success { color: var(--color-success); font-weight: 600; }
		.rm-log-modal-body .line.error   { color: var(--color-danger); font-weight: 600; }
		.rm-log-modal-toolbar
		{
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 0 0 8px;
			font-family: var(--font-mono);
			font-size: 11.5px;
			color: var(--color-muted);
		}
		.rm-log-modal-toolbar .spacer { flex: 1 1 auto; }
		.rm-log-modal-toolbar button
		{
			font-family: var(--font-mono);
			font-size: 11.5px;
			background: transparent;
			color: var(--color-text);
			border: 1px solid var(--color-border);
			padding: 3px 10px;
			border-radius: 4px;
			cursor: pointer;
		}
		.rm-log-modal-toolbar button:hover { border-color: var(--color-accent); color: var(--color-accent); }
		.rm-log-modal-toolbar .live-dot
		{
			display: inline-block;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--color-muted);
		}
		.rm-log-modal-toolbar.running .live-dot { background: var(--color-accent); animation: pulse 1s infinite; }
		.rm-log-modal-toolbar.success .live-dot { background: var(--color-success); }
		.rm-log-modal-toolbar.error   .live-dot { background: var(--color-danger); }

		/* Fullscreen takeover - applies to the pict-modal-dialog when toggled */
		.pict-modal-dialog.rm-log-modal-fullscreen
		{
			width: 100vw !important;
			max-width: 100vw !important;
			height: 100vh;
			max-height: 100vh !important;
			top: 0;
			left: 0;
			transform: none !important;
			border-radius: 0;
		}
		.pict-modal-dialog.rm-log-modal-fullscreen .rm-log-modal-body
		{
			height: calc(100vh - 130px);
			max-height: none;
		}
	`
      };
      class ManagerLogModalView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._mode = null; // 'logfile' | 'operation' | null
          this._dialog = null; // current pict-modal-dialog element
          this._dismissDialog = null; // function to dismiss the current dialog
          this._headerLabel = '';
          this._renderedUpTo = 0; // append cursor for live mode
          this._lastOpId = null;
          this._rafPending = false;
        }

        // ─────────────────────────────────────────────
        //  Public API
        // ─────────────────────────────────────────────

        openForLogFile() {
          this._mode = 'logfile';
          this._headerLabel = 'Operation log';
          this._openShell();
          this.refreshLogFile(500);
        }
        openForOperation(pLabel) {
          this._mode = 'operation';
          this._headerLabel = pLabel || 'Live operation';
          this._renderedUpTo = 0;
          this._lastOpId = null;
          this._openShell();
          this.renderFrame();
        }

        // Called from OperationsWS provider whenever ActiveOperation updates. We
        // coalesce many frame events into one paint via requestAnimationFrame so
        // a flood of stdout (e.g. a noisy publish) doesn't pile up DOM work.
        renderFrame() {
          if (this._mode !== 'operation' || !this._dialog) {
            return;
          }
          if (this._rafPending) {
            return;
          }
          this._rafPending = true;
          let tmpSelf = this;
          let tmpRaf = typeof window !== 'undefined' && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (pCb) {
            return setTimeout(pCb, 16);
          };
          tmpRaf(function () {
            tmpSelf._rafPending = false;
            if (tmpSelf._mode !== 'operation' || !tmpSelf._dialog) {
              return;
            }
            let tmpOp = tmpSelf.pict.AppData.Manager.ActiveOperation;
            tmpSelf._paintOperationBody(tmpOp);
            tmpSelf._paintOperationToolbar(tmpOp);
          });
        }
        close() {
          if (this._dismissDialog) {
            let tmpDismiss = this._dismissDialog;
            this._dismissDialog = null;
            tmpDismiss(null);
          }
          this._dialog = null;
          this._mode = null;
        }
        refreshLogFile(pTail) {
          if (this._mode !== 'logfile' || !this._dialog) {
            return;
          }
          let tmpToolbar = this._dialog.querySelector('.rm-log-modal-toolbar .meta-text');
          let tmpBody = this._dialog.querySelector('.rm-log-modal-body');
          if (tmpToolbar) {
            tmpToolbar.textContent = 'loading...';
          }
          if (tmpBody) {
            tmpBody.textContent = 'fetching...';
            tmpBody.classList.add('empty');
          }
          this.pict.providers.ManagerAPI.get('/log?tail=' + (pTail || 500)).then(pBody => {
            if (this._mode !== 'logfile' || !this._dialog) {
              return;
            }
            if (tmpToolbar) {
              tmpToolbar.textContent = pBody.Exists ? pBody.Path + ' — last ' + pBody.Lines.length + ' / ' + pBody.Total + ' lines' : pBody.Path + ' — (no log yet)';
            }
            if (tmpBody) {
              let tmpText = (pBody.Lines || []).join('\n');
              tmpBody.textContent = tmpText || '(empty)';
              if (tmpText) {
                tmpBody.classList.remove('empty');
              }
              tmpBody.scrollTop = tmpBody.scrollHeight;
            }
          }, pError => {
            if (tmpBody) {
              tmpBody.textContent = 'Error loading log: ' + pError.message;
              tmpBody.classList.add('empty');
            }
          });
        }

        // ─────────────────────────────────────────────
        //  Dialog plumbing
        // ─────────────────────────────────────────────

        _openShell() {
          // Close any existing dialog first so we don't stack them.
          if (this._dismissDialog) {
            this._dismissDialog(null);
            this._dismissDialog = null;
            this._dialog = null;
          }
          let tmpModal = this.pict.views['Pict-Section-Modal'];
          if (!tmpModal) {
            this.pict.log.error('pict-section-modal view not registered');
            return;
          }
          let tmpToolbarHtml = this._mode === 'logfile' ? this._logFileToolbar() : this._operationToolbar();
          let tmpContent = tmpToolbarHtml + '<pre class="rm-log-modal-body empty">(no output yet)</pre>';
          tmpModal.show({
            title: this._headerLabel,
            content: tmpContent,
            width: '900px',
            closeable: true,
            buttons: [],
            onOpen: pDialog => {
              this._dialog = pDialog;
              this._dismissDialog = pDialog._dismiss;
              this._wireToolbar(pDialog);
            },
            onClose: () => {
              this._dialog = null;
              this._dismissDialog = null;
              this._mode = null;
            }
          });
        }
        _logFileToolbar() {
          return '' + '<div class="rm-log-modal-toolbar">' + '  <span class="meta-text">loading...</span>' + '  <span class="spacer"></span>' + '  <button data-rm-log-action="refresh-500">Refresh (500)</button>' + '  <button data-rm-log-action="refresh-2000">Last 2000</button>' + '  <button data-rm-log-action="fullscreen">Fullscreen</button>' + '</div>';
        }
        _operationToolbar() {
          return '' + '<div class="rm-log-modal-toolbar">' + '  <span class="live-dot"></span>' + '  <span class="meta-text">starting...</span>' + '  <span class="spacer"></span>' + '  <button data-rm-log-action="cancel">Cancel</button>' + '  <button data-rm-log-action="fullscreen">Fullscreen</button>' + '</div>';
        }
        _wireToolbar(pDialog) {
          let tmpButtons = pDialog.querySelectorAll('[data-rm-log-action]');
          for (let i = 0; i < tmpButtons.length; i++) {
            let tmpBtn = tmpButtons[i];
            tmpBtn.addEventListener('click', pEvent => {
              let tmpAction = pEvent.currentTarget.getAttribute('data-rm-log-action');
              this._handleToolbarAction(tmpAction, pEvent.currentTarget);
            });
          }
        }
        _handleToolbarAction(pAction, pButton) {
          switch (pAction) {
            case 'refresh-500':
              this.refreshLogFile(500);
              break;
            case 'refresh-2000':
              this.refreshLogFile(2000);
              break;
            case 'fullscreen':
              if (!this._dialog) {
                return;
              }
              let tmpFullscreen = this._dialog.classList.toggle('rm-log-modal-fullscreen');
              if (pButton) {
                pButton.textContent = tmpFullscreen ? 'Exit fullscreen' : 'Fullscreen';
              }
              break;
            case 'cancel':
              let tmpOp = this.pict.AppData.Manager.ActiveOperation;
              if (tmpOp.OperationId && tmpOp.HeaderState === 'running') {
                this.pict.providers.ManagerAPI.cancelOperation(tmpOp.OperationId);
              }
              break;
          }
        }
        _paintOperationBody(pOp) {
          if (!this._dialog) {
            return;
          }
          let tmpBody = this._dialog.querySelector('.rm-log-modal-body');
          if (!tmpBody) {
            return;
          }
          let tmpLines = pOp && pOp.Lines ? pOp.Lines : [];

          // Operation switched out from under us — wipe and start fresh.
          let tmpOpId = pOp ? pOp.OperationId : null;
          if (tmpOpId !== this._lastOpId) {
            this._lastOpId = tmpOpId;
            this._renderedUpTo = 0;
            tmpBody.innerHTML = '';
          }
          if (tmpLines.length === 0) {
            if (this._renderedUpTo === 0) {
              tmpBody.textContent = '(no output yet)';
              tmpBody.classList.add('empty');
            }
            return;
          }
          tmpBody.classList.remove('empty');

          // Append-only: only build DOM for new lines since the last paint.
          if (this._renderedUpTo === 0) {
            tmpBody.innerHTML = '';
          }
          let tmpFrag = document.createDocumentFragment();
          for (let i = this._renderedUpTo; i < tmpLines.length; i++) {
            let tmpLine = tmpLines[i];
            let tmpSpan = document.createElement('span');
            tmpSpan.className = tmpLine.Class ? 'line ' + tmpLine.Class : 'line';
            tmpSpan.textContent = tmpLine.Text;
            tmpFrag.appendChild(tmpSpan);
          }
          tmpBody.appendChild(tmpFrag);
          this._renderedUpTo = tmpLines.length;
          let tmpAtBottom = tmpBody.scrollHeight - tmpBody.scrollTop - tmpBody.clientHeight < 80;
          if (tmpAtBottom) {
            tmpBody.scrollTop = tmpBody.scrollHeight;
          }
        }
        _paintOperationToolbar(pOp) {
          if (!this._dialog) {
            return;
          }
          let tmpToolbar = this._dialog.querySelector('.rm-log-modal-toolbar');
          if (!tmpToolbar) {
            return;
          }
          tmpToolbar.classList.remove('running', 'success', 'error');
          if (pOp.HeaderState) {
            tmpToolbar.classList.add(pOp.HeaderState);
          }
          let tmpText = tmpToolbar.querySelector('.meta-text');
          if (tmpText) {
            tmpText.textContent = pOp.HeaderText || pOp.HeaderState || 'idle';
          }
          let tmpCancel = tmpToolbar.querySelector('[data-rm-log-action="cancel"]');
          if (tmpCancel) {
            tmpCancel.disabled = pOp.HeaderState !== 'running';
          }
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        _escapeAttr(pText) {
          return this._escape(pText);
        }
      }
      module.exports = ManagerLogModalView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    28: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-LogViewer',
        DefaultRenderable: 'Manager-LogViewer-Content',
        DefaultDestinationAddress: '#RM-Workspace-Content',
        AutoRender: false,
        CSS: /*css*/`
		.log-viewer-pane
		{
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
		}
		.log-viewer-pane pre
		{
			flex: 1 1 auto;
			min-height: 0;
			overflow: auto;
			margin: 0;
			padding: 10px;
			background: var(--color-panel);
			border: 1px solid var(--color-border);
			border-radius: 6px;
			font-family: var(--font-mono);
			font-size: 12px;
			white-space: pre-wrap;
			word-break: break-word;
		}
	`,
        Templates: [{
          Hash: 'Manager-LogViewer-Template',
          Template: /*html*/`
<div class="log-viewer-pane">
	<h2>Operation log <span class="subtle" id="RM-LogPath" style="margin-left:12px;font-size:11px">loading...</span></h2>
	<div class="action-row" style="margin:0 0 10px">
		<button class="action" onclick="{~P~}.views['Manager-LogViewer'].refresh(500)">Refresh</button>
		<button class="action" onclick="{~P~}.views['Manager-LogViewer'].refresh(2000)">Last 2000 lines</button>
		<button class="action" onclick="{~P~}.views['Manager-LogViewer'].refresh(500)">Last 500 lines</button>
	</div>
	<pre id="RM-LogBody">fetching...</pre>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-LogViewer-Content',
          TemplateHash: 'Manager-LogViewer-Template',
          DestinationAddress: '#RM-Workspace-Content',
          RenderMethod: 'replace'
        }]
      };
      class ManagerLogViewerView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.refresh(500);
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
        refresh(pTail) {
          this.pict.PictApplication.setStatus('Loading log...');
          this.pict.providers.ManagerAPI.get('/log?tail=' + (pTail || 500)).then(pBody => {
            let tmpPath = document.getElementById('RM-LogPath');
            if (tmpPath) {
              tmpPath.textContent = pBody.Exists ? pBody.Path + ' — showing last ' + pBody.Lines.length + ' of ' + pBody.Total + ' lines' : pBody.Path + ' — (not yet written; no ops run today)';
            }
            let tmpBody = document.getElementById('RM-LogBody');
            if (tmpBody) {
              tmpBody.textContent = (pBody.Lines || []).join('\n');
              tmpBody.scrollTop = tmpBody.scrollHeight;
            }
            this.pict.PictApplication.setStatus('Log loaded.');
          }, pError => {
            let tmpBody = document.getElementById('RM-LogBody');
            if (tmpBody) {
              tmpBody.textContent = 'Error loading log: ' + pError.message;
            }
            this.pict.PictApplication.setStatus('Log load failed.');
          });
        }
      }
      module.exports = ManagerLogViewerView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    29: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-ManifestEditor',
        DefaultRenderable: 'Manager-ManifestEditor-Content',
        DefaultDestinationAddress: '#RM-Workspace-Content',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ManifestEditor',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-ManifestEditor-Template',
          Template: /*html*/`
<div class="manifest-editor">
	<h2>Manifest editor <span class="audit-badge {~D:Record.AuditClass~}" id="RM-AuditBadge">{~D:Record.AuditLabel~}</span></h2>
	<p class="subtle">Edits save directly to <code>Retold-Modules-Manifest.json</code>.
	Every change rewrites the file atomically (tmp + rename) and the sidebar re-syncs.</p>
	<div id="RM-ManifestGroups">{~D:Record.GroupsHtml~}</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-ManifestEditor-Content',
          TemplateHash: 'Manager-ManifestEditor-Template',
          DestinationAddress: '#RM-Workspace-Content',
          RenderMethod: 'replace'
        }]
      };
      class ManagerManifestEditorView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._manifest = null;
          this._audit = null;
        }

        // Called on route → also after an edit/add/delete to refresh.
        reload() {
          this._writeRecord({
            AuditClass: '',
            AuditLabel: 'auditing...',
            GroupsHtml: '<p class="loading">Loading manifest...</p>'
          });
          this.render();
          this.pict.PictApplication.setStatus('Loading manifest...');
          Promise.all([this.pict.providers.ManagerAPI.loadManifest(), this.pict.providers.ManagerAPI.loadManifestAudit()]).then(pResults => {
            this._manifest = pResults[0];
            this._audit = pResults[1];
            this._writeRecord(this._buildRecord());
            this.render();
            this.pict.PictApplication.setStatus('Manifest loaded. ' + this._audit.Totals.Manifest + ' modules (disk: ' + this._audit.Totals.Disk + ').');
          }, pError => {
            this._writeRecord({
              AuditClass: 'drift',
              AuditLabel: 'load failed',
              GroupsHtml: '<p class="loading">Error loading manifest: ' + this._escape(pError.message) + '</p>'
            });
            this.render();
            this.pict.PictApplication.setStatus('Manifest load failed.');
          });
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this._wireButtons();
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }

        // ─────────────────────────────────────────────

        _wireButtons() {
          let tmpButtons = document.querySelectorAll('#RM-ManifestGroups button[data-act]');
          for (let i = 0; i < tmpButtons.length; i++) {
            tmpButtons[i].addEventListener('click', pEvent => {
              let tmpAct = pEvent.currentTarget.getAttribute('data-act');
              let tmpGroup = pEvent.currentTarget.getAttribute('data-group');
              let tmpName = pEvent.currentTarget.getAttribute('data-name');
              this._handleButton(tmpAct, tmpGroup, tmpName);
            });
          }
        }
        _handleButton(pAct, pGroup, pName) {
          let tmpEditView = this.pict.views['Manager-Modal-EditModule'];
          if (!tmpEditView) {
            return;
          }
          switch (pAct) {
            case 'edit-module':
              {
                let tmpExisting = this._findModule(pName);
                if (tmpExisting) {
                  tmpEditView.open({
                    GroupName: tmpExisting.Group,
                    ExistingEntry: tmpExisting.Entry
                  });
                }
                return;
              }
            case 'add-module':
              tmpEditView.open({
                GroupName: pGroup
              });
              return;
            case 'add-from-disk':
              tmpEditView.open({
                GroupName: pGroup,
                SeedName: pName
              });
              return;
            case 'delete-module':
              if (!window.confirm('Remove "' + pName + '" from the manifest?\n\nThe module directory on disk is NOT touched — only the manifest entry is removed.')) {
                return;
              }
              this.pict.providers.ManagerAPI.deleteManifestModule(pName).then(() => {
                this.reload();
                this.pict.providers.ManagerAPI.loadModules();
              }, pError => {
                window.alert('Delete failed: ' + pError.message);
              });
              return;
          }
        }
        _findModule(pName) {
          if (!this._manifest) {
            return null;
          }
          for (let i = 0; i < this._manifest.Groups.length; i++) {
            let tmpGroup = this._manifest.Groups[i];
            for (let j = 0; j < tmpGroup.Modules.length; j++) {
              if (tmpGroup.Modules[j].Name === pName) {
                return {
                  Group: tmpGroup.Name,
                  Entry: tmpGroup.Modules[j]
                };
              }
            }
          }
          return null;
        }
        _writeRecord(pRecord) {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.ManifestEditor = pRecord;
        }
        _buildRecord() {
          let tmpAudit = this._audit;
          let tmpAuditClass = tmpAudit.Clean ? 'ok' : 'drift';
          let tmpAuditLabel = tmpAudit.Clean ? 'in sync with disk' : 'drift: ' + tmpAudit.Drift.ManifestMissing + ' missing, ' + tmpAudit.Drift.ManifestOrphaned + ' orphaned';
          return {
            AuditClass: tmpAuditClass,
            AuditLabel: tmpAuditLabel,
            GroupsHtml: this._renderGroups()
          };
        }
        _renderGroups() {
          let tmpAuditByGroup = {};
          for (let i = 0; i < this._audit.Groups.length; i++) {
            tmpAuditByGroup[this._audit.Groups[i].Name] = this._audit.Groups[i];
          }
          let tmpHtml = '';
          for (let i = 0; i < this._manifest.Groups.length; i++) {
            let tmpGroup = this._manifest.Groups[i];
            let tmpGroupAudit = tmpAuditByGroup[tmpGroup.Name] || {
              ManifestMissing: [],
              ManifestOrphaned: []
            };
            let tmpOrphanSet = new Set(tmpGroupAudit.ManifestOrphaned);
            tmpHtml += '<div class="group-card">';
            tmpHtml += '  <div class="group-card-header">';
            tmpHtml += '    <span class="name">' + this._escape(tmpGroup.Name) + '</span>';
            tmpHtml += '    <span class="desc">' + this._escape(tmpGroup.Description || '') + '</span>';
            tmpHtml += '    <button class="action" data-act="add-module" data-group="' + this._escape(tmpGroup.Name) + '">+ Add module</button>';
            tmpHtml += '  </div>';
            tmpHtml += '<table class="module-table">';
            tmpHtml += '<thead><tr>' + '<th style="width:28%">Name</th>' + '<th style="width:44%">Description</th>' + '<th>Status</th>' + '<th></th>' + '</tr></thead><tbody>';
            for (let j = 0; j < tmpGroup.Modules.length; j++) {
              let tmpModule = tmpGroup.Modules[j];
              let tmpIsOrphan = tmpOrphanSet.has(tmpModule.Name);
              tmpHtml += '<tr' + (tmpIsOrphan ? ' class="orphan"' : '') + '>';
              tmpHtml += '<td>' + this._escape(tmpModule.Name) + '</td>';
              tmpHtml += '<td>' + this._escape(tmpModule.Description || '') + '</td>';
              tmpHtml += '<td>' + (tmpIsOrphan ? 'missing on disk' : '—') + '</td>';
              tmpHtml += '<td class="actions">' + '<button data-act="edit-module" data-name="' + this._escape(tmpModule.Name) + '">edit</button>' + '<button class="danger" data-act="delete-module" data-name="' + this._escape(tmpModule.Name) + '">delete</button>' + '</td>';
              tmpHtml += '</tr>';
            }
            for (let j = 0; j < tmpGroupAudit.ManifestMissing.length; j++) {
              let tmpDiskOnly = tmpGroupAudit.ManifestMissing[j];
              tmpHtml += '<tr class="orphan">';
              tmpHtml += '<td><em>' + this._escape(tmpDiskOnly) + '</em></td>';
              tmpHtml += '<td><em>not in manifest (present on disk)</em></td>';
              tmpHtml += '<td>disk-only</td>';
              tmpHtml += '<td class="actions">' + '<button data-act="add-from-disk" data-group="' + this._escape(tmpGroup.Name) + '" data-name="' + this._escape(tmpDiskOnly) + '">+ add to manifest</button>' + '</td>';
              tmpHtml += '</tr>';
            }
            tmpHtml += '</tbody></table>';
            tmpHtml += '</div>';
          }
          return tmpHtml;
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerManifestEditorView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    30: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-ModuleWorkspace',
        DefaultRenderable: 'Manager-ModuleWorkspace-Content',
        DefaultDestinationAddress: '#RM-Workspace-Content',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ModuleWorkspace',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-ModuleWorkspace-Loading-Template',
          Template: /*html*/`
<div class="placeholder"><h2>Loading {~D:Record.Name~}...</h2></div>
`
        }, {
          Hash: 'Manager-ModuleWorkspace-Error-Template',
          Template: /*html*/`
<div class="placeholder">
	<h2>Error loading {~D:Record.Name~}</h2>
	<p>{~D:Record.Message~}</p>
</div>
`
        }, {
          Hash: 'Manager-ModuleWorkspace-Content-Template',
          Template: /*html*/`
<div id="RM-Mod-InfoBox" class="module-info-box collapsed"
	onclick="{~P~}.views['Manager-ModuleWorkspace'].toggleInfoBox()">
	{~D:Record.InfoBoxBody~}
</div>

<div class="workspace-header">
	<span class="module-name">{~D:Record.Manifest.Name~}</span>
	{~D:Record.PackageVersionBadge~}
	{~D:Record.GitBranchBadge~}
	<div class="workspace-header-right">
		{~D:Record.GitHubLink~}
		{~D:Record.NpmLink~}
		{~D:Record.DocsLink~}
	</div>
</div>
{~D:Record.DescriptionBlock~}

<div class="action-groups">
	<div class="action-group">
		<div class="action-group-label">npm</div>
		<div class="action-row">
			<button class="action" data-op="install">install</button>
			<button class="action" data-op="test">test</button>
			<button class="action" data-op="types">types</button>
			<button class="action" data-op="build">build</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">version</div>
		<div class="action-row">
			<button class="action" data-op="bump-patch">+ patch</button>
			<button class="action" data-op="bump-minor">+ minor</button>
			<button class="action" data-op="bump-major">+ major</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">git</div>
		<div class="action-row">
			<button class="action" data-op="diff">diff</button>
			<button class="action" data-op="git-add">add -A</button>
			<button class="action" data-op="commit">commit</button>
			<button class="action" data-op="pull">pull</button>
			<button class="action" data-op="push">push</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">npm extras</div>
		<div class="action-row">
			<button class="action" data-op="ncu">ncu...</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">publish</div>
		<div class="action-row">
			<button class="action success" data-op="publish" title="Open the publish dialog (npm or npm + Docker image)">publish...</button>
			<button class="action primary" data-op="ripple">Ripple</button>
		</div>
	</div>
</div>

<!-- Live operation log for this module's most recent action -->
<div id="RM-OutputPanelContainer"></div>

<div id="RM-Mod-FilesArea">{~D:Record.GitFilesSection~}</div>

<div id="RM-Mod-DepsArea">
	{~D:Record.RetoldDepsSection~}
	{~D:Record.ExternalDepsSection~}
	{~D:Record.RetoldDevDepsSection~}
	{~D:Record.ExternalDevDepsSection~}
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-ModuleWorkspace-Content',
          TemplateHash: 'Manager-ModuleWorkspace-Content-Template',
          DestinationAddress: '#RM-Workspace-Content',
          RenderMethod: 'replace'
        }]
      };
      class ManagerModuleWorkspaceView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._boundName = null;
          this._infoBoxCollapsed = true;
        }

        // External entry: the app routes /Module/:name here and calls loadModule.
        loadModule(pName) {
          this._boundName = pName;

          // Loading placeholder
          let tmpLoading = this.pict.parseTemplateByHash('Manager-ModuleWorkspace-Loading-Template', {
            Name: pName
          });
          this.pict.ContentAssignment.assignContent('#RM-Workspace-Content', tmpLoading);
          this.pict.PictApplication.setStatus('Loading ' + pName + '...');
          this.pict.providers.ManagerAPI.loadModuleDetail(pName).then(pDetail => {
            if (this._boundName !== pName) {
              return;
            }
            this.pict.AppData.Manager.SelectedModuleDetail = pDetail;
            this._renderFromDetail();
            this.pict.PictApplication.setStatus('Ready. ' + pName + '.');
          }, pError => {
            if (this._boundName !== pName) {
              return;
            }
            let tmpErr = this.pict.parseTemplateByHash('Manager-ModuleWorkspace-Error-Template', {
              Name: pName,
              Message: pError.message
            });
            this.pict.ContentAssignment.assignContent('#RM-Workspace-Content', tmpErr);
            this.pict.PictApplication.setStatus('Error loading ' + pName + '.');
          });
        }

        // Refresh the detail in the background and patch the dynamic sections of
        // the workspace (info box + deps + git files) without disturbing the
        // inline output panel. Used after a module-scoped operation completes so
        // stale data (like uncommitted files that just got committed) updates.
        refreshDetail() {
          if (!this._boundName) {
            return;
          }
          let tmpName = this._boundName;
          this.pict.providers.ManagerAPI.loadModuleDetail(tmpName).then(pDetail => {
            if (this._boundName !== tmpName) {
              return;
            }
            this.pict.AppData.Manager.SelectedModuleDetail = pDetail;
            this._patchDynamicSections();
          }, () => {/* swallow — not fatal */});
        }
        _renderFromDetail() {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.ModuleWorkspace = this._computeViewRecord();
          this.render();
        }

        // Replace just the info-box body and the deps area in place. Keeps the
        // output panel intact (its DOM container survives because we don't touch
        // #RM-OutputPanelContainer).
        _patchDynamicSections() {
          let tmpRecord = this._computeViewRecord();
          this.pict.AppData.Manager.ViewRecord.ModuleWorkspace = tmpRecord;
          let tmpInfo = document.getElementById('RM-Mod-InfoBox');
          if (tmpInfo) {
            tmpInfo.innerHTML = tmpRecord.InfoBoxBody;
          }
          let tmpFiles = document.getElementById('RM-Mod-FilesArea');
          if (tmpFiles) {
            tmpFiles.innerHTML = tmpRecord.GitFilesSection;
          }
          let tmpDeps = document.getElementById('RM-Mod-DepsArea');
          if (tmpDeps) {
            tmpDeps.innerHTML = '' + tmpRecord.RetoldDepsSection + tmpRecord.ExternalDepsSection + tmpRecord.RetoldDevDepsSection + tmpRecord.ExternalDevDepsSection;
          }
          this._wireFileButtons();
        }
        toggleInfoBox() {
          let tmpEl = document.getElementById('RM-Mod-InfoBox');
          if (!tmpEl) {
            return;
          }
          this._infoBoxCollapsed = !this._infoBoxCollapsed;
          tmpEl.classList.toggle('collapsed', this._infoBoxCollapsed);
        }
        _computeViewRecord() {
          let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
          if (!tmpDetail || !tmpDetail.Manifest) {
            return {
              Manifest: {
                Name: '(none)'
              },
              InfoBoxBody: ''
            };
          }
          let tmpManifest = tmpDetail.Manifest;
          let tmpPkg = tmpDetail.Package;
          let tmpGit = tmpDetail.GitStatus;
          let tmpRecord = {
            Manifest: tmpManifest
          };
          tmpRecord.PackageVersionBadge = tmpPkg && tmpPkg.Version ? '<span class="module-version">v' + this._escape(tmpPkg.Version) + '</span>' : '';
          tmpRecord.GitBranchBadge = tmpGit && tmpGit.Branch ? '<span class="module-branch">' + this._escape(tmpGit.Branch) + '</span>' : '';
          tmpRecord.GitHubLink = tmpManifest.GitHub ? '<a href="' + this._escape(tmpManifest.GitHub) + '" target="_blank">GitHub</a>' : '';
          tmpRecord.NpmLink = tmpPkg && tmpPkg.Name ? '<a href="https://www.npmjs.com/package/' + encodeURIComponent(tmpPkg.Name) + '" target="_blank">npm</a>' : '';
          tmpRecord.DocsLink = tmpManifest.Documentation ? '<a href="' + this._escape(tmpManifest.Documentation) + '" target="_blank">Docs</a>' : '';
          tmpRecord.DescriptionBlock = tmpManifest.Description ? '<p style="color:var(--color-muted);margin-top:0">' + this._escape(tmpManifest.Description) + '</p>' : '';

          // Floating info-box body (Package + Git status summary).
          tmpRecord.InfoBoxBody = this._renderInfoBoxBody(tmpManifest, tmpPkg, tmpGit);
          // Inline changed-files block (lives above the deps section).
          tmpRecord.GitFilesSection = this._renderInlineFilesSection(tmpGit);

          // Dependency tables (server already split retold vs external)
          let tmpCat = tmpDetail.CategorizedDeps || {};
          tmpRecord.RetoldDepsSection = this._renderDepSection('Retold dependencies', tmpCat.RetoldDeps || [], true);
          tmpRecord.ExternalDepsSection = this._renderDepSection('External dependencies', tmpCat.ExternalDeps || [], false);
          tmpRecord.RetoldDevDepsSection = this._renderDepSection('Retold dev dependencies', tmpCat.RetoldDevDeps || [], true);
          tmpRecord.ExternalDevDepsSection = this._renderDepSection('External dev dependencies', tmpCat.ExternalDevDeps || [], false);
          return tmpRecord;
        }
        _renderInfoBoxBody(pManifest, pPkg, pGit) {
          let tmpVersion = pPkg && pPkg.Version ? 'v' + pPkg.Version : '';
          let tmpBranch = pGit && pGit.Branch ? pGit.Branch : '';
          let tmpDirty = pGit && pGit.Dirty ? '●' : '';

          // Header is always shown (drives both the collapsed and expanded forms).
          let tmpHtml = '' + '<div class="info-header">' + '<span class="ib-name">' + this._escape(pManifest.Name) + '</span>' + (tmpVersion ? '<span class="ib-version">' + this._escape(tmpVersion) + '</span>' : '') + (tmpBranch ? '<span class="ib-branch">' + this._escape(tmpBranch) + '</span>' : '') + (tmpDirty ? '<span class="ib-dirty" title="Uncommitted changes">' + tmpDirty + '</span>' : '') + '<span class="ib-toggle"></span>' + '</div>';

          // Expanded body — package and git details.
          tmpHtml += '<div class="info-body" onclick="event.stopPropagation()">';
          tmpHtml += '<div class="ib-section"><h4>Package</h4><dl class="kv">';
          tmpHtml += '<dt>name</dt><dd>' + this._escape(pPkg && pPkg.Name || '—') + '</dd>';
          tmpHtml += '<dt>version</dt><dd>' + this._escape(pPkg && pPkg.Version || '—') + '</dd>';
          tmpHtml += '<dt>dependencies</dt><dd>' + (pPkg && pPkg.Dependencies ? Object.keys(pPkg.Dependencies).length : 0) + '</dd>';
          tmpHtml += '<dt>devDependencies</dt><dd>' + (pPkg && pPkg.DevDependencies ? Object.keys(pPkg.DevDependencies).length : 0) + '</dd>';
          tmpHtml += '</dl></div>';
          tmpHtml += '<div class="ib-section"><h4>Git status</h4><dl class="kv">';
          tmpHtml += '<dt>branch</dt><dd>' + this._escape(pGit && pGit.Branch || '—') + '</dd>';
          tmpHtml += '<dt>ahead / behind</dt><dd>' + (pGit && pGit.Ahead || 0) + ' / ' + (pGit && pGit.Behind || 0) + '</dd>';
          tmpHtml += '<dt>dirty</dt><dd>' + (pGit && pGit.Dirty ? 'yes' : 'no') + '</dd>';
          tmpHtml += '</dl>';
          tmpHtml += '</div>';
          tmpHtml += '</div>';
          return tmpHtml;
        }

        // Inline list of changed files (above the deps tables). Renders nothing
        // when the working tree is clean.
        _renderInlineFilesSection(pGit) {
          let tmpFiles = pGit && pGit.Files || [];
          if (!tmpFiles.length) {
            return '';
          }
          let tmpHtml = '<div class="workspace-section"><h3>Changed files (' + tmpFiles.length + ')</h3>';
          for (let i = 0; i < tmpFiles.length; i++) {
            let tmpFile = tmpFiles[i];
            let tmpIsUntracked = tmpFile.Status === '??';
            tmpHtml += '<div class="git-file">' + '<span class="st">' + this._escape(tmpFile.Status.trim() || '··') + '</span>' + this._escape(tmpFile.Path);
            if (tmpIsUntracked) {
              tmpHtml += ' <button class="git-add-file" data-op="git-add-one" data-path="' + this._escape(tmpFile.Path) + '">+ add</button>';
            }
            tmpHtml += '</div>';
          }
          tmpHtml += '</div>';
          return tmpHtml;
        }
        _renderDepSection(pLabel, pDeps, pIsRetold) {
          if (!pDeps.length) {
            return '';
          }
          let tmpHtml = '<div class="workspace-section">';
          tmpHtml += '<h3>' + this._escape(pLabel) + ' (' + pDeps.length + ')</h3>';
          tmpHtml += '<table class="dep-table"><tbody>';
          for (let i = 0; i < pDeps.length; i++) {
            let tmpDep = pDeps[i];
            let tmpLinks = '';
            if (pIsRetold) {
              if (tmpDep.GitHub) {
                tmpLinks += '<a href="' + this._escape(tmpDep.GitHub) + '" target="_blank" title="GitHub">gh</a>';
              }
              if (tmpDep.Documentation) {
                tmpLinks += '<a href="' + this._escape(tmpDep.Documentation) + '" target="_blank" title="Docs">docs</a>';
              }
            } else if (tmpDep.Repository) {
              // External deps: surface the repo URL that was harvested from
              // node_modules/<pkg>/package.json on the server.
              tmpLinks += '<a href="' + this._escape(tmpDep.Repository) + '" target="_blank" title="Repository">repo</a>';
            }
            if (tmpDep.Npm) {
              tmpLinks += '<a href="' + this._escape(tmpDep.Npm) + '" target="_blank" title="npm">npm</a>';
            }
            let tmpNameCls = pIsRetold ? 'dep-name retold' : 'dep-name';
            let tmpNameCell;
            if (pIsRetold) {
              // Click-through to the dep's workspace.
              tmpNameCell = '<a class="dep-name-link" href="#/Module/' + encodeURIComponent(tmpDep.Name) + '" title="Open ' + this._escape(tmpDep.Name) + '">' + this._escape(tmpDep.Name) + '</a>';
            } else {
              tmpNameCell = this._escape(tmpDep.Name);
            }
            tmpHtml += '<tr>';
            tmpHtml += '<td class="' + tmpNameCls + '">' + tmpNameCell + '</td>';
            tmpHtml += '<td class="dep-range">' + this._escape(tmpDep.Range) + '</td>';
            tmpHtml += '<td class="dep-links">' + tmpLinks + '</td>';
            tmpHtml += '</tr>';
          }
          tmpHtml += '</tbody></table>';
          tmpHtml += '</div>';
          return tmpHtml;
        }

        // Note: onBeforeRender is NOT the place to populate the record address —
        // pict-view reads from that address before onBeforeRender fires. See
        // loadModule() and runAction() for where ViewRecord.ModuleWorkspace gets
        // refreshed ahead of render().

        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          // Wire action-bar buttons. Buttons without data-op are ignored.
          let tmpWorkspace = document.getElementById('RM-Workspace');
          if (tmpWorkspace) {
            let tmpButtons = tmpWorkspace.querySelectorAll('.action-groups button[data-op]');
            for (let i = 0; i < tmpButtons.length; i++) {
              tmpButtons[i].addEventListener('click', pEvent => {
                let tmpOp = pEvent.currentTarget.getAttribute('data-op');
                this.runAction(tmpOp, null);
              });
            }
          }
          this._wireFileButtons();

          // Re-render the output panel into the freshly created anchor so any
          // in-flight operation lines stay visible after a refresh.
          if (this.pict.views['Manager-OutputPanel']) {
            this.pict.views['Manager-OutputPanel'].render();
          }
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }

        // Wire up the per-file "+ add" buttons in the inline changed-files block.
        _wireFileButtons() {
          let tmpFiles = document.getElementById('RM-Mod-FilesArea');
          if (!tmpFiles) {
            return;
          }
          let tmpButtons = tmpFiles.querySelectorAll('button[data-op="git-add-one"]');
          for (let i = 0; i < tmpButtons.length; i++) {
            tmpButtons[i].addEventListener('click', pEvent => {
              let tmpPath = pEvent.currentTarget.getAttribute('data-path');
              this.runAction('git-add-one', tmpPath);
            });
          }
        }

        // ─────────────────────────────────────────────
        //  Action dispatch
        // ─────────────────────────────────────────────

        runAction(pOp, pPath) {
          let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
          if (!tmpDetail || !tmpDetail.Manifest) {
            return;
          }
          let tmpName = tmpDetail.Manifest.Name;
          let tmpApi = this.pict.providers.ManagerAPI;

          // Stamp the active operation so the WS layer can route its frames to
          // the inline output panel (vs. the cross-module modal).
          let tmpStartScopedOp = pLabel => {
            this.pict.AppData.Manager.ActiveOperation = {
              OperationId: null,
              CommandTag: null,
              Lines: [],
              HeaderState: 'running',
              HeaderText: pLabel,
              Scope: 'module',
              ModuleName: tmpName
            };
            if (this.pict.views['Manager-OutputPanel']) {
              this.pict.views['Manager-OutputPanel'].render();
            }
          };
          switch (pOp) {
            case 'install':
              tmpStartScopedOp('npm install');
              return tmpApi.runModuleOperation(tmpName, 'npm', ['install'], 'npm install');
            case 'test':
              tmpStartScopedOp('npm test');
              return tmpApi.runModuleOperation(tmpName, 'npm', ['test'], 'npm test');
            case 'types':
              tmpStartScopedOp('npm run types');
              return tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'types'], 'npm run types');
            case 'build':
              tmpStartScopedOp('npm run build');
              return tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'build'], 'npm run build');
            case 'diff':
              return this.pict.views['Manager-Modal-Diff'].open(tmpName);
            case 'git-add':
              tmpStartScopedOp('git add -A');
              return tmpApi.gitAddAll(tmpName);
            case 'git-add-one':
              tmpStartScopedOp('git add ' + (pPath || ''));
              return pPath ? tmpApi.gitAddPaths(tmpName, [pPath]) : null;
            case 'pull':
              tmpStartScopedOp('git pull');
              return tmpApi.runModuleOperation(tmpName, 'git', ['pull'], 'git pull');
            case 'push':
              tmpStartScopedOp('git push');
              return tmpApi.runModuleOperation(tmpName, 'git', ['push'], 'git push');
            case 'bump-patch':
              return this._bumpWithGuard('patch');
            case 'bump-minor':
              return this._bumpWithGuard('minor');
            case 'bump-major':
              return this._bumpWithGuard('major');
            case 'commit':
              return this.pict.views['Manager-Modal-Commit'].open(tmpName);
            case 'ncu':
              return this.pict.views['Manager-Modal-Ncu'].open(tmpName);
            case 'publish':
              return this.pict.views['Manager-Modal-Publish'].open(tmpName);
            case 'ripple':
              return this.pict.views['Manager-Modal-RipplePlan'].open(tmpName);
            default:
              this.pict.PictApplication.setStatus('Action not yet wired: ' + pOp);
          }
        }

        // ─────────────────────────────────────────────
        //  Bump guard — prevent accidentally skipping a version
        // ─────────────────────────────────────────────

        _bumpWithGuard(pKind) {
          let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
          if (!tmpDetail || !tmpDetail.Package) {
            return;
          }
          let tmpPkg = tmpDetail.Package;
          let tmpName = tmpDetail.Manifest.Name;
          let tmpLocal = this._parseSemver(tmpPkg.Version);
          let tmpPub = this._parseSemver(tmpPkg.PublishedVersion);
          let tmpProceed = () => {
            // Optimistically advance local Version so a rapid second click is
            // computed against the projected post-bump state, not stale data.
            if (tmpLocal) {
              let tmpNext = this._projectBump(tmpLocal, pKind);
              tmpPkg.Version = tmpNext.Major + '.' + tmpNext.Minor + '.' + tmpNext.Patch;
            }
            // Stamp the operation for inline output + post-completion refresh.
            this.pict.AppData.Manager.ActiveOperation = {
              OperationId: null,
              CommandTag: null,
              Lines: [],
              HeaderState: 'running',
              HeaderText: 'npm version ' + pKind,
              Scope: 'module',
              ModuleName: tmpName
            };
            if (this.pict.views['Manager-OutputPanel']) {
              this.pict.views['Manager-OutputPanel'].render();
            }
            return this.pict.providers.ManagerAPI.bumpVersion(tmpName, pKind);
          };

          // No guard possible without a parseable local version, or with
          // prerelease tags on either side — defer to the human.
          if (!tmpLocal || tmpLocal.Prerelease || tmpPub && tmpPub.Prerelease) {
            return tmpProceed();
          }

          // If nothing is published yet, any bump is fine.
          if (!tmpPub) {
            return tmpProceed();
          }
          let tmpProjected = this._projectBump(tmpLocal, pKind); // where local lands after the click
          let tmpExpectedFromPub = this._projectBump(tmpPub, pKind); // where a fresh bump from npm would land

          // Sequential from the *published* baseline → safe, no prompt.
          if (this._eqSemver(tmpProjected, tmpExpectedFromPub)) {
            return tmpProceed();
          }

          // Not sequential from npm → we're about to create a gap. Name the
          // skipped version explicitly in the prompt.
          let tmpProjectedStr = tmpProjected.Major + '.' + tmpProjected.Minor + '.' + tmpProjected.Patch;
          let tmpExpectedStr = tmpExpectedFromPub.Major + '.' + tmpExpectedFromPub.Minor + '.' + tmpExpectedFromPub.Patch;
          let tmpMessage = 'npm has v' + tmpPkg.PublishedVersion + '; local is v' + tmpPkg.Version + '.' + '\n\nClicking "' + pKind + '" would set local to v' + tmpProjectedStr + ',' + ' but a ' + pKind + ' bump from npm would land on v' + tmpExpectedStr + '.' + '\n\nYou are about to skip v' + tmpExpectedStr + ' (which is not published).' + '\n\nContinue with ' + pKind + ' bump?';
          if (!window.confirm(tmpMessage)) {
            return;
          }
          return tmpProceed();
        }
        _parseSemver(pVersion) {
          if (typeof pVersion !== 'string') {
            return null;
          }
          let tmpMatch = pVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
          if (!tmpMatch) {
            return null;
          }
          return {
            Major: parseInt(tmpMatch[1], 10),
            Minor: parseInt(tmpMatch[2], 10),
            Patch: parseInt(tmpMatch[3], 10),
            Prerelease: tmpMatch[4] || null
          };
        }
        _projectBump(pBase, pKind) {
          if (pKind === 'major') {
            return {
              Major: pBase.Major + 1,
              Minor: 0,
              Patch: 0
            };
          }
          if (pKind === 'minor') {
            return {
              Major: pBase.Major,
              Minor: pBase.Minor + 1,
              Patch: 0
            };
          }
          return {
            Major: pBase.Major,
            Minor: pBase.Minor,
            Patch: pBase.Patch + 1
          };
        }
        _eqSemver(pA, pB) {
          return pA.Major === pB.Major && pA.Minor === pB.Minor && pA.Patch === pB.Patch;
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerModuleWorkspaceView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    31: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const SCRIPT_LABELS = {
        status: 'Status.sh',
        update: 'Update.sh',
        checkout: 'Checkout.sh'
      };

      /**
       * Manager-OpsRunner
       *
       * Cross-module ops (Status / Update / Checkout) used to swap the workspace
       * content area to a placeholder while output streamed into the bottom panel.
       * Now we keep the user where they were and surface the output through the
       * pict-section-modal-backed log viewer (Manager-LogModal). The route still
       * exists so deep links work.
       */
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-OpsRunner',
        AutoRender: false
      };
      class ManagerOpsRunnerView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        runScript(pScript) {
          let tmpLabel = SCRIPT_LABELS[pScript];
          if (!tmpLabel) {
            this.pict.PictApplication.setStatus('Unknown ops script: ' + pScript);
            return;
          }

          // Mark the operation scope so OperationsWS can route frames correctly.
          this.pict.AppData.Manager.ActiveOperation = {
            OperationId: null,
            CommandTag: null,
            Lines: [],
            HeaderState: 'running',
            HeaderText: 'Starting ' + tmpLabel + '...',
            Scope: 'all'
          };

          // Open the log modal so the user can watch the stream.
          let tmpLogModal = this.pict.views['Manager-LogModal'];
          if (tmpLogModal) {
            tmpLogModal.openForOperation('All modules — ' + tmpLabel);
          }
          this.pict.PictApplication.setStatus('Running ' + tmpLabel + '...');
          this.pict.providers.ManagerAPI.runAllModulesScript(pScript).then(pResp => {
            this.pict.PictApplication.setStatus('Started ' + tmpLabel + ' (' + pResp.OperationId + ')');
          }, pError => {
            this.pict.PictApplication.setStatus(tmpLabel + ' failed to start: ' + pError.message);
          });
        }
      }
      module.exports = ManagerOpsRunnerView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    32: [function (require, module, exports) {
      const libPictView = require('pict-view');

      /**
       * Manager-OutputPanel
       *
       * Renders the active module-scoped operation log as an inline panel inside
       * the module workspace template (anchor: #RM-OutputPanelContainer). Hidden
       * if there's no operation to show. Cross-module ops surface in the
       * pict-section-modal log viewer instead, but we still mirror them here when
       * a module workspace is open so the user has a record either way.
       */
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-OutputPanel',
        DefaultRenderable: 'Manager-OutputPanel-Shell',
        DefaultDestinationAddress: '#RM-OutputPanelContainer',
        DefaultTemplateRecordAddress: 'AppData.Manager',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-OutputPanel-Shell-Template',
          Template: /*html*/`
<div id="RM-OutputPanel">
	<div id="RM-OutputHeader">
		<span>
			<span class="live-dot"></span>
			<span id="RM-OutputHeaderText">{~D:Record.ActiveOperation.HeaderText~}</span>
		</span>
		<span>
			<button class="action" id="RM-PopOutButton"
				title="Open this log in a fullscreen modal"
				onclick="{~P~}.views['Manager-LogModal'].openForOperation('Operation log')">pop out</button>
			<button class="action danger" id="RM-CancelButton"
				onclick="{~P~}.views['Manager-OutputPanel'].cancel()">Cancel</button>
		</span>
	</div>
	<div id="RM-Output"></div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-OutputPanel-Shell',
          TemplateHash: 'Manager-OutputPanel-Shell-Template',
          DestinationAddress: '#RM-OutputPanelContainer',
          RenderMethod: 'replace'
        }]
      };
      class ManagerOutputPanelView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._renderedUpTo = 0; // index of next un-rendered line in tmpOp.Lines
          this._lastBodyEl = null; // the #RM-Output element we appended into
          this._rafPending = false; // coalesce multiple frame events into one paint
          this._lastOpId = null; // detect operation switches (reset cursor)
        }
        onBeforeRender() {
          return this.pict.AppData.Manager;
        }

        // External callers (OperationsWS, ModuleWorkspace) call render() — that
        // triggers the shell template, then onAfterRender wires up the DOM. For
        // per-frame stdout updates we instead use scheduleAppend(), which
        // performs an append-only DOM mutation on the next animation frame.
        scheduleAppend() {
          if (this._rafPending) {
            return;
          }
          this._rafPending = true;
          let tmpSelf = this;
          let tmpRaf = typeof window !== 'undefined' && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (pCb) {
            return setTimeout(pCb, 16);
          };
          tmpRaf(function () {
            tmpSelf._rafPending = false;
            tmpSelf._appendNewLines();
          });
        }
        _appendNewLines() {
          let tmpAnchor = document.getElementById('RM-OutputPanelContainer');
          if (!tmpAnchor) {
            return;
          }
          let tmpOp = this.pict.AppData.Manager.ActiveOperation || {};
          let tmpSelected = this.pict.AppData.Manager.SelectedModule;
          let tmpInScope = tmpOp.Scope === 'module' && tmpOp.ModuleName && tmpOp.ModuleName === tmpSelected;
          if (!tmpInScope) {
            return;
          }

          // New operation? Force a full reset/render via the shell template.
          if (tmpOp.OperationId !== this._lastOpId) {
            this._renderedUpTo = 0;
            this._lastOpId = tmpOp.OperationId;
            this._lastBodyEl = null;
            this.render();
            return;
          }
          let tmpBody = this._lastBodyEl || document.getElementById('RM-Output');
          if (!tmpBody) {
            this.render();
            return;
          }
          this._lastBodyEl = tmpBody;

          // Update header (cheap).
          let tmpHeader = document.getElementById('RM-OutputHeader');
          if (tmpHeader) {
            tmpHeader.className = '';
            if (tmpOp.HeaderState) {
              tmpHeader.classList.add(tmpOp.HeaderState);
            }
          }
          let tmpHeaderText = document.getElementById('RM-OutputHeaderText');
          if (tmpHeaderText && tmpOp.HeaderText) {
            tmpHeaderText.textContent = tmpOp.HeaderText;
          }
          let tmpCancel = document.getElementById('RM-CancelButton');
          if (tmpCancel) {
            tmpCancel.disabled = tmpOp.HeaderState !== 'running';
          }
          let tmpLines = tmpOp.Lines || [];
          let tmpStart = this._renderedUpTo;
          if (tmpStart >= tmpLines.length) {
            return;
          }

          // Build the new lines as a DocumentFragment so the browser does one
          // reflow regardless of how many lines we just received.
          let tmpFrag = document.createDocumentFragment();
          for (let i = tmpStart; i < tmpLines.length; i++) {
            let tmpLine = tmpLines[i];
            let tmpDiv = document.createElement('div');
            tmpDiv.className = tmpLine.Class ? 'line ' + tmpLine.Class : 'line';
            tmpDiv.textContent = tmpLine.Text;
            tmpFrag.appendChild(tmpDiv);
          }
          tmpBody.appendChild(tmpFrag);
          this._renderedUpTo = tmpLines.length;

          // Auto-scroll only if the user is already pinned to the bottom (within
          // 60px), so they can scroll back to read history without being yanked
          // down on every new line.
          let tmpAtBottom = tmpBody.scrollHeight - tmpBody.scrollTop - tmpBody.clientHeight < 60;
          if (tmpAtBottom) {
            tmpBody.scrollTop = tmpBody.scrollHeight;
          }
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          // Reset the append cursor — we're about to repaint the shell from
          // scratch, so subsequent appends should resume from line 0.
          this._renderedUpTo = 0;
          this._lastBodyEl = null;
          let tmpAnchor = document.getElementById('RM-OutputPanelContainer');
          if (!tmpAnchor) {
            return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
          }
          let tmpOp = this.pict.AppData.Manager.ActiveOperation || {};
          let tmpSelected = this.pict.AppData.Manager.SelectedModule;
          let tmpInScope = tmpOp.Scope === 'module' && tmpOp.ModuleName && tmpOp.ModuleName === tmpSelected;
          let tmpHasContent = tmpInScope && (tmpOp.Lines && tmpOp.Lines.length > 0 || tmpOp.HeaderState && tmpOp.HeaderState !== 'idle');
          tmpAnchor.style.display = tmpHasContent ? '' : 'none';
          if (!tmpHasContent) {
            return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
          }
          this._lastOpId = tmpOp.OperationId;
          let tmpHeader = document.getElementById('RM-OutputHeader');
          if (tmpHeader) {
            tmpHeader.className = '';
            if (tmpOp.HeaderState) {
              tmpHeader.classList.add(tmpOp.HeaderState);
            }
          }
          let tmpCancel = document.getElementById('RM-CancelButton');
          if (tmpCancel) {
            tmpCancel.disabled = tmpOp.HeaderState !== 'running';
          }
          let tmpBody = document.getElementById('RM-Output');
          if (tmpBody) {
            let tmpFrag = document.createDocumentFragment();
            let tmpLines = tmpOp.Lines || [];
            for (let i = 0; i < tmpLines.length; i++) {
              let tmpLine = tmpLines[i];
              let tmpDiv = document.createElement('div');
              tmpDiv.className = tmpLine.Class ? 'line ' + tmpLine.Class : 'line';
              tmpDiv.textContent = tmpLine.Text;
              tmpFrag.appendChild(tmpDiv);
            }
            tmpBody.innerHTML = '';
            tmpBody.appendChild(tmpFrag);
            tmpBody.scrollTop = tmpBody.scrollHeight;
            this._lastBodyEl = tmpBody;
            this._renderedUpTo = tmpLines.length;
          }
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
        cancel() {
          let tmpOp = this.pict.AppData.Manager.ActiveOperation;
          if (!tmpOp.OperationId || tmpOp.HeaderState !== 'running') {
            return;
          }
          this.pict.providers.ManagerAPI.cancelOperation(tmpOp.OperationId).then(() => {
            this.pict.PictApplication.setStatus('Cancel requested.');
          }, pError => {
            this.pict.PictApplication.setStatus('Cancel failed: ' + pError.message);
          });
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerOutputPanelView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    33: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Ripple',
        DefaultRenderable: 'Manager-Ripple-Content',
        DefaultDestinationAddress: '#RM-Workspace-Content',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.Ripple',
        AutoRender: false,
        CSS: /*css*/`
		.ripple-plan { padding: 4px 0; }
		.ripple-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
		.ripple-header .title { font-weight: 600; font-size: 15px; }
		.ripple-header .target { color: var(--color-accent); }
		.ripple-header .meta   { color: var(--color-muted); font-size: 12px; }
		.ripple-timeline { display: flex; flex-direction: column; gap: 8px; }
		.ripple-step { border: 1px solid var(--color-border); border-left: 3px solid var(--color-border);
			border-radius: 6px; padding: 8px 12px; background: var(--color-panel); }
		.ripple-step.running   { border-left-color: var(--color-accent); }
		.ripple-step.paused    { border-left-color: var(--color-warning); }
		.ripple-step.complete  { border-left-color: var(--color-success); }
		.ripple-step.failed    { border-left-color: var(--color-danger); }
		.ripple-step.cancelled { border-left-color: var(--color-muted); opacity: 0.7; }
		.step-row { display: flex; align-items: baseline; gap: 10px; font-family: var(--font-mono); font-size: 13px; }
		.step-order    { color: var(--color-muted); min-width: 28px; }
		.step-module   { font-weight: 600; }
		.step-kind     { color: var(--color-muted); font-size: 11px; }
		.step-status   { margin-left: auto; color: var(--color-muted); font-size: 11px; }
		.step-actions  { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; font-size: 11px; }
		.step-action   { padding: 2px 6px; border-radius: 3px; background: var(--color-panel-alt); color: var(--color-muted); }
		.step-action.current { background: rgba(47,129,247,0.18); color: var(--color-accent); }
		.step-action.done    { background: rgba(63,185,80,0.18);  color: var(--color-success); }
		.step-action.failed  { background: rgba(248,81,73,0.18);  color: var(--color-danger); }
		.step-approve { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
		.step-approve .hint { color: var(--color-muted); font-size: 11px; }
		.step-output  { margin-top: 8px; border-top: 1px dashed var(--color-border); padding-top: 6px; }
		.step-output-toggle { background: none; border: none; color: var(--color-muted);
			font-family: var(--font-mono); font-size: 11px; cursor: pointer; }
		.step-output-body { max-height: 240px; overflow: auto; padding: 6px 8px;
			background: var(--color-panel-alt); border-radius: 4px; font-family: var(--font-mono);
			font-size: 11px; white-space: pre-wrap; word-break: break-word; }
		.step-output:not(.open) .step-output-body { display: none; }
		.step-output .line.stderr  { color: var(--color-danger); }
		.step-output .line.meta    { color: var(--color-muted); }
		.step-output .line.success { color: var(--color-success); }
		.step-output .line.error   { color: var(--color-danger); }
	`,
        Templates: [{
          Hash: 'Manager-Ripple-Empty-Template',
          Template: /*html*/`
<div class="placeholder">
	<h2>Ripple planner</h2>
	<p>No active plan. Open a module and click <strong>Ripple</strong> to plan a cascade.</p>
</div>
`
        }, {
          Hash: 'Manager-Ripple-Content-Template',
          Template: /*html*/`{~D:Record.Html~}`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Ripple-Content',
          TemplateHash: 'Manager-Ripple-Content-Template',
          DestinationAddress: '#RM-Workspace-Content',
          RenderMethod: 'replace'
        }]
      };
      const STATUS_LABEL = {
        pending: 'pending',
        running: 'running',
        paused: 'paused, awaiting confirm',
        complete: 'done',
        failed: 'failed',
        cancelled: 'cancelled'
      };
      class ManagerRippleView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }

        // Called by the router when /Ripple resolves.
        showFromRoute() {
          let tmpPlan = this.pict.AppData.Manager.RipplePlan;
          if (!tmpPlan) {
            // No plan pending — show the empty state.
            this._writeRecord({
              Html: this.pict.parseTemplateByHash('Manager-Ripple-Empty-Template', {})
            });
            this.render();
            return;
          }
          // If we don't yet have an active ripple state, create one from the plan.
          if (!this.pict.AppData.Manager.ActiveRipple || this.pict.AppData.Manager.ActiveRipple.Plan !== tmpPlan) {
            this._enterFromPlan(tmpPlan);
          }
          this._refresh();
        }
        _enterFromPlan(pPlan) {
          this.pict.AppData.Manager.ActiveRipple = {
            RippleId: null,
            Plan: pPlan,
            Steps: pPlan.Steps.map(pS => ({
              Order: pS.Order,
              Module: pS.Module,
              Status: 'pending',
              CurrentAction: -1,
              ActionStates: pS.Actions.map(() => 'pending'),
              ActionResults: [],
              PauseReport: null,
              Output: [],
              ShowOutput: false
            })),
            Status: 'draft'
          };
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this._wireButtons();
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }

        // ─────────────────────────────────────────────
        //  WebSocket frame dispatch (called from OperationsWS provider)
        // ─────────────────────────────────────────────

        handleFrame(pFrame) {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple) {
            return;
          }
          if (pFrame.RippleId && tmpRipple.RippleId && pFrame.RippleId !== tmpRipple.RippleId) {
            return;
          }

          // Op-scoped frames (non-ripple-prefixed): mirror into the current running step's output
          if (pFrame.Type && pFrame.Type.indexOf('ripple-') !== 0) {
            if (tmpRipple.Status !== 'running') {
              return;
            }
            let tmpIdx = tmpRipple.Steps.findIndex(pS => pS.Status === 'running');
            if (tmpIdx < 0) {
              return;
            }
            switch (pFrame.Type) {
              case 'stdout':
                this._appendStepOutput(tmpIdx, pFrame.Channel === 'stderr' ? 'stderr' : '', pFrame.Text);
                this._renderStepOutput(tmpIdx);
                return;
              case 'progress':
                if (pFrame.Message) {
                  this._appendStepOutput(tmpIdx, 'meta', '... ' + pFrame.Message);
                  this._renderStepOutput(tmpIdx);
                }
                return;
              case 'complete':
                this._appendStepOutput(tmpIdx, pFrame.ExitCode === 0 ? 'success' : 'error', pFrame.ExitCode === 0 ? 'done' + (pFrame.Duration ? ' ' + pFrame.Duration : '') : 'exit ' + pFrame.ExitCode + (pFrame.Duration ? ' (' + pFrame.Duration + ')' : ''));
                this._renderStepOutput(tmpIdx);
                return;
              case 'error':
                this._appendStepOutput(tmpIdx, 'error', 'error: ' + (pFrame.Error || 'unknown'));
                this._renderStepOutput(tmpIdx);
                return;
            }
            return;
          }
          switch (pFrame.Type) {
            case 'ripple-start':
              tmpRipple.Status = 'running';
              this._refresh();
              break;
            case 'ripple-step-start':
              tmpRipple.Steps[pFrame.StepOrder].Status = 'running';
              this._refresh();
              break;
            case 'ripple-action-start':
              tmpRipple.Steps[pFrame.StepOrder].CurrentAction = pFrame.ActionIndex;
              tmpRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'current';
              this._appendStepOutput(pFrame.StepOrder, 'action', '── ' + this._formatActionLabel(pFrame.Action) + ' ──');
              this._refresh();
              break;
            case 'ripple-action-end':
              tmpRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'done';
              tmpRipple.Steps[pFrame.StepOrder].ActionResults[pFrame.ActionIndex] = pFrame.Result;
              this._refresh();
              break;
            case 'ripple-paused':
              tmpRipple.Status = 'paused';
              tmpRipple.Steps[pFrame.StepOrder].Status = 'paused';
              tmpRipple.Steps[pFrame.StepOrder].PauseReport = pFrame.PreviewReport;
              this._refresh();
              break;
            case 'ripple-step-complete':
              tmpRipple.Steps[pFrame.StepOrder].Status = 'complete';
              this._refresh();
              break;
            case 'ripple-complete':
              tmpRipple.Status = 'complete';
              this._refresh();
              this.pict.PictApplication.setStatus('Ripple complete.');
              break;
            case 'ripple-failed':
              tmpRipple.Status = 'failed';
              if (typeof pFrame.StepOrder === 'number' && tmpRipple.Steps[pFrame.StepOrder]) {
                tmpRipple.Steps[pFrame.StepOrder].Status = 'failed';
                if (typeof pFrame.ActionIndex === 'number' && pFrame.ActionIndex >= 0) {
                  tmpRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'failed';
                }
              }
              this._refresh();
              this.pict.PictApplication.setStatus('Ripple failed: ' + pFrame.Error);
              break;
            case 'ripple-cancelled':
              tmpRipple.Status = 'cancelled';
              for (let i = 0; i < tmpRipple.Steps.length; i++) {
                let tmpS = tmpRipple.Steps[i];
                if (tmpS.Status === 'pending' || tmpS.Status === 'running' || tmpS.Status === 'paused') {
                  tmpS.Status = 'cancelled';
                }
              }
              this._refresh();
              this.pict.PictApplication.setStatus('Ripple cancelled.');
              break;
          }
        }

        // ─────────────────────────────────────────────
        //  Action handlers invoked from inline handlers
        // ─────────────────────────────────────────────

        startRipple() {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple || tmpRipple.Status !== 'draft') {
            return;
          }
          tmpRipple.Status = 'starting';
          this._refresh();
          this.pict.providers.ManagerAPI.runRipple(tmpRipple.Plan).then(pBody => {
            tmpRipple.RippleId = pBody.RippleId;
            tmpRipple.Status = 'running';
            this._refresh();
          }, pError => {
            tmpRipple.Status = 'failed';
            tmpRipple.Error = pError.message;
            this._refresh();
            this.pict.PictApplication.setStatus('Ripple start failed: ' + pError.message);
          });
        }
        cancelRipple() {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple || !tmpRipple.RippleId) {
            return;
          }
          this.pict.providers.ManagerAPI.cancelRipple(tmpRipple.RippleId).catch(() => {});
        }
        exitRipple() {
          this.pict.AppData.Manager.ActiveRipple = null;
          this.pict.AppData.Manager.RipplePlan = null;
          this.pict.PictApplication.navigateTo('/Home');
        }
        approveStep(pOrder) {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple || !tmpRipple.RippleId) {
            return;
          }
          let tmpState = tmpRipple.Steps[pOrder];
          if (!tmpState || !tmpState.PauseReport) {
            return;
          }
          let tmpHash = tmpState.PauseReport.PreviewHash;
          tmpState.PauseReport = null;
          tmpState.Status = 'running';
          tmpRipple.Status = 'running';
          this._refresh();
          this.pict.providers.ManagerAPI.confirmRippleStep(tmpRipple.RippleId, pOrder, tmpHash).catch(pError => {
            this.pict.PictApplication.setStatus('Approve failed: ' + pError.message);
          });
        }
        toggleOutput(pOrder) {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple) {
            return;
          }
          let tmpStep = tmpRipple.Steps[pOrder];
          if (!tmpStep) {
            return;
          }
          tmpStep.ShowOutput = !tmpStep.ShowOutput;
          this._refresh();
        }

        // ─────────────────────────────────────────────
        //  Rendering internals
        // ─────────────────────────────────────────────

        _refresh() {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple) {
            this._writeRecord({
              Html: this.pict.parseTemplateByHash('Manager-Ripple-Empty-Template', {})
            });
            this.render();
            return;
          }
          this._writeRecord({
            Html: this._buildHtml(tmpRipple)
          });
          this.render();
        }
        _writeRecord(pRecord) {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.Ripple = pRecord;
        }
        _wireButtons() {
          let tmpWs = document.getElementById('RM-Workspace');
          if (!tmpWs) {
            return;
          }
          let tmpButtons = tmpWs.querySelectorAll('button[data-act]');
          for (let i = 0; i < tmpButtons.length; i++) {
            tmpButtons[i].addEventListener('click', pEvent => {
              let tmpAct = pEvent.currentTarget.getAttribute('data-act');
              let tmpOrder = pEvent.currentTarget.getAttribute('data-order');
              switch (tmpAct) {
                case 'ripple-start':
                  return this.startRipple();
                case 'ripple-cancel':
                  return this.cancelRipple();
                case 'ripple-exit':
                  return this.exitRipple();
                case 'ripple-approve':
                  return this.approveStep(parseInt(tmpOrder, 10));
                case 'ripple-toggle-output':
                  return this.toggleOutput(parseInt(tmpOrder, 10));
              }
            });
          }
        }
        _appendStepOutput(pStepOrder, pKind, pText) {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple) {
            return;
          }
          let tmpStep = tmpRipple.Steps[pStepOrder];
          if (!tmpStep) {
            return;
          }
          tmpStep.Output.push({
            Kind: pKind,
            Text: pText
          });
          if (tmpStep.Output.length > 2000) {
            tmpStep.Output.splice(0, tmpStep.Output.length - 2000);
          }
        }
        _renderStepOutput(pStepOrder) {
          let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
          if (!tmpRipple) {
            return;
          }
          let tmpStep = tmpRipple.Steps[pStepOrder];
          if (!tmpStep) {
            return;
          }
          let tmpPanel = document.querySelector('.ripple-step[data-order="' + pStepOrder + '"] .step-output-body');
          if (!tmpPanel) {
            return;
          }
          tmpPanel.innerHTML = this._renderStepOutputLines(tmpStep);
          tmpPanel.scrollTop = tmpPanel.scrollHeight;
        }
        _renderStepOutputLines(pStep) {
          if (!pStep.Output || pStep.Output.length === 0) {
            return '<span class="line meta">(no output yet)</span>';
          }
          let tmpParts = [];
          for (let i = 0; i < pStep.Output.length; i++) {
            let tmpLine = pStep.Output[i];
            let tmpCls = 'line';
            if (tmpLine.Kind === 'stderr') {
              tmpCls += ' stderr';
            } else if (tmpLine.Kind === 'meta' || tmpLine.Kind === 'action') {
              tmpCls += ' meta';
            } else if (tmpLine.Kind === 'success') {
              tmpCls += ' success';
            } else if (tmpLine.Kind === 'error') {
              tmpCls += ' error';
            }
            tmpParts.push('<span class="' + tmpCls + '">' + this._escape(tmpLine.Text) + '</span>');
          }
          return tmpParts.join('\n');
        }
        _buildHtml(pRipple) {
          let tmpPlan = pRipple.Plan;
          let tmpSteps = pRipple.Steps;

          // Multi-root header: list every selected producer (truncate to 3 +
          // overflow count, full list available on hover via title attr).
          let tmpRoots = Array.isArray(tmpPlan.Roots) && tmpPlan.Roots.length > 0 ? tmpPlan.Roots : [tmpPlan.Root];
          let tmpRootsLabel;
          if (tmpRoots.length === 1) {
            tmpRootsLabel = '<span class="target">' + this._escape(tmpRoots[0]) + '</span>';
          } else {
            let tmpShown = tmpRoots.slice(0, 3).map(pR => this._escape(pR)).join(', ');
            let tmpExtra = tmpRoots.length > 3 ? ' +' + (tmpRoots.length - 3) + ' more' : '';
            tmpRootsLabel = '<span class="target" title="' + this._escape(tmpRoots.join(', ')) + '">' + tmpRoots.length + ' producers: ' + tmpShown + tmpExtra + '</span>';
          }
          let tmpHtml = '<div class="ripple-plan">';
          tmpHtml += '<div class="ripple-header">';
          tmpHtml += '  <span class="title">Ripple: ' + tmpRootsLabel + '</span>';
          tmpHtml += '  <span class="meta">' + tmpSteps.length + ' steps · producer ' + this._escape(tmpPlan.Options.ProducerBumpKind || 'patch') + ' / consumer ' + this._escape(tmpPlan.Options.ConsumerBumpKind || 'patch') + ' bump</span>';
          tmpHtml += '</div>';
          tmpHtml += '<div class="action-row" style="margin-bottom:12px">';
          if (pRipple.Status === 'draft') {
            tmpHtml += '<button class="action primary" data-act="ripple-start">Start ripple</button>';
          }
          if (pRipple.Status === 'running' || pRipple.Status === 'paused' || pRipple.Status === 'starting') {
            tmpHtml += '<button class="action danger" data-act="ripple-cancel">Cancel ripple</button>';
          }
          tmpHtml += '<button class="action" data-act="ripple-exit">Back to workspace</button>';
          tmpHtml += '</div>';
          tmpHtml += '<div class="ripple-timeline">';
          for (let i = 0; i < tmpSteps.length; i++) {
            tmpHtml += this._renderStep(tmpSteps[i], tmpPlan.Steps[i]);
          }
          tmpHtml += '</div>';
          tmpHtml += '</div>';
          return tmpHtml;
        }
        _renderStep(pState, pPlanStep) {
          let tmpStatusText = STATUS_LABEL[pState.Status] || pState.Status;
          let tmpHtml = '<div class="ripple-step ' + pState.Status + '" data-order="' + pState.Order + '">';
          tmpHtml += '  <div class="step-row">';
          tmpHtml += '    <span class="step-order">' + (pState.Order + 1) + '.</span>';
          tmpHtml += '    <span class="step-module">' + this._escape(pState.Module) + '</span>';
          tmpHtml += '    <span class="step-kind">' + this._escape(pPlanStep.Kind) + ' · ' + this._escape(pPlanStep.Group) + '</span>';
          tmpHtml += '    <span class="step-status">' + this._escape(tmpStatusText) + '</span>';
          tmpHtml += '  </div>';
          tmpHtml += '  <div class="step-actions">';
          for (let i = 0; i < pPlanStep.Actions.length; i++) {
            let tmpAction = pPlanStep.Actions[i];
            let tmpState = pState.ActionStates[i] || 'pending';
            tmpHtml += '<span class="step-action ' + tmpState + '">' + this._escape(this._formatActionLabel(tmpAction)) + '</span>';
          }
          tmpHtml += '  </div>';
          if (pState.Status === 'paused' && pState.PauseReport) {
            let tmpReport = pState.PauseReport;
            tmpHtml += '  <div class="step-approve">';
            tmpHtml += '    <span class="hint">Publish confirmation required — ' + this._escape(tmpReport.Package) + ' v' + this._escape(tmpReport.LocalVersion) + '</span>';
            if (tmpReport.OkToPublish) {
              tmpHtml += '    <button class="action success" data-act="ripple-approve" data-order="' + pState.Order + '">Approve & publish</button>';
            } else {
              tmpHtml += '    <span style="color:var(--color-danger)">Pre-publish validation failed; ripple will halt.</span>';
            }
            tmpHtml += '  </div>';
          }
          let tmpAutoExpand = pState.Status === 'running' || pState.Status === 'failed' || pState.ShowOutput;
          if (pState.Output && pState.Output.length > 0 || pState.Status === 'running') {
            tmpHtml += '  <div class="step-output' + (tmpAutoExpand ? ' open' : '') + '">';
            tmpHtml += '    <button class="step-output-toggle" data-act="ripple-toggle-output" data-order="' + pState.Order + '">' + (tmpAutoExpand ? '[hide]' : '[show]') + ' output (' + (pState.Output ? pState.Output.length : 0) + ' lines)' + '</button>';
            tmpHtml += '    <pre class="step-output-body">' + this._renderStepOutputLines(pState) + '</pre>';
            tmpHtml += '  </div>';
          }
          tmpHtml += '</div>';
          return tmpHtml;
        }
        _formatActionLabel(pAction) {
          switch (pAction.Op) {
            case 'update-dep':
              {
                let tmpTarget = pAction.Range ? pAction.Range : (pAction.RangePrefix || '^') + 'latest';
                return 'update ' + pAction.Dep + ' (' + (pAction.OldRange || '?') + ' to ' + tmpTarget + ')';
              }
            case 'preflight-clean-tree':
              return 'preflight (clean tree)';
            case 'ncu-retold':
              return 'ncu -u (retold)';
            case 'install':
              return 'npm install';
            case 'test':
              return 'npm test';
            case 'commit':
              return 'git commit (deps)';
            case 'bump':
              return 'bump ' + (pAction.Kind || 'patch');
            case 'bump-if-needed':
              return 'bump if needed (' + (pAction.Kind || 'patch') + ')';
            case 'publish':
              return 'npm publish';
            case 'commit-final':
              return 'git commit (post-publish)';
            case 'push':
              return 'git push';
            default:
              return pAction.Op;
          }
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerRippleView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    34: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Sidebar',
        DefaultRenderable: 'Manager-Sidebar-Shell',
        DefaultDestinationAddress: '#RM-Sidebar',
        DefaultTemplateRecordAddress: 'AppData.Manager',
        AutoRender: false,
        CSS: /*css*/`
		.dirty-badge
		{
			display: inline-block;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background: var(--color-warning);
			margin-left: 6px;
			vertical-align: middle;
		}
	`,
        Templates: [{
          Hash: 'Manager-Sidebar-Shell-Template',
          Template: /*html*/`
<div id="RM-SidebarHeader">
	<div class="sidebar-search-row">
		<input type="search" id="RM-SidebarSearch" placeholder="Filter modules..."
			value="{~D:Record.Filter.Query~}"
			oninput="{~P~}.views['Manager-Sidebar'].setFilter(this.value)">
		<button id="RM-ScanButton" title="Scan all modules for changes"
			onclick="{~P~}.views['Manager-Sidebar'].triggerScan()">Scan</button>
	</div>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-DirtyOnly"
			onchange="{~P~}.views['Manager-Sidebar'].setDirtyOnly(this.checked)">
		Dirty only
	</label>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-SortByTime"
			onchange="{~P~}.views['Manager-Sidebar'].setSortByTime(this.checked)">
		Sort by time
		<span id="RM-ScanMeta"></span>
	</label>
</div>
<nav id="RM-ModuleList">
	<p class="loading">Loading modules...</p>
</nav>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Sidebar-Shell',
          TemplateHash: 'Manager-Sidebar-Shell-Template',
          DestinationAddress: '#RM-Sidebar',
          RenderMethod: 'replace'
        }]
      };
      const GROUP_ORDER = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];
      const LS_KEY_FILTER = 'rm:filter:query';
      const LS_KEY_DIRTY_ONLY = 'rm:filter:dirtyOnly';
      const LS_KEY_SORT_BY_TIME = 'rm:filter:sortByTime';
      const LS_KEY_SCAN = 'rm:scan:results';
      const LS_KEY_SCAN_WHEN = 'rm:scan:when';
      function lsGet(pKey) {
        try {
          return window.localStorage.getItem(pKey);
        } catch (e) {
          return null;
        }
      }
      function lsSet(pKey, pValue) {
        try {
          window.localStorage.setItem(pKey, pValue);
        } catch (e) {/* quota */}
      }
      class ManagerSidebarView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._restoredFromStorage = false;
        }
        onBeforeRender() {
          // Restore search/filter/scan state from localStorage on the first render.
          if (!this._restoredFromStorage) {
            this._restoredFromStorage = true;
            let tmpState = this.pict.AppData.Manager;
            tmpState.Filter.Query = lsGet(LS_KEY_FILTER) || '';
            tmpState.Filter.DirtyOnly = lsGet(LS_KEY_DIRTY_ONLY) === '1';
            tmpState.Filter.SortByTime = lsGet(LS_KEY_SORT_BY_TIME) === '1';
            try {
              let tmpCached = lsGet(LS_KEY_SCAN);
              if (tmpCached) {
                tmpState.Scan.Results = JSON.parse(tmpCached) || {};
              }
            } catch (e) {
              tmpState.Scan.Results = {};
            }
            tmpState.Scan.When = lsGet(LS_KEY_SCAN_WHEN) || null;
          }
          return this.pict.AppData.Manager;
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          let tmpDirty = document.getElementById('RM-DirtyOnly');
          if (tmpDirty) {
            tmpDirty.checked = !!this.pict.AppData.Manager.Filter.DirtyOnly;
          }
          let tmpSort = document.getElementById('RM-SortByTime');
          if (tmpSort) {
            tmpSort.checked = !!this.pict.AppData.Manager.Filter.SortByTime;
          }
          this._renderModuleList();
          this._renderScanMeta();
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
        _renderModuleList() {
          let tmpState = this.pict.AppData.Manager;
          let tmpQuery = (tmpState.Filter.Query || '').toLowerCase();
          let tmpDirtyOnly = tmpState.Filter.DirtyOnly;
          let tmpSortTime = tmpState.Filter.SortByTime;
          let tmpScan = tmpState.Scan.Results || {};
          let tmpSelected = tmpState.SelectedModule;
          let tmpGroups = tmpState.ModulesByGroup || {};

          // Sort-by-time renders one flat list ordered by RecentModules; modules
          // not yet visited fall to the bottom in their normal alpha order.
          if (tmpSortTime) {
            let tmpAll = tmpState.Modules || [];
            let tmpRecent = tmpState.RecentModules || [];
            let tmpOrder = {};
            for (let i = 0; i < tmpRecent.length; i++) {
              tmpOrder[tmpRecent[i]] = i;
            }
            let tmpFiltered = [];
            for (let i = 0; i < tmpAll.length; i++) {
              let tmpMod = tmpAll[i];
              if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) {
                continue;
              }
              let tmpScanEntry = tmpScan[tmpMod.Name];
              if (tmpDirtyOnly && !(tmpScanEntry && tmpScanEntry.Dirty)) {
                continue;
              }
              tmpFiltered.push(tmpMod);
            }
            tmpFiltered.sort(function (pA, pB) {
              let tmpAi = pA.Name in tmpOrder ? tmpOrder[pA.Name] : Infinity;
              let tmpBi = pB.Name in tmpOrder ? tmpOrder[pB.Name] : Infinity;
              if (tmpAi !== tmpBi) {
                return tmpAi - tmpBi;
              }
              return pA.Name.localeCompare(pB.Name);
            });
            if (tmpFiltered.length === 0) {
              this.pict.ContentAssignment.assignContent('#RM-ModuleList', '<p class="loading">No modules match the filter.</p>');
              return;
            }
            let tmpHtml = '<div class="group">';
            tmpHtml += '<div class="group-header">Recently used</div>';
            for (let i = 0; i < tmpFiltered.length; i++) {
              let tmpMod = tmpFiltered[i];
              let tmpSelectedClass = tmpSelected === tmpMod.Name ? ' selected' : '';
              let tmpScanEntry = tmpScan[tmpMod.Name];
              let tmpDirtyBadge = tmpScanEntry && tmpScanEntry.Dirty ? ' <span class="dirty-badge" title="Uncommitted changes"></span>' : '';
              let tmpUnvisited = !(tmpMod.Name in tmpOrder);
              tmpHtml += '<a class="module-row' + tmpSelectedClass + (tmpUnvisited ? ' unvisited' : '') + '" ' + 'href="#/Module/' + encodeURIComponent(tmpMod.Name) + '">' + this._escape(tmpMod.Name) + tmpDirtyBadge + '</a>';
            }
            tmpHtml += '</div>';
            this.pict.ContentAssignment.assignContent('#RM-ModuleList', tmpHtml);
            return;
          }
          let tmpHtml = '';
          let tmpAnyShown = false;
          for (let i = 0; i < GROUP_ORDER.length; i++) {
            let tmpGroup = GROUP_ORDER[i];
            let tmpList = tmpGroups[tmpGroup] || [];

            // Filter rows
            let tmpRows = [];
            for (let j = 0; j < tmpList.length; j++) {
              let tmpMod = tmpList[j];
              if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) {
                continue;
              }
              let tmpScanEntry = tmpScan[tmpMod.Name];
              if (tmpDirtyOnly && !(tmpScanEntry && tmpScanEntry.Dirty)) {
                continue;
              }
              tmpRows.push(tmpMod);
            }
            if (tmpRows.length === 0) {
              continue;
            }
            tmpAnyShown = true;
            tmpHtml += '<div class="group">';
            tmpHtml += '<div class="group-header">' + this._escape(tmpGroup) + '</div>';
            for (let j = 0; j < tmpRows.length; j++) {
              let tmpMod = tmpRows[j];
              let tmpSelectedClass = tmpSelected === tmpMod.Name ? ' selected' : '';
              let tmpScanEntry = tmpScan[tmpMod.Name];
              let tmpDirtyBadge = tmpScanEntry && tmpScanEntry.Dirty ? ' <span class="dirty-badge" title="Uncommitted changes"></span>' : '';
              tmpHtml += '<a class="module-row' + tmpSelectedClass + '" ' + 'href="#/Module/' + encodeURIComponent(tmpMod.Name) + '">' + this._escape(tmpMod.Name) + tmpDirtyBadge + '</a>';
            }
            tmpHtml += '</div>';
          }
          if (!tmpAnyShown) {
            tmpHtml = '<p class="loading">' + (tmpDirtyOnly ? 'No dirty modules (click Scan to re-scan).' : tmpQuery ? 'No modules match the filter.' : 'Loading modules...') + '</p>';
          }
          this.pict.ContentAssignment.assignContent('#RM-ModuleList', tmpHtml);
        }

        // ─────────────────────────────────────────────
        //  Handlers invoked from inline attributes
        // ─────────────────────────────────────────────

        setFilter(pValue) {
          let tmpQ = pValue || '';
          this.pict.AppData.Manager.Filter.Query = tmpQ;
          lsSet(LS_KEY_FILTER, tmpQ);
          this._renderModuleList();
        }
        setDirtyOnly(pChecked) {
          let tmpChecked = !!pChecked;
          this.pict.AppData.Manager.Filter.DirtyOnly = tmpChecked;
          lsSet(LS_KEY_DIRTY_ONLY, tmpChecked ? '1' : '0');
          // Lazy-scan if the user flips on dirty-only without any cached scan results.
          if (tmpChecked && Object.keys(this.pict.AppData.Manager.Scan.Results || {}).length === 0) {
            this.triggerScan();
          }
          this._renderModuleList();
        }
        setSortByTime(pChecked) {
          let tmpChecked = !!pChecked;
          this.pict.AppData.Manager.Filter.SortByTime = tmpChecked;
          lsSet(LS_KEY_SORT_BY_TIME, tmpChecked ? '1' : '0');
          this._renderModuleList();
        }
        triggerScan() {
          let tmpState = this.pict.AppData.Manager;
          tmpState.Scan.Running = true;
          this._renderScanMeta();
          let tmpBtn = document.getElementById('RM-ScanButton');
          if (tmpBtn) {
            tmpBtn.classList.add('scanning');
            tmpBtn.disabled = true;
          }
          this.pict.PictApplication.setStatus('Scanning all modules...');
          this.pict.providers.ManagerAPI.scanAllModules().then(pBody => {
            tmpState.Scan.Results = pBody.Results || {};
            tmpState.Scan.When = pBody.ScannedAt;
            lsSet(LS_KEY_SCAN, JSON.stringify(tmpState.Scan.Results));
            if (tmpState.Scan.When) {
              lsSet(LS_KEY_SCAN_WHEN, tmpState.Scan.When);
            }
            this.pict.PictApplication.setStatus('Scan complete (' + pBody.ElapsedMs + 'ms, ' + pBody.ModuleCount + ' modules).');
          }, pError => {
            this.pict.PictApplication.setStatus('Scan failed: ' + pError.message);
          }).then(() => {
            tmpState.Scan.Running = false;
            let tmpBtn2 = document.getElementById('RM-ScanButton');
            if (tmpBtn2) {
              tmpBtn2.classList.remove('scanning');
              tmpBtn2.disabled = false;
            }
            this._renderScanMeta();
            this._renderModuleList();
          });
        }
        _renderScanMeta() {
          let tmpEl = document.getElementById('RM-ScanMeta');
          if (!tmpEl) {
            return;
          }
          let tmpState = this.pict.AppData.Manager.Scan;
          if (tmpState.Running) {
            tmpEl.textContent = 'scanning…';
            return;
          }
          if (!tmpState.When) {
            tmpEl.textContent = '';
            return;
          }
          let tmpNames = Object.keys(tmpState.Results || {});
          let tmpDirty = tmpNames.filter(pN => tmpState.Results[pN].Dirty).length;
          let tmpWhen = new Date(tmpState.When);
          let tmpAge = Math.max(0, Math.floor((Date.now() - tmpWhen.getTime()) / 1000));
          let tmpAgeStr;
          if (tmpAge < 60) {
            tmpAgeStr = tmpAge + 's ago';
          } else if (tmpAge < 3600) {
            tmpAgeStr = Math.floor(tmpAge / 60) + 'm ago';
          } else {
            tmpAgeStr = Math.floor(tmpAge / 3600) + 'h ago';
          }
          tmpEl.textContent = tmpDirty + ' dirty · ' + tmpAgeStr;
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerSidebarView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    35: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-StatusBar',
        DefaultRenderable: 'Manager-StatusBar-Content',
        DefaultDestinationAddress: '#RM-StatusBar',
        DefaultTemplateRecordAddress: 'AppData.Manager',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-StatusBar-Template',
          Template: /*html*/`
<span id="RM-StatusMessage">{~D:Record.StatusMessage~}</span>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-StatusBar-Content',
          TemplateHash: 'Manager-StatusBar-Template',
          DestinationAddress: '#RM-StatusBar',
          RenderMethod: 'replace'
        }]
      };
      class ManagerStatusBarView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onBeforeRender() {
          return this.pict.AppData.Manager;
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerStatusBarView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    36: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-TopBar',
        DefaultRenderable: 'Manager-TopBar-Content',
        DefaultDestinationAddress: '#RM-TopBar',
        DefaultTemplateRecordAddress: 'AppData.Manager',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-TopBar-Template',
          Template: /*html*/`
<h1>Retold Manager</h1>
<span class="badge {~D:Record.Health.state~}" title="server health">{~D:Record.Health.text~}</span>
<div style="margin-left:auto;display:flex;gap:8px">
	<button class="action primary" title="Run modules/Status.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/status')">Status</button>
	<button class="action primary" title="Run modules/Update.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/update')">Update</button>
	<button class="action primary" title="Run modules/Checkout.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/checkout')">Checkout</button>
	<span style="width:1px;background:var(--color-border);margin:0 4px"></span>
	<button class="action" onclick="{~P~}.views['Manager-LogModal'].openForLogFile()">Log</button>
	<button class="action" onclick="{~P~}.PictApplication.navigateTo('/Manifest')">Manifest</button>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-TopBar-Content',
          TemplateHash: 'Manager-TopBar-Template',
          DestinationAddress: '#RM-TopBar',
          RenderMethod: 'replace'
        }]
      };
      class ManagerTopBarView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        onBeforeRender(pRenderable) {
          // Supply the top-level state object as the record so the template can
          // address Record.Health.* directly.
          pRenderable.DefaultRenderMethod = 'replace';
          return this.pict.AppData.Manager;
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerTopBarView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    37: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Modal-Commit',
        DefaultRenderable: 'Manager-Modal-Commit-Content',
        DefaultDestinationAddress: '#RM-ModalRoot',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.CommitModal',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-Modal-Commit-Template',
          Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Commit'].close();}">
	<div class="modal">
		<h3>Commit &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 10px">
			Runs <code>git commit -a -m &lt;message&gt;</code>.
		</p>
		<textarea id="RM-CommitMessage" placeholder="Commit message"></textarea>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-Commit'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-Commit'].submit()">Commit</button>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Modal-Commit-Content',
          TemplateHash: 'Manager-Modal-Commit-Template',
          DestinationAddress: '#RM-ModalRoot',
          RenderMethod: 'replace'
        }]
      };
      class ManagerModalCommitView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        open(pModuleName) {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.CommitModal = {
            ModuleName: pModuleName
          };
          this._moduleName = pModuleName;
          this.render();
          setTimeout(() => {
            let tmpTA = document.getElementById('RM-CommitMessage');
            if (tmpTA) {
              tmpTA.focus();
            }
          }, 0);
        }
        close() {
          this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
        }
        submit() {
          let tmpTA = document.getElementById('RM-CommitMessage');
          if (!tmpTA) {
            return;
          }
          let tmpMessage = tmpTA.value.trim();
          if (tmpMessage.length === 0) {
            tmpTA.focus();
            return;
          }
          let tmpName = this._moduleName;
          this.close();

          // Stamp the active operation so the WS layer routes frames into the
          // inline panel and refreshes the workspace on completion.
          this.pict.AppData.Manager.ActiveOperation = {
            OperationId: null,
            CommandTag: null,
            Lines: [],
            HeaderState: 'running',
            HeaderText: 'git commit',
            Scope: 'module',
            ModuleName: tmpName
          };
          if (this.pict.views['Manager-OutputPanel']) {
            this.pict.views['Manager-OutputPanel'].render();
          }
          this.pict.providers.ManagerAPI.commitModule(tmpName, tmpMessage).then(() => {
            this.pict.PictApplication.setStatus('Commit started for ' + tmpName + '.');
          }, pError => {
            this.pict.PictApplication.setStatus('Commit failed: ' + pError.message);
          });
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerModalCommitView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    38: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Modal-Diff',
        DefaultRenderable: 'Manager-Modal-Diff-Content',
        DefaultDestinationAddress: '#RM-ModalRoot',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.DiffModal',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-Modal-Diff-Template',
          Template: /*html*/`
<div class="modal-backdrop diff-modal" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Diff'].close();}">
	<div class="modal">
		<div class="diff-panel diff-panel-modal">
			<div class="diff-header">
				<span><strong>Diff &mdash; {~D:Record.ModuleName~}</strong>
					<span class="subtle" id="RM-DiffModalSummary" style="margin-left:8px">{~D:Record.Summary~}</span></span>
				<span class="diff-header-actions">
					<button onclick="{~P~}.views['Manager-Modal-Diff'].refresh()">refresh</button>
					<button onclick="{~P~}.views['Manager-Modal-Diff'].close()">close</button>
				</span>
			</div>
			<div class="diff-body" id="RM-DiffModalBody">{~D:Record.BodyHtml~}</div>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Modal-Diff-Content',
          TemplateHash: 'Manager-Modal-Diff-Template',
          DestinationAddress: '#RM-ModalRoot',
          RenderMethod: 'replace'
        }]
      };
      class ManagerModalDiffView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._moduleName = null;
          this._keyHandler = null;
        }
        open(pModuleName) {
          this._moduleName = pModuleName;
          this._writeRecord({
            ModuleName: pModuleName,
            Summary: 'loading diff...',
            BodyHtml: '<div class="diff-line meta">fetching ' + this._escape(pModuleName) + ' diff...</div>'
          });
          this.render();
          this._loadDiff();
          this._keyHandler = pEvent => {
            if (pEvent.key === 'Escape') {
              this.close();
            }
          };
          document.addEventListener('keydown', this._keyHandler);
        }
        close() {
          if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
          }
          this._moduleName = null;
          this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
        }
        refresh() {
          if (!this._moduleName) {
            return;
          }
          let tmpBody = document.getElementById('RM-DiffModalBody');
          let tmpSummary = document.getElementById('RM-DiffModalSummary');
          if (tmpBody) {
            tmpBody.innerHTML = '<div class="diff-line meta">fetching...</div>';
          }
          if (tmpSummary) {
            tmpSummary.textContent = 'loading...';
          }
          this._loadDiff();
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }

        // ─────────────────────────────────────────────

        _loadDiff() {
          let tmpName = this._moduleName;
          this.pict.providers.ManagerAPI.fetchGitDiffText(tmpName).then(pText => {
            // If the user closed or switched modules, drop the stale result.
            if (this._moduleName !== tmpName) {
              return;
            }
            this._paintDiff(pText);
          }, pError => {
            if (this._moduleName !== tmpName) {
              return;
            }
            let tmpBody = document.getElementById('RM-DiffModalBody');
            let tmpSummary = document.getElementById('RM-DiffModalSummary');
            if (tmpBody) {
              tmpBody.innerHTML = '<div class="diff-line del">Diff fetch failed: ' + this._escape(pError.message) + '</div>';
            }
            if (tmpSummary) {
              tmpSummary.textContent = 'error';
            }
          });
        }
        _paintDiff(pText) {
          let tmpBody = document.getElementById('RM-DiffModalBody');
          let tmpSummary = document.getElementById('RM-DiffModalSummary');
          if (!tmpBody) {
            return;
          }
          if (!pText || pText.trim().length === 0) {
            tmpBody.innerHTML = '<div class="diff-line none">No changes (excluding dist/).</div>';
            if (tmpSummary) {
              tmpSummary.textContent = 'clean';
            }
            return;
          }
          let tmpLines = pText.split('\n');
          let tmpParts = [];
          let tmpFiles = 0;
          let tmpAdds = 0;
          let tmpDels = 0;
          for (let i = 0; i < tmpLines.length; i++) {
            let tmpLine = tmpLines[i];
            if (tmpLine.length === 0 && i === tmpLines.length - 1) {
              continue;
            }
            let tmpCls;
            if (tmpLine.startsWith('diff --git')) {
              tmpCls = 'file';
              tmpFiles++;
            } else if (tmpLine.startsWith('index ') || tmpLine.startsWith('new file') || tmpLine.startsWith('deleted file') || tmpLine.startsWith('---') || tmpLine.startsWith('+++') || tmpLine.startsWith('similarity ') || tmpLine.startsWith('rename ')) {
              tmpCls = 'meta';
            } else if (tmpLine.startsWith('@@')) {
              tmpCls = 'hunk';
            } else if (tmpLine.startsWith('+')) {
              tmpCls = 'add';
              tmpAdds++;
            } else if (tmpLine.startsWith('-')) {
              tmpCls = 'del';
              tmpDels++;
            } else {
              tmpCls = '';
            }
            tmpParts.push('<div class="diff-line ' + tmpCls + '">' + this._escape(tmpLine) + '</div>');
          }
          tmpBody.innerHTML = tmpParts.join('');
          if (tmpSummary) {
            tmpSummary.textContent = tmpFiles + (tmpFiles === 1 ? ' file, ' : ' files, ') + '+' + tmpAdds + ', -' + tmpDels;
          }
        }
        _writeRecord(pRecord) {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.DiffModal = pRecord;
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerModalDiffView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    39: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Modal-EditModule',
        DefaultRenderable: 'Manager-Modal-EditModule-Content',
        DefaultDestinationAddress: '#RM-ModalRoot',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.EditModuleModal',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-Modal-EditModule-Template',
          Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-EditModule'].close();}">
	<div class="modal" style="min-width:640px;max-width:760px">
		<h3>{~D:Record.Title~}</h3>
		<div class="form-row"><label>Name</label>
			<input type="text" id="RM-E-Name" value="{~D:Record.Entry.Name~}"></div>
		<div class="form-row"><label>Path</label>
			<input type="text" id="RM-E-Path" value="{~D:Record.Entry.Path~}" placeholder="modules/&lt;group&gt;/&lt;name&gt;"></div>
		<div class="form-row"><label>Description</label>
			<textarea id="RM-E-Desc" rows="2">{~D:Record.Entry.Description~}</textarea></div>
		<div class="form-row"><label>GitHub</label>
			<input type="text" id="RM-E-GitHub" value="{~D:Record.Entry.GitHub~}" placeholder="https://github.com/..."></div>
		<div class="form-row"><label>Documentation</label>
			<input type="text" id="RM-E-Docs" value="{~D:Record.Entry.Documentation~}" placeholder="https://..."></div>
		<div class="form-row"><label>Related</label>
			<input type="text" id="RM-E-Related" value="{~D:Record.RelatedString~}" placeholder="comma-separated module names"></div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-EditModule'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-EditModule'].save()">{~D:Record.SaveLabel~}</button>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Modal-EditModule-Content',
          TemplateHash: 'Manager-Modal-EditModule-Template',
          DestinationAddress: '#RM-ModalRoot',
          RenderMethod: 'replace'
        }]
      };
      class ManagerModalEditModuleView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }

        /**
         * pOptions: { GroupName, ExistingEntry?, SeedName? }
         * - ExistingEntry present → edit; otherwise add.
         * - SeedName pre-fills Name when adding from disk.
         */
        open(pOptions) {
          let tmpOpts = pOptions || {};
          let tmpIsEdit = !!tmpOpts.ExistingEntry;
          this._isEdit = tmpIsEdit;
          this._groupName = tmpOpts.GroupName;
          this._originalName = tmpIsEdit ? tmpOpts.ExistingEntry.Name : null;
          let tmpEntry = tmpIsEdit ? Object.assign({}, tmpOpts.ExistingEntry) : {
            Name: tmpOpts.SeedName || '',
            Path: '',
            Description: '',
            GitHub: '',
            Documentation: '',
            RelatedModules: []
          };
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.EditModuleModal = {
            Title: tmpIsEdit ? 'Edit ' + tmpEntry.Name : 'Add module to ' + tmpOpts.GroupName,
            SaveLabel: tmpIsEdit ? 'Save' : 'Add',
            Entry: tmpEntry,
            RelatedString: (tmpEntry.RelatedModules || []).join(', ')
          };
          this.render();
        }
        close() {
          this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
        }
        save() {
          let tmpRelatedStr = document.getElementById('RM-E-Related').value.trim();
          let tmpPayload = {
            Name: document.getElementById('RM-E-Name').value.trim(),
            Path: document.getElementById('RM-E-Path').value.trim(),
            Description: document.getElementById('RM-E-Desc').value.trim(),
            GitHub: document.getElementById('RM-E-GitHub').value.trim(),
            Documentation: document.getElementById('RM-E-Docs').value.trim(),
            RelatedModules: tmpRelatedStr ? tmpRelatedStr.split(',').map(function (pS) {
              return pS.trim();
            }).filter(Boolean) : []
          };
          if (!tmpPayload.Name) {
            window.alert('Name is required.');
            return;
          }
          let tmpApi = this.pict.providers.ManagerAPI;
          let tmpPromise;
          if (this._isEdit) {
            tmpPromise = tmpApi.updateManifestModule(this._originalName, tmpPayload);
          } else {
            tmpPayload.Group = this._groupName;
            tmpPromise = tmpApi.createManifestModule(tmpPayload);
          }
          tmpPromise.then(() => {
            this.close();
            // Refresh manifest + sidebar
            let tmpManifestView = this.pict.views['Manager-ManifestEditor'];
            if (tmpManifestView && typeof tmpManifestView.reload === 'function') {
              tmpManifestView.reload();
            }
            this.pict.providers.ManagerAPI.loadModules();
          }, pError => {
            window.alert('Save failed: ' + pError.message);
          });
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerModalEditModuleView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    40: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Modal-Ncu',
        DefaultRenderable: 'Manager-Modal-Ncu-Content',
        DefaultDestinationAddress: '#RM-ModalRoot',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.NcuModal',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-Modal-Ncu-Template',
          Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Ncu'].close();}">
	<div class="modal" style="min-width:520px">
		<h3>npm-check-updates &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 12px">
			<strong>Check</strong> lists outdated packages. <strong>Apply</strong> runs
			<code>ncu -u</code> (updates package.json) and then <code>npm install</code>.
			<strong>Retold scope</strong> filters to ecosystem modules only; <strong>All</strong>
			includes every dep. Output streams in the panel below.
		</p>
		<div class="form-row"><label>Scope</label>
			<div>
				<label style="font-family:var(--font-sans);color:var(--color-text)">
					<input type="radio" name="rm-ncu-scope" value="retold" checked style="width:auto;margin-right:6px"> Retold ecosystem only
				</label><br>
				<label style="font-family:var(--font-sans);color:var(--color-text)">
					<input type="radio" name="rm-ncu-scope" value="all" style="width:auto;margin-right:6px"> All dependencies
				</label>
			</div>
		</div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-Ncu'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-Ncu'].submit(false)">Check</button>
			<button class="action success" onclick="{~P~}.views['Manager-Modal-Ncu'].submit(true)">Apply (update + install)</button>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Modal-Ncu-Content',
          TemplateHash: 'Manager-Modal-Ncu-Template',
          DestinationAddress: '#RM-ModalRoot',
          RenderMethod: 'replace'
        }]
      };
      class ManagerModalNcuView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        open(pModuleName) {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.NcuModal = {
            ModuleName: pModuleName
          };
          this._moduleName = pModuleName;
          this.render();
        }
        close() {
          this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
        }
        submit(pApply) {
          let tmpScope = 'retold';
          let tmpChecked = document.querySelector('input[name="rm-ncu-scope"]:checked');
          if (tmpChecked) {
            tmpScope = tmpChecked.value;
          }
          let tmpName = this._moduleName;
          this.close();

          // Stamp the active op so the inline output panel surfaces this run
          // (otherwise the panel stays hidden because Scope/ModuleName is unset).
          this.pict.AppData.Manager.ActiveOperation = {
            OperationId: null,
            CommandTag: null,
            Lines: [],
            HeaderState: 'running',
            HeaderText: pApply ? 'ncu -u + npm install' : 'ncu',
            Scope: 'module',
            ModuleName: tmpName
          };
          if (this.pict.views['Manager-OutputPanel']) {
            this.pict.views['Manager-OutputPanel'].render();
          }
          this.pict.providers.ManagerAPI.runNcu(tmpName, pApply, tmpScope).then(() => {
            this.pict.PictApplication.setStatus('ncu ' + (pApply ? 'apply' : 'check') + ' started.');
          }, pError => {
            this.pict.PictApplication.setStatus('NCU failed: ' + pError.message);
          });
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }
      }
      module.exports = ManagerModalNcuView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    41: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Modal-Publish',
        DefaultRenderable: 'Manager-Modal-Publish-Content',
        DefaultDestinationAddress: '#RM-ModalRoot',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.PublishModal',
        AutoRender: false,
        Templates: [{
          Hash: 'Manager-Modal-Publish-Template',
          Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Publish'].close();}">
	<div class="modal" style="min-width:640px">
		<h3>Publish &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 6px">{~D:Record.SubTitle~}</p>
		<div class="preview-panel" id="RM-PreviewPanel">{~D:Record.PreviewHtml~}</div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-Publish'].close()">Close</button>
			<button class="action success" id="RM-PublishSubmit"
				onclick="{~P~}.views['Manager-Modal-Publish'].submit(false)" disabled>Publish to npm</button>
			<button class="action success" id="RM-PublishSubmitDocker"
				onclick="{~P~}.views['Manager-Modal-Publish'].submit(true)" disabled
				title="Also rebuild + push the GHCR docker image (multi-arch build, several minutes)">Publish + Docker image</button>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Modal-Publish-Content',
          TemplateHash: 'Manager-Modal-Publish-Template',
          DestinationAddress: '#RM-ModalRoot',
          RenderMethod: 'replace'
        }]
      };
      class ManagerModalPublishView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
        }
        open(pModuleName) {
          this._moduleName = pModuleName;
          this._previewHash = null;
          this._ok = false;
          this._writeRecord({
            ModuleName: pModuleName,
            SubTitle: 'Loading pre-publish validation...',
            PreviewHtml: '<em>running npm queries (parallel)...</em>'
          });
          this.render();
          this.pict.providers.ManagerAPI.loadPublishPreview(pModuleName).then(pReport => {
            if (this._moduleName !== pModuleName) {
              return;
            }
            this._previewHash = pReport.PreviewHash;
            this._ok = !!pReport.OkToPublish;
            this._writeRecord({
              ModuleName: pModuleName,
              SubTitle: pReport.OkToPublish ? 'All pre-publish checks passed — review below, then confirm.' : 'Pre-publish validation blocked this publish. See below.',
              PreviewHtml: this._renderPreview(pReport)
            });
            this.render();
          }, pError => {
            if (this._moduleName !== pModuleName) {
              return;
            }
            this._writeRecord({
              ModuleName: pModuleName,
              SubTitle: 'Preview failed.',
              PreviewHtml: '<span style="color:var(--color-danger)">Preview failed: ' + this._escape(pError.message) + '</span>'
            });
            this.render();
          });
        }
        close() {
          this._moduleName = null;
          this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
        }
        submit(pWithDocker) {
          if (!this._previewHash || !this._ok || !this._moduleName) {
            return;
          }
          let tmpName = this._moduleName;
          let tmpHash = this._previewHash;

          // Disable both submit buttons during the inflight publish so
          // the user can't double-click into a second concurrent run.
          let tmpBtn = document.getElementById('RM-PublishSubmit');
          let tmpBtnDocker = document.getElementById('RM-PublishSubmitDocker');
          if (tmpBtn) {
            tmpBtn.disabled = true;
          }
          if (tmpBtnDocker) {
            tmpBtnDocker.disabled = true;
          }
          let tmpStatusLabel = pWithDocker ? 'Publishing ' + tmpName + ' + GHCR image...' : 'Publishing ' + tmpName + '...';
          this.pict.providers.ManagerAPI.publishModule(tmpName, tmpHash, !!pWithDocker).then(() => {
            this.close();
            this.pict.PictApplication.setStatus(tmpStatusLabel);
          }, pError => {
            if (tmpBtn) {
              tmpBtn.disabled = false;
            }
            if (tmpBtnDocker) {
              tmpBtnDocker.disabled = false;
            }
            let tmpPanel = document.getElementById('RM-PreviewPanel');
            if (tmpPanel) {
              let tmpLine = document.createElement('div');
              tmpLine.style.marginTop = '8px';
              tmpLine.style.color = 'var(--color-danger)';
              tmpLine.textContent = 'error: ' + (pError.Info && pError.Info.Error ? pError.Info.Error + ': ' : '') + pError.message;
              tmpPanel.appendChild(tmpLine);
            }
          });
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          // Enable both submit buttons only once preview says OkToPublish.
          let tmpBtn = document.getElementById('RM-PublishSubmit');
          let tmpBtnDocker = document.getElementById('RM-PublishSubmitDocker');
          if (tmpBtn) {
            tmpBtn.disabled = !this._ok;
          }
          if (tmpBtnDocker) {
            tmpBtnDocker.disabled = !this._ok;
          }
          this.pict.CSSMap.injectCSS();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }

        // ─────────────────────────────────────────────

        _writeRecord(pRecord) {
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.PublishModal = pRecord;
        }
        _renderPreview(pReport) {
          let tmpHtml = '';
          let tmpVerdict = pReport.OkToPublish ? '<span class="preview-verdict ok">Ready to publish</span>' : '<span class="preview-verdict block">Not publishable</span>';
          tmpHtml += tmpVerdict + '<br>';
          tmpHtml += '<strong>Package:</strong> ' + this._escape(pReport.Package) + '<br>';
          tmpHtml += '<strong>Local:</strong> v' + this._escape(pReport.LocalVersion) + '<br>';
          tmpHtml += pReport.PublishedVersion ? '<strong>npm:</strong> v' + this._escape(pReport.PublishedVersion) + '<br>' : '<strong>npm:</strong> <em>(not yet published)</em><br>';
          if (pReport.Problems && pReport.Problems.length > 0) {
            tmpHtml += '<div style="margin-top:8px"><strong>Problems:</strong>';
            for (let i = 0; i < pReport.Problems.length; i++) {
              let tmpP = pReport.Problems[i];
              let tmpCls = tmpP.Severity === 'error' ? 'stale' : 'warn';
              tmpHtml += '<div class="dep ' + tmpCls + '">' + this._escape(tmpP.Message) + '</div>';
            }
            tmpHtml += '</div>';
          }
          if (pReport.EcosystemDeps && pReport.EcosystemDeps.length > 0) {
            tmpHtml += '<div style="margin-top:8px"><strong>Ecosystem deps (' + pReport.EcosystemDeps.length + '):</strong>';
            for (let i = 0; i < pReport.EcosystemDeps.length; i++) {
              let tmpD = pReport.EcosystemDeps[i];
              let tmpCls, tmpMark;
              if (tmpD.LocalLink) {
                tmpCls = 'link';
                tmpMark = 'link';
              } else if (tmpD.Error) {
                tmpCls = 'warn';
                tmpMark = 'warn';
              } else if (tmpD.CoversLatest) {
                tmpCls = 'ok';
                tmpMark = 'ok';
              } else {
                tmpCls = 'stale';
                tmpMark = 'stale';
              }
              let tmpSuffix = tmpD.LocalLink ? '(local link)' : tmpD.Error ? '(could not fetch from npm)' : 'latest: ' + (tmpD.LatestOnNpm || '—');
              tmpHtml += '<div class="dep ' + tmpCls + '">' + tmpMark + ' ' + this._escape(tmpD.Name) + '  ' + this._escape(tmpD.Range) + '  ' + tmpSuffix + '</div>';
            }
            tmpHtml += '</div>';
          }
          if (pReport.CommitsSincePublish && pReport.CommitsSincePublish.length > 0) {
            tmpHtml += '<div style="margin-top:8px"><strong>Recent commits:</strong>';
            for (let i = 0; i < pReport.CommitsSincePublish.length; i++) {
              let tmpC = pReport.CommitsSincePublish[i];
              tmpHtml += '<div class="dep link">' + this._escape(tmpC.Hash) + ' ' + this._escape(tmpC.Subject) + '</div>';
            }
            tmpHtml += '</div>';
          }
          return tmpHtml;
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerModalPublishView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }],
    42: [function (require, module, exports) {
      const libPictView = require('pict-view');
      const _ViewConfiguration = {
        ViewIdentifier: 'Manager-Modal-RipplePlan',
        DefaultRenderable: 'Manager-Modal-RipplePlan-Content',
        DefaultDestinationAddress: '#RM-ModalRoot',
        DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.RipplePlanModal',
        AutoRender: false,
        CSS: /*css*/`
		.ripple-plan-modal .producer-list {
			border: 1px solid var(--color-border); border-radius: 4px;
			background: var(--color-panel-alt); padding: 6px 8px;
			max-height: 280px; overflow: auto; margin: 4px 0 8px;
		}
		.ripple-plan-modal .producer-group { margin-bottom: 8px; }
		.ripple-plan-modal .producer-group:last-child { margin-bottom: 0; }
		.ripple-plan-modal .producer-group-header {
			display: flex; align-items: baseline; gap: 8px;
			padding: 2px 0 4px; border-bottom: 1px dashed var(--color-border);
			margin-bottom: 4px;
		}
		.ripple-plan-modal .producer-group-name {
			font-family: var(--font-mono); font-size: 11px;
			color: var(--color-muted); text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.ripple-plan-modal .producer-group-actions {
			margin-left: auto; display: flex; gap: 4px;
		}
		.ripple-plan-modal .producer-group-actions button {
			font-size: 10px; padding: 1px 6px; background: none;
			border: 1px solid var(--color-border); border-radius: 3px;
			color: var(--color-muted); cursor: pointer;
		}
		.ripple-plan-modal .producer-group-actions button:hover {
			color: var(--color-accent); border-color: var(--color-accent);
		}
		.ripple-plan-modal .producer-row {
			display: flex; align-items: center; gap: 6px;
			padding: 1px 4px; font-family: var(--font-mono); font-size: 12px;
		}
		.ripple-plan-modal .producer-row:hover { background: var(--color-panel); }
		.ripple-plan-modal .producer-row label {
			cursor: pointer; flex: 1; display: flex; align-items: center; gap: 6px;
			min-width: 0;
		}
		.ripple-plan-modal .producer-row input[type="checkbox"] {
			width: auto; margin: 0;
		}
		.ripple-plan-modal .producer-row .producer-name { flex: 1; min-width: 0; }
		.ripple-plan-modal .producer-row.is-origin .producer-name {
			color: var(--color-accent); font-weight: 600;
		}
		.ripple-plan-modal .selection-summary {
			display: flex; align-items: baseline; gap: 8px;
			color: var(--color-muted); font-size: 11px; margin: 4px 0 8px;
		}
		.ripple-plan-modal .selection-summary .count {
			color: var(--color-accent); font-weight: 600;
		}
		.ripple-plan-modal .selection-summary .quick-actions {
			margin-left: auto; display: flex; gap: 6px;
		}
		.ripple-plan-modal .selection-summary button {
			font-size: 11px; padding: 2px 8px;
			background: rgba(47,129,247,0.12); color: var(--color-accent);
			border: 1px solid rgba(47,129,247,0.3); border-radius: 3px;
			cursor: pointer;
		}
		.ripple-plan-modal .selection-summary button:hover {
			background: rgba(47,129,247,0.22);
		}
		.ripple-plan-modal .form-row.compact { margin-bottom: 4px; }
		.ripple-plan-modal .form-row.compact label { min-width: 160px; }
	`,
        Templates: [{
          Hash: 'Manager-Modal-RipplePlan-Template',
          Template: /*html*/`
<div class="modal-backdrop ripple-plan-modal" onclick="if(event.target===this){window._Pict.views['Manager-Modal-RipplePlan'].close();}">
	<div class="modal" style="min-width:680px;max-width:820px">
		<h3>Plan ripple</h3>
		<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 8px">
			Pick the producer modules to publish. Their transitive consumers will be appended
			automatically in topological order. Each producer step runs <code>bump-if-needed</code>
			(skips bump if you already advanced the version) before publishing.
		</p>

		<div class="selection-summary">
			<span><span class="count" id="RM-R-SelectionCount">0</span> selected</span>
			<span class="quick-actions">
				<button id="RM-R-PickSiblings" type="button"
					title="Select every module sharing the originating module's hyphen prefix"></button>
				<button onclick="{~P~}.views['Manager-Modal-RipplePlan'].clearSelection()" type="button">clear all</button>
			</span>
		</div>

		<div class="producer-list" id="RM-R-ProducerList">{~D:Record.ProducersHtml~}</div>

		<div class="form-row compact"><label>Range prefix</label>
			<input type="text" id="RM-R-Prefix" value="^"></div>
		<div class="form-row compact"><label>Producer bump (if needed)</label>
			<input type="text" id="RM-R-ProducerBump" value="patch" placeholder="patch / minor / major"></div>
		<div class="form-row compact"><label>Consumer bump</label>
			<input type="text" id="RM-R-Bump" value="patch" placeholder="patch / minor / major"></div>
		<div class="form-row compact"><label>Include devDeps</label>
			<input type="checkbox" id="RM-R-IncludeDev" style="width:auto">
			<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
				(off by default &mdash; devDep cycles produce fallback ordering)
			</span></div>
		<div class="form-row compact"><label>Stop at apps</label>
			<input type="checkbox" id="RM-R-StopAtApps" checked style="width:auto"></div>
		<div class="form-row compact"><label>Run npm install</label>
			<input type="checkbox" id="RM-R-Install" checked style="width:auto"></div>
		<div class="form-row compact"><label>Run tests</label>
			<input type="checkbox" id="RM-R-Test" checked style="width:auto"></div>
		<div class="form-row compact"><label>Push after publish</label>
			<input type="checkbox" id="RM-R-Push" checked style="width:auto"></div>
		<div class="form-row compact"><label>Bring retold deps forward</label>
			<input type="checkbox" id="RM-R-BringForward" style="width:auto">
			<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
				(<code>ncu -u --filter &lt;retold&gt;</code> before each consumer step)
			</span></div>

		<div id="RM-R-Result" style="margin-top:12px"></div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-RipplePlan'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-RipplePlan'].submit()">Compute plan</button>
		</div>
	</div>
</div>
`
        }],
        Renderables: [{
          RenderableHash: 'Manager-Modal-RipplePlan-Content',
          TemplateHash: 'Manager-Modal-RipplePlan-Template',
          DestinationAddress: '#RM-ModalRoot',
          RenderMethod: 'replace'
        }]
      };

      // Group order matches RippleGraph's GROUP_ORDER so the modal mirrors the
      // topo-sort tie-breaker. Apps sit at the bottom because they're typically
      // the cone leaves, not the seeds.
      const GROUP_ORDER = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];
      class ManagerModalRipplePlanView extends libPictView {
        constructor(pFable, pOptions, pServiceHash) {
          super(pFable, pOptions, pServiceHash);
          this._origin = null;
          this._siblingPrefix = null;
        }
        open(pOriginatingModule) {
          this._origin = pOriginatingModule;
          this._siblingPrefix = this._computeSiblingPrefix(pOriginatingModule);
          if (!this.pict.AppData.Manager.ViewRecord) {
            this.pict.AppData.Manager.ViewRecord = {};
          }
          this.pict.AppData.Manager.ViewRecord.RipplePlanModal = {
            Origin: pOriginatingModule,
            ProducersHtml: this._buildProducerListHtml(pOriginatingModule)
          };
          this.render();
        }
        close() {
          this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
        }
        onAfterRender(pRenderable, pAddress, pRecord, pContent) {
          this.pict.CSSMap.injectCSS();

          // Wire the dynamic "select <prefix>-* siblings" button. Hide it if
          // the originating module has no meaningful sibling prefix
          // (e.g. single-segment names like "fable").
          let tmpSiblingBtn = document.getElementById('RM-R-PickSiblings');
          if (tmpSiblingBtn) {
            if (this._siblingPrefix) {
              tmpSiblingBtn.textContent = '+ select ' + this._siblingPrefix + '-* siblings';
              tmpSiblingBtn.style.display = '';
              tmpSiblingBtn.onclick = () => this.selectSiblings();
            } else {
              tmpSiblingBtn.style.display = 'none';
            }
          }

          // Wire per-group "all / none" buttons.
          let tmpGroupBtns = document.querySelectorAll('.producer-group-actions button[data-group]');
          for (let i = 0; i < tmpGroupBtns.length; i++) {
            tmpGroupBtns[i].onclick = pEvent => {
              let tmpBtn = pEvent.currentTarget;
              let tmpGroup = tmpBtn.getAttribute('data-group');
              let tmpAct = tmpBtn.getAttribute('data-act');
              this._setGroupChecked(tmpGroup, tmpAct === 'all');
            };
          }

          // Wire checkboxes to refresh the count display.
          let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]');
          for (let i = 0; i < tmpChecks.length; i++) {
            tmpChecks[i].addEventListener('change', () => this._refreshSelectionCount());
          }
          this._refreshSelectionCount();
          return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
        }

        // ─────────────────────────────────────────────
        //  Selection helpers (called from inline handlers)
        // ─────────────────────────────────────────────

        selectSiblings() {
          if (!this._siblingPrefix) {
            return;
          }
          let tmpPrefix = this._siblingPrefix + '-';
          let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]');
          for (let i = 0; i < tmpChecks.length; i++) {
            let tmpName = tmpChecks[i].getAttribute('data-module');
            if (tmpName.indexOf(tmpPrefix) === 0) {
              tmpChecks[i].checked = true;
            }
          }
          this._refreshSelectionCount();
        }
        clearSelection() {
          let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]');
          for (let i = 0; i < tmpChecks.length; i++) {
            tmpChecks[i].checked = false;
          }
          this._refreshSelectionCount();
        }
        submit() {
          let tmpRoots = this._collectSelectedRoots();
          let tmpResult = document.getElementById('RM-R-Result');
          if (tmpRoots.length === 0) {
            if (tmpResult) {
              tmpResult.innerHTML = '<div style="color:var(--color-danger)">' + 'Select at least one producer module.</div>';
            }
            return;
          }
          let tmpOpts = {
            Roots: tmpRoots,
            RangePrefix: document.getElementById('RM-R-Prefix').value.trim() || '^',
            ConsumerBumpKind: document.getElementById('RM-R-Bump').value.trim() || 'patch',
            ProducerBumpKind: document.getElementById('RM-R-ProducerBump').value.trim() || 'patch',
            IncludeDev: document.getElementById('RM-R-IncludeDev').checked,
            StopAtApps: document.getElementById('RM-R-StopAtApps').checked,
            RunInstall: document.getElementById('RM-R-Install').checked,
            RunTest: document.getElementById('RM-R-Test').checked,
            RunPush: document.getElementById('RM-R-Push').checked,
            BringRetoldDepsForward: document.getElementById('RM-R-BringForward').checked
          };
          if (tmpResult) {
            tmpResult.innerHTML = '<em>computing plan...</em>';
          }
          this.pict.providers.ManagerAPI.planRipple(tmpOpts).then(pPlan => {
            this.close();
            this.pict.AppData.Manager.RipplePlan = pPlan;
            this.pict.PictApplication.navigateTo('/Ripple');
          }, pError => {
            if (tmpResult) {
              tmpResult.innerHTML = '<div style="color:var(--color-danger)">Plan failed: ' + this._escape(pError.message) + '</div>';
            }
          });
        }

        // ─────────────────────────────────────────────
        //  Internals
        // ─────────────────────────────────────────────

        _collectSelectedRoots() {
          let tmpResult = [];
          let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]:checked');
          for (let i = 0; i < tmpChecks.length; i++) {
            tmpResult.push(tmpChecks[i].getAttribute('data-module'));
          }
          return tmpResult;
        }
        _setGroupChecked(pGroup, pChecked) {
          let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-group="' + pGroup + '"]');
          for (let i = 0; i < tmpChecks.length; i++) {
            tmpChecks[i].checked = pChecked;
          }
          this._refreshSelectionCount();
        }
        _refreshSelectionCount() {
          let tmpCount = this._collectSelectedRoots().length;
          let tmpEl = document.getElementById('RM-R-SelectionCount');
          if (tmpEl) {
            tmpEl.textContent = String(tmpCount);
          }
        }

        /**
         * Sibling prefix is everything except the last hyphen segment. For
         * "meadow-connection-mongodb" → "meadow-connection". For single-segment
         * names like "fable" → null (no siblings to suggest).
         */
        _computeSiblingPrefix(pName) {
          if (!pName || typeof pName !== 'string') {
            return null;
          }
          let tmpParts = pName.split('-');
          if (tmpParts.length < 2) {
            return null;
          }
          return tmpParts.slice(0, -1).join('-');
        }
        _buildProducerListHtml(pOrigin) {
          // AppData.Manager.Modules is loaded by ManagerAPI.loadModules() at
          // app startup. If it's somehow missing, render a placeholder.
          let tmpModules = this.pict.AppData.Manager && this.pict.AppData.Manager.Modules || [];
          if (tmpModules.length === 0) {
            return '<div style="color:var(--color-muted);font-style:italic">' + '(modules not yet loaded — close and reopen this dialog)</div>';
          }

          // Group by .Group, ordered to match RippleGraph's GROUP_ORDER.
          let tmpByGroup = {};
          for (let i = 0; i < tmpModules.length; i++) {
            let tmpM = tmpModules[i];
            let tmpG = tmpM.Group || 'Other';
            if (!tmpByGroup[tmpG]) {
              tmpByGroup[tmpG] = [];
            }
            tmpByGroup[tmpG].push(tmpM);
          }
          let tmpGroupNames = Object.keys(tmpByGroup);
          tmpGroupNames.sort((pA, pB) => {
            let tmpIa = GROUP_ORDER.indexOf(pA);
            let tmpIb = GROUP_ORDER.indexOf(pB);
            if (tmpIa === -1) {
              tmpIa = GROUP_ORDER.length;
            }
            if (tmpIb === -1) {
              tmpIb = GROUP_ORDER.length;
            }
            if (tmpIa !== tmpIb) {
              return tmpIa - tmpIb;
            }
            return pA.localeCompare(pB);
          });
          let tmpHtml = '';
          for (let i = 0; i < tmpGroupNames.length; i++) {
            let tmpGroup = tmpGroupNames[i];
            let tmpEntries = tmpByGroup[tmpGroup].slice().sort((pA, pB) => pA.Name.localeCompare(pB.Name));
            tmpHtml += '<div class="producer-group">';
            tmpHtml += '  <div class="producer-group-header">';
            tmpHtml += '    <span class="producer-group-name">' + this._escape(tmpGroup) + ' (' + tmpEntries.length + ')</span>';
            tmpHtml += '    <span class="producer-group-actions">';
            tmpHtml += '      <button type="button" data-group="' + this._escape(tmpGroup) + '" data-act="all">all</button>';
            tmpHtml += '      <button type="button" data-group="' + this._escape(tmpGroup) + '" data-act="none">none</button>';
            tmpHtml += '    </span>';
            tmpHtml += '  </div>';
            for (let j = 0; j < tmpEntries.length; j++) {
              let tmpEntry = tmpEntries[j];
              let tmpIsOrigin = tmpEntry.Name === pOrigin;
              let tmpId = 'RM-R-Mod-' + tmpEntry.Name.replace(/[^A-Za-z0-9_-]/g, '_');
              tmpHtml += '<div class="producer-row' + (tmpIsOrigin ? ' is-origin' : '') + '">';
              tmpHtml += '  <label for="' + tmpId + '">';
              tmpHtml += '    <input type="checkbox" id="' + tmpId + '"' + ' data-module="' + this._escape(tmpEntry.Name) + '"' + ' data-group="' + this._escape(tmpGroup) + '"' + (tmpIsOrigin ? ' checked' : '') + '>';
              tmpHtml += '    <span class="producer-name">' + this._escape(tmpEntry.Name) + '</span>';
              tmpHtml += '  </label>';
              tmpHtml += '</div>';
            }
            tmpHtml += '</div>';
          }
          return tmpHtml;
        }
        _escape(pText) {
          let tmpS = String(pText == null ? '' : pText);
          return tmpS.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
      }
      module.exports = ManagerModalRipplePlanView;
      module.exports.default_configuration = _ViewConfiguration;
    }, {
      "pict-view": 18
    }]
  }, {}, [21])(21);
});
//# sourceMappingURL=retold-manager.js.map
