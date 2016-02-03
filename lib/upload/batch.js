'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _base = require('../base');

var _base2 = _interopRequireDefault(_base);

var _fetch = require('../deps/fetch');

var _fetch2 = _interopRequireDefault(_fetch);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _promise = require('../deps/promise');

var _promise2 = _interopRequireDefault(_promise);

var _promiseQueue = require('promise-queue');

var _promiseQueue2 = _interopRequireDefault(_promiseQueue);

var _blob = require('./blob');

var _blob2 = _interopRequireDefault(_blob);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

_promiseQueue2.default.configure(_promise2.default);

var DEFAULT_OPTS = {
  concurrency: 5
};

/**
 * The **BatchUpload** class allows to upload {@link Blob} objets to a Nuxeo Platform instance
 * using the batch upload API.
 *
 * It creates and maintains a batch id from the Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseUrl: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * var batch = nuxeo.batchUpload();
 * var nuxeoBlob = new Nuxeo.Blob(...);
 * batch.upload(nuxeoBlob).then((res) => {
 *    // res.blob instanceof BatchBlob === true
 *  });
 */

var BatchUpload = function (_Base) {
  _inherits(BatchUpload, _Base);

  /**
   * Creates a BatchUpload.
   * @param {object} opts - The configuration options.
   * @param {Number} [opts.concurrency=5] - Number of concurrent uploads.
   */

  function BatchUpload() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, BatchUpload);

    var options = (0, _extend2.default)(true, {}, DEFAULT_OPTS, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(BatchUpload).call(this, options));

    _this._url = (0, _join2.default)(options.url, 'upload/');
    _this._nuxeo = options.nuxeo;
    _this._uploadIndex = 0;
    _this._queue = new _promiseQueue2.default(options.concurrency, Infinity);
    _this._batchIdPromise = null;
    _this._batchId = null;
    _this._promises = [];
    return _this;
  }

  /**
   * Upload one or more blobs.
   * @param {...Blob} blobs - Blobs to be uploaded.
   * @returns {Promise} A Promise object resolved when all blobs are uploaded.
   *
   * @example
   * ...
   * nuxeoBatch.upload(blob1, blob2, blob3).then((res) => {
   *   // res.batch === nuxeoBatch
   *   // res.blobs[0] is the BatchBlob object related to blob1
   *   // res.blobs[1] is the BatchBlob object related to blob2
   *   // res.blobs[2] is the BatchBlob object related to blob3
   * }).catch(error => throw new Error(error));
   */

  _createClass(BatchUpload, [{
    key: 'upload',
    value: function upload() {
      var _this2 = this;

      for (var _len = arguments.length, blobs = Array(_len), _key = 0; _key < _len; _key++) {
        blobs[_key] = arguments[_key];
      }

      var promises = blobs.map(function (blob) {
        var promise = _this2._queue.add(_this2._upload.bind(_this2, blob));
        _this2._promises.push(promise);
        return promise;
      });
      if (promises.length === 1) {
        return promises[0];
      }

      return new _promise2.default(function (resolve, reject) {
        _promise2.default.all(promises).then(function (batchBlobs) {
          return resolve({
            blobs: batchBlobs,
            batch: _this2
          });
        }).catch(function (error) {
          return reject(error);
        });
      });
    }
  }, {
    key: '_upload',
    value: function _upload(blob) {
      var _this3 = this;

      return new _promise2.default(function (resolve, reject) {
        if (!_this3._batchIdPromise) {
          _this3._batchIdPromise = _this3._fetchBatchId();
        }

        _this3._batchIdPromise.then(function () {
          var uploadIndex = _this3._uploadIndex++;
          var options = {
            json: false,
            method: 'POST',
            url: (0, _join2.default)(_this3._url, _this3._batchId, uploadIndex),
            body: blob.content,
            headers: {
              'Cache-Control': 'no-cache',
              'X-File-Name': encodeURIComponent(blob.name),
              'X-File-Size': blob.size,
              'X-File-Type': blob.mimeType,
              'Content-Length': blob.size
            },
            timeout: _this3._timeout,
            httpTimeout: _this3._httpTimeout,
            transactionTimeout: _this3._transactionTimeout,
            auth: _this3._auth
          };

          (0, _fetch2.default)(options).then(function (res) {
            res.batchId = _this3._batchId;
            res.index = uploadIndex;
            return resolve({
              blob: new _blob2.default(res),
              batch: _this3
            });
          }).catch(function (error) {
            return reject(error);
          });
        }).catch(function (error) {
          return reject(error);
        });
      });
    }
  }, {
    key: '_fetchBatchId',
    value: function _fetchBatchId() {
      var _this4 = this;

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
        if (_this4._batchId) {
          return resolve(_this4);
        }

        (0, _fetch2.default)(opts).then(function (res) {
          _this4._batchId = res.batchId;
          return resolve(_this4);
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Wait for all the current uploads to be finished. Note that it won't wait for uploads added after done() being call.
     * If an uploaded is added, you should call again done().
     * The {@link BatchUpload#isFinished} method can be used to know if the batch is finished.
     * @returns {Promise} A Promise object resolved when all the current uploads are finished.
     *
     * @example
     * ...
     * nuxeoBatch.upload(blob1, blob2, blob3);
     *  nuxeoBatch.done().then((res) => {
     *   // res.batch === nuxeoBatch
     *   // res.blobs[0] is the BatchBlob object related to blob1
     *   // res.blobs[1] is the BatchBlob object related to blob2
     *   // res.blobs[2] is the BatchBlob object related to blob3
     * }).catch(error => throw new Error(error));
     */

  }, {
    key: 'done',
    value: function done() {
      var _this5 = this;

      return new _promise2.default(function (resolve, reject) {
        _promise2.default.all(_this5._promises).then(function (batchBlobs) {
          return resolve({
            blobs: batchBlobs,
            batch: _this5
          });
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Returns weither the BatchUpload is finished, ie. has uploads running, or not.
     * @returns {Boolean} true if the BatchUpload is finished, false otherwise.
     */

  }, {
    key: 'isFinished',
    value: function isFinished() {
      return this._queue.getQueueLength() === 0 && this._queue.getPendingLength() === 0;
    }

    /**
     * Cancels a BatchUpload.
     * @returns {Promise} A Promise object resolved with the BatchUpload itself.
     */

  }, {
    key: 'cancel',
    value: function cancel(opts) {
      var _this6 = this;

      if (!this._batchIdPromise) {
        return _promise2.default.resolve(this);
      }

      return new _promise2.default(function (resolve, reject) {
        var path = (0, _join2.default)('upload', _this6._batchId);
        _this6._batchIdPromise.then(function () {
          _this6._nuxeo.request(path).timeout(_this6._timeout).httpTimeout(_this6._httpTimeout).transactionTimeout(_this6._transactionTimeout).auth(_this6._auth).delete(opts).then(function () {
            _this6._batchIdPromise = null;
            _this6._batchId = null;
            return resolve(_this6);
          }).catch(function (error) {
            return reject(error);
          });
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Fetch a blob at a given index from the batch.
     * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlob.
     */

  }, {
    key: 'fetchBlob',
    value: function fetchBlob(index, opts) {
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
          return resolve({
            batch: _this7,
            blob: new _blob2.default(res)
          });
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Fetch the blobs from the batch.
     * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlobs.
     */

  }, {
    key: 'fetchBlobs',
    value: function fetchBlobs(opts) {
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
          return resolve({
            batch: _this8,
            blobs: batchBlobs
          });
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