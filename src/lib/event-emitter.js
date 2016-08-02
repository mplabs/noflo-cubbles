(function(context) {

  var EventEmitter = context.EventEmitter = function() {};

  EventEmitter.prototype.addListener = function(type, listener) {
    if (!isFunction(listener)) {
      throw TypeError('listener must be a function');
    }

    if (!this._events) {
      this._events = {};
    }

    if (!this._events[type]) {
      this._events[type] = listener;
    } else if (isArray(this._events[type])) {
      this._events[type].push(listener);
    } else {
      this._events[type] = [this._events[type], listener];
    }

    return this;
  }

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.removeListener = function(type, listener) {
    var idx;

    if (!isFunction(listener)) {
      throw TypeError('listener must be a function');
    }

    if (!this._events || !this._events[type]) {
      return this;
    }

    if (this._events[type] === listener) {
      delete this._events[type];
    } else if (isArray(this._events[type])) {
      idx = this._events[type].indexOf(listener);
      if (-1 !== idx) {
        this._events[type].splice(idx, 1);
      }
      if (this._events[type].length === 1) {
        this._events[type] = this._events[type].pop();
      } else if (this._events[type].length === 0) {
        delete this._events[type];
      }
    }  

    return this;
  }

  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

  var nativeIsArray = Array.isArray;

  var isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  }

  var isObject = function(obj) {
    var type = typeof obj;
    return 'function' === type || 'object' === type || !!obj;
  }

  var isFunction = function(obj) {
    return typeof obj == 'function' || false;
  };
})(this);