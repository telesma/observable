(function (root) {
	"use strict";
	function Observable(obj) {
		if(obj !== undefined && (typeof obj !== 'object' || !obj)) {
			throw new TypeError('Value must be undefined or object');
		}
		this.obj = obj || {};
		this._watchers = [];
	}

	/**
	 * Get an object value based on keyPath
	 * @param {string} keyPath Path to a value i.e. "hello" or "hello.world.mine"
	 * @param {boolean} loose Do not throw errors, return undefined instead
	 * @returns {*}
	 */
	Observable.prototype.get = function (keyPath, loose) {
		if (!keyPath) {
			return this.obj;
		}
		var parts = keyPath.split('.');
		var val = this.obj;
		for (var i = 0; i < parts.length; i++) {
			if (!val) {
				if (loose) {
					return void 0;
				} else {
					throw new Error('Invalid keyPath: ' + keyPath);
				}
			}
			val = val[parts[i]];
		}
		return val;
	};

	/**
	 * Set an object value base on the keyPath
	 * @param {string} keyPath Path to a property i.e. "hello" or "hello.world.mine"
	 * @param {*} value
	 * @param {boolean} [silence] Do not notify subscribers
	 */
	Observable.prototype.set = function (keyPath, value, silence) {
		var i, parts, val, changed;
		if (!keyPath) {
			changed = true;
			this.obj = value;
		} else {
			parts = keyPath.split('.');
			val = this.obj;
			for (i = 0; i < parts.length; i++) {
				if (!val) {
					throw new Error('Invalid keyPath: ' + keyPath);
				}
				if (i === parts.length - 1) {
					var oldvalue;
					try {
						oldvalue = val[parts[i]];
					} catch (e) {}
					val[parts[i]] = value;
					changed = !deepCompare(value, oldvalue);
					break;
				}
				val = val[parts[i]];
			}
		}

		if (!silence && changed) {
			this.trigger(keyPath);
		}
	};

	Observable.prototype.trigger = function (keyPath) {
		for (var i = 0; i < this._watchers.length; i++) {
			if (!this._watchers[i].keyPath ||
				!keyPath ||
				this._watchers[i].keyPath === keyPath ||
				this._watchers[i].keyPath.match(new RegExp('^' + keyPath.replace('.', '\\.') + '\\..*?')) ||
				keyPath.match(new RegExp('^' + this._watchers[i].keyPath.replace('.', '\\.') + '\\..*?'))) {
				this._watchers[i].callback(this.get(this._watchers[i].keyPath, true), this._watchers[i].keyPath);
			}
		}
	};

	/**
	 * Call a callback every time a object property changes
	 * @param {string} keyPath Path to a property i.e. "hello" or "hello.world.mine"
	 * @param {function} callback Callback with signature function(value, keyPath) {}
	 */
	Observable.prototype.subscribe = function (keyPath, callback) {
		this._watchers.push({
			keyPath:  keyPath,
			callback: callback
		});
	};

	/**
	 * Remove a callback at a given keyPath, not specifying callback will remove all callbacks at the keyPath
	 * @param {string} keyPath Path to a property i.e. "hello" or "hello.world.mine"
	 * @param {function} callback
	 */
	Observable.prototype.unsubscribe = function (keyPath, callback) {
		for (var i = this._watchers.length - 1; i >= 0; i--) {
			if (this._watchers[i].keyPath === keyPath && (!callback || this._watchers[i].callback === callback)) {
				this._watchers.splice(i, 1);
			}
		}
	};

	/**
	 * Takes in an array or obj and create an Observable for each property
	 * @param obj
	 * @returns {*}
	 */
	Observable.toObservables = function(obj) {
		if(typeof obj !== 'object' || !obj) {
			throw new TypeError('Value must be an object');
		}
		for(var prop in obj) {
			if(obj.hasOwnProperty(prop)) {
				obj[prop] = new Observable(obj[prop]);
			}
		}
		return obj;
	};

	if (typeof module !== 'undefined' && typeof module.exports === 'object') {
        // CommonJS
        module.exports = Observable;
	} else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(Observable);
	} else {
		// Browser globals
		root.Observable = Observable;
	}

	function deepCompare () {
	    var i, l, leftChain, rightChain;

	    function compare2Objects (x, y) {
	        var p;

	        // remember that NaN === NaN returns false
	        // and isNaN(undefined) returns true
	        if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
	                 return true;
	        }

	        // Compare primitives and functions.
	        // Check if both arguments link to the same object.
	        // Especially useful on step when comparing prototypes
	        if (x === y) {
	                return true;
	        }

	        // Works in case when functions are created in constructor.
	        // Comparing dates is a common scenario. Another built-ins?
	        // We can even handle functions passed across iframes
	        if ((typeof x === 'function' && typeof y === 'function') ||
	             (x instanceof Date && y instanceof Date) ||
	             (x instanceof RegExp && y instanceof RegExp) ||
	             (x instanceof String && y instanceof String) ||
	             (x instanceof Number && y instanceof Number)) {
	                return x.toString() === y.toString();
	        }

	        // At last checking prototypes as good a we can
	        if (!(x instanceof Object && y instanceof Object)) {
	                return false;
	        }

	        if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
	                return false;
	        }

	        if (x.constructor !== y.constructor) {
	                return false;
	        }

	        if (x.prototype !== y.prototype) {
	                return false;
	        }

	        // Check for infinitive linking loops
	        if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
	                 return false;
	        }

	        // Quick checking of one object beeing a subset of another.
	        // todo: cache the structure of arguments[0] for performance
	        for (p in y) {
	                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
	                        return false;
	                }
	                else if (typeof y[p] !== typeof x[p]) {
	                        return false;
	                }
	        }

	        for (p in x) {
	                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
	                        return false;
	                }
	                else if (typeof y[p] !== typeof x[p]) {
	                        return false;
	                }

	                switch (typeof (x[p])) {
	                        case 'object':
	                        case 'function':

	                                leftChain.push(x);
	                                rightChain.push(y);

	                                if (!compare2Objects (x[p], y[p])) {
	                                        return false;
	                                }

	                                leftChain.pop();
	                                rightChain.pop();
	                                break;

	                        default:
	                                if (x[p] !== y[p]) {
	                                        return false;
	                                }
	                                break;
	                }
	        }

	        return true;
	    }

	    if (arguments.length < 1) {
	        return true; //Die silently? Don't know how to handle such case, please help...
	        // throw "Need two or more arguments to compare";
	    }

	    for (i = 1, l = arguments.length; i < l; i++) {

	            leftChain = []; //Todo: this can be cached
	            rightChain = [];

	            if (!compare2Objects(arguments[0], arguments[i])) {
	                    return false;
	            }
	    }

	    return true;
	}

})(this);
