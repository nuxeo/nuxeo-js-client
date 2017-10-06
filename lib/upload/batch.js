const extend = require('extend');
const Base = require('../base');
const join = require('../deps/utils/join');
const flatten = require('../deps/utils/flatten');
const Queue = require('promise-queue');
const BatchBlob = require('./blob');

const DEFAULT_OPTS = {
  concurrency: 5,
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
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * var batch = nuxeo.batchUpload();
 * var nuxeoBlob = new Nuxeo.Blob(...);
 * batch.upload(nuxeoBlob)
 *   .then(function(res) {
 *     // res.blob instanceof BatchBlob === true
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class BatchUpload extends Base {
  /**
   * Creates a BatchUpload.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this BatchUpload object.
   * @param {Number} [opts.concurrency=5] - Number of concurrent uploads.
   */
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    super(options);
    this._url = join(options.url, 'upload/');
    this._nuxeo = options.nuxeo;
    this._uploadIndex = 0;
    Queue.configure(this._nuxeo.Promise);
    this._queue = new Queue(options.concurrency, Infinity);
    this._batchIdPromise = null;
    this._batchId = null;
    this._promises = [];
  }

  /**
   * Upload one or more blobs.
   * @param {...Blob} blobs - Blobs to be uploaded.
   * @returns {Promise} A Promise object resolved when all blobs are uploaded.
   *
   * @example
   * ...
   * nuxeoBatch.upload(blob1, blob2, blob3)
   *   .then(function(res) {
   *     // res.batch === nuxeoBatch
   *     // res.blobs[0] is the BatchBlob object related to blob1
   *     // res.blobs[1] is the BatchBlob object related to blob2
   *     // res.blobs[2] is the BatchBlob object related to blob3
   *   })
   *   .catch(function(error) {
   *     throw new Error(error);
   *   });
   */
  upload(...blobs) {
    const allBlobs = flatten(blobs);
    const promises = allBlobs.map((blob) => {
      const promise = this._queue.add(this._upload.bind(this, blob));
      this._promises.push(promise);
      return promise;
    });
    if (promises.length === 1) {
      return promises[0];
    }

    const Promise = this._nuxeo.Promise;
    return Promise.all(promises).then((batchBlobs) => {
      return {
        blobs: batchBlobs.map((batchBlob) => batchBlob.blob),
        batch: this,
      };
    });
  }

  _upload(blob) {
    if (!this._batchIdPromise) {
      this._batchIdPromise = this._fetchBatchId();
    }

    const uploadIndex = this._uploadIndex;
    this._uploadIndex += 1;
    return this._batchIdPromise.then(() => {
      const opts = {
        json: false,
        method: 'POST',
        url: join(this._url, this._batchId, uploadIndex),
        body: blob.content,
        headers: {
          'Cache-Control': 'no-cache',
          'X-File-Name': encodeURIComponent(blob.name),
          'X-File-Size': blob.size,
          'X-File-Type': blob.mimeType,
          'Content-Length': blob.size,
        },
      };
      const options = this._computeOptions(opts);
      return this._nuxeo.http(options);
    }).then((res) => {
      res.batchId = this._batchId;
      res.index = uploadIndex;
      return {
        blob: new BatchBlob(res),
        batch: this,
      };
    });
  }

  _fetchBatchId() {
    const opts = {
      method: 'POST',
      url: this._url,
    };

    const Promise = this._nuxeo.Promise;
    if (this._batchId) {
      return Promise.resolve(this);
    }
    const options = this._computeOptions(opts);
    return this._nuxeo.http(options).then((res) => {
      this._batchId = res.batchId;
      return this;
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
   * nuxeoBatch.done()
   *   .then(function(res) {
   *     // res.batch === nuxeoBatch
   *     // res.blobs[0] is the BatchBlob object related to blob1
   *     // res.blobs[1] is the BatchBlob object related to blob2
   *     // res.blobs[2] is the BatchBlob object related to blob3
   *   })
   *   .catch(function(error) {
   *     throw new Error(error);
   *   });
   */
  done() {
    const Promise = this._nuxeo.Promise;
    return Promise.all(this._promises).then((batchBlobs) => {
      return {
        blobs: batchBlobs.map((batchBlob) => batchBlob.blob),
        batch: this,
      };
    });
  }

  /**
   * Returns whether the BatchUpload is finished, ie. has uploads running, or not.
   * @returns {Boolean} true if the BatchUpload is finished, false otherwise.
   */
  isFinished() {
    return this._queue.getQueueLength() === 0 && this._queue.getPendingLength() === 0;
  }

  /**
   * Cancels a BatchUpload.
   * @returns {Promise} A Promise object resolved with the BatchUpload itself.
   */
  cancel(opts) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchIdPromise) {
      return Promise.resolve(this);
    }

    const path = join('upload', this._batchId);
    return this._batchIdPromise.then(() => {
      const options = this._computeOptions(opts);
      return this._nuxeo.request(path)
        .delete(options);
    }).then(() => {
      this._batchIdPromise = null;
      this._batchId = null;
      return this;
    });
  }

  /**
   * Fetches a blob at a given index from the batch.
   * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlob.
   */
  fetchBlob(index, opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchId) {
      return Promise.reject(new Error('No \'batchId\' set'));
    }

    let options = {
      method: 'GET',
      url: join(this._url, this._batchId, index),
    };
    options = extend(true, options, opts);
    options = this._computeOptions(options);
    return this._nuxeo.http(options).then((res) => {
      res.batchId = this._batchId;
      res.index = index;
      return {
        batch: this,
        blob: new BatchBlob(res),
      };
    });
  }

  /**
   * Removes a blob at a given index from the batch.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  removeBlob(index, opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchId) {
      return Promise.reject(new Error('No \'batchId\' set'));
    }

    let options = {
      method: 'DELETE',
      url: join(this._url, this._batchId, index),
    };
    options = extend(true, options, opts);
    options = this._computeOptions(options);
    return this._nuxeo.http(options);
  }

  /**
   * Fetches the blobs from the batch.
   * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlobs.
   */
  fetchBlobs(opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchId) {
      return Promise.reject(new Error('No \'batchId\' set'));
    }

    let options = {
      method: 'GET',
      url: join(this._url, this._batchId),
    };
    options = extend(true, options, opts);
    options = this._computeOptions(options);
    return this._nuxeo.http(options).then((blobs) => {
      const batchBlobs = blobs.map((blob, index) => {
        blob.batchId = this._batchId;
        blob.index = index;
        return new BatchBlob(blob);
      });
      return {
        batch: this,
        blobs: batchBlobs,
      };
    });
  }
}

module.exports = BatchUpload;
