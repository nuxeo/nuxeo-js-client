'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _base = require('../base');

var _base2 = _interopRequireDefault(_base);

var _events = require('events');

var _fetch = require('../deps/fetch');

var _fetch2 = _interopRequireDefault(_fetch);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _queue = require('queue');

var _queue2 = _interopRequireDefault(_queue);

var _promise = require('../deps/promise');

var _promise2 = _interopRequireDefault(_promise);

var _blob = require('./blob');

var _blob2 = _interopRequireDefault(_blob);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DEFAULT_OPTS = {
  concurrency: 5,
  operationId: undefined,
  automationParams: {
    params: {},
    context: {},
    input: undefined
  }
};

var BatchUpload = function (_Base) {
  _inherits(BatchUpload, _Base);

  function BatchUpload() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, BatchUpload);

    var options = (0, _extend2.default)(true, {}, DEFAULT_OPTS, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(BatchUpload).call(this, options));

    _this._operationId = options.operationId;
    _this._automationParams = options.automationParams;
    _this._url = (0, _join2.default)(options.url, 'upload/');
    _this._nuxeo = options.nuxeo;
    _this._emitter = new _events.EventEmitter();
    _this._uploadIndex = 0;
    _this._queue = (0, _queue2.default)({
      concurrency: options.concurrency
    });
    _this._batchIdPromise = null;
    _this._batchId = null;
    return _this;
  }

  _createClass(BatchUpload, [{
    key: 'on',
    value: function on() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      this._emitter.on.apply(this._emitter, args);
      return this;
    }
  }, {
    key: '_emit',
    value: function _emit() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      this._emitter.emit.apply(this._emitter, args);
      return this;
    }
  }, {
    key: 'cancel',
    value: function cancel(opts) {
      var _this2 = this;

      if (!this._batchIdPromise) {
        this._emit('batchUploadCancelled', this);
      } else {
        (function () {
          var path = (0, _join2.default)('upload', _this2._batchId);
          _this2._batchIdPromise.then(function () {
            _this2._nuxeo.request(path).timeout(_this2._timeout).httpTimeout(_this2._httpTimeout).transactionTimeout(_this2._transactionTimeout).auth(_this2._auth).delete(opts).then(function () {
              _this2._batchIdPromise = null;
              _this2._batchId = null;
              _this2._emit('batchUploadCancelled', _this2);
            }).catch(function (error) {
              return _this2._emit('batchUploadError', error, _this2);
            });
          }).catch(function (error) {
            return _this2._emit('batchUploadError', error, _this2);
          });
        })();
      }
    }
  }, {
    key: 'upload',
    value: function upload(blob, opts) {
      var _this3 = this;

      var uploadIndex = this._uploadIndex++;
      this._queue.push(this._uploadJob.bind(this, blob, uploadIndex, opts));
      this._start();

      return new _promise2.default(function (resolve, reject) {
        _this3._batchIdPromise.then(function () {
          resolve(new _blob2.default({
            batchId: _this3._batchId,
            index: uploadIndex
          }));
        }).catch(function (error) {
          return reject(error);
        });
      });
    }
  }, {
    key: '_start',
    value: function _start() {
      var _this4 = this;

      if (!this._batchIdPromise) {
        this._batchIdPromise = this._fetchBatchId();
      }

      this._batchIdPromise.then(function () {
        if (!_this4._queue.running) {
          _this4._emit('batchUploadStarted', _this4);
          _this4._queue.start(function (error) {
            if (error) {
              _this4._emit('batchUploadError', error, _this4);
              return;
            }
            _this4._emit('batchUploadFinished', _this4);
          });
        }
      }).catch(function (error) {
        _this4._emit('batchUploadError', error, _this4);
      });
    }
  }, {
    key: '_fetchBatchId',
    value: function _fetchBatchId() {
      var _this5 = this;

      var opts = {
        method: 'POST',
        url: this._url,
        headers: this._headers,
        timeout: this._timeout,
        transactionTimeout: this._transactionTimeout,
        httpTimeout: this._httpTimeout,
        auth: this._auth
      };

      return new _promise2.default(function (resolve, reject) {
        if (_this5._batchId) {
          return resolve(_this5);
        }

        (0, _fetch2.default)(opts).then(function (res) {
          _this5._batchId = res.batchId;
          return resolve(_this5);
        }).catch(function (error) {
          return reject(error);
        });
      });
    }
  }, {
    key: '_uploadJob',
    value: function _uploadJob(blob, uploadIndex, opts, callback) {
      var _this6 = this;

      this._emit('blobUploadStarted', this, blob, uploadIndex, opts);
      this._upload(blob, uploadIndex, opts).then(function (res) {
        res.json().then(function (json) {
          _this6._emit('blobUploadFinished', _this6, json, blob, uploadIndex, opts);
          callback(null, json);
        });
      }).catch(function (error) {
        _this6._emit('blobUploadError', error, _this6, blob, uploadIndex, opts);
        callback(error);
      });
    }
  }, {
    key: '_upload',
    value: function _upload(blob, uploadIndex, opts) {
      var finalOptions = {
        json: false,
        resolveWithFullResponse: true,
        method: 'POST',
        url: (0, _join2.default)(this._url, this._batchId, uploadIndex),
        body: blob.content,
        headers: {
          'Cache-Control': 'no-cache',
          'X-File-Name': encodeURIComponent(blob.name),
          'X-File-Size': blob.size,
          'X-File-Type': blob.mimeType,
          'Content-Length': blob.size
        },
        timeout: this._timeout,
        httpTimeout: this._httpTimeout,
        transactionTimeout: this._transactionTimeout,
        auth: this._auth
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);

      return (0, _fetch2.default)(finalOptions);
    }
  }, {
    key: 'getBlob',
    value: function getBlob(index, opts) {
      var _this7 = this;

      return new _promise2.default(function (resolve, reject) {
        if (!_this7._batchId) {
          return reject(new Error('No \'batchId\' set'));
        }

        var finalOptions = {
          method: 'GET',
          url: (0, _join2.default)(_this7._url, _this7._batchId, index),
          timeout: _this7._timeout,
          httpTimeout: _this7._httpTimeout,
          transactionTimeout: _this7._transactionTimeout,
          auth: _this7._auth
        };
        finalOptions = (0, _extend2.default)(true, finalOptions, opts);

        (0, _fetch2.default)(finalOptions).then(function (res) {
          res.batchId = _this7._batchId;
          res.index = index;
          resolve(new _blob2.default(res));
        }).catch(function (error) {
          return reject(error);
        });
      });
    }
  }, {
    key: 'getBlobs',
    value: function getBlobs(opts) {
      var _this8 = this;

      return new _promise2.default(function (resolve, reject) {
        if (!_this8._batchId) {
          return reject(new Error('No \'batchId\' set'));
        }

        var finalOptions = {
          method: 'GET',
          url: (0, _join2.default)(_this8._url, _this8._batchId),
          timeout: _this8._timeout,
          httpTimeout: _this8._httpTimeout,
          transactionTimeout: _this8._transactionTimeout,
          auth: _this8._auth
        };
        finalOptions = (0, _extend2.default)(true, finalOptions, opts);

        (0, _fetch2.default)(finalOptions).then(function (blobs) {
          var batchBlobs = blobs.map(function (blob, index) {
            blob.batchId = _this8._batchId;
            blob.index = index;
            return new _blob2.default(blob);
          });
          resolve(batchBlobs);
        }).catch(function (error) {
          return reject(error);
        });
      });
    }
  }]);

  return BatchUpload;
}(_base2.default);

exports.default = BatchUpload;
module.exports = exports['default'];