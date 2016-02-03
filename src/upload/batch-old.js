'use strict';

import extend from 'extend';
import Base from '../base';
import { EventEmitter } from 'events';
import fetch from '../deps/fetch';
import join from '../deps/utils/join';
import queue from 'queue';
import Promise from '../deps/promise';
import BatchBlob from './blob';

const DEFAULT_OPTS = {
  concurrency: 5,
  operationId: undefined,
  automationParams: {
    params: {},
    context: {},
    input: undefined,
  },
};

export default class BatchUpload extends Base {
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    super(options);
    this._operationId = options.operationId;
    this._automationParams = options.automationParams;
    this._url = join(options.url, 'upload/');
    this._nuxeo = options.nuxeo;
    this._emitter = new EventEmitter();
    this._uploadIndex = 0;
    this._queue = queue({
      concurrency: options.concurrency,
    });
    this._batchIdPromise = null;
    this._batchId = null;
  }

  on(...args) {
    this._emitter.on.apply(this._emitter, args);
    return this;
  }

  _emit(...args) {
    this._emitter.emit.apply(this._emitter, args);
    return this;
  }

  cancel(opts) {
    if (!this._batchIdPromise) {
      this._emit('batchUploadCancelled', this);
    } else {
      const path = join('upload', this._batchId);
      this._batchIdPromise.then(() => {
        this._nuxeo.request(path)
          .timeout(this._timeout)
          .httpTimeout(this._httpTimeout)
          .transactionTimeout(this._transactionTimeout)
          .auth(this._auth)
          .delete(opts)
          .then(() => {
            this._batchIdPromise = null;
            this._batchId = null;
            this._emit('batchUploadCancelled', this);
          }).catch(error => this._emit('batchUploadError', error, this));
      }).catch(error => this._emit('batchUploadError', error, this));
    }
  }

  upload(blob, opts) {
    const uploadIndex = this._uploadIndex++;
    this._queue.push(this._uploadJob.bind(this, blob, uploadIndex, opts));
    this._start();

    return new Promise((resolve, reject) => {
      this._batchIdPromise.then(() => {
        resolve(new BatchBlob({
          batchId: this._batchId,
          index: uploadIndex,
        }));
      }).catch(error => reject(error));
    });
  }

  _start() {
    if (!this._batchIdPromise) {
      this._batchIdPromise = this._fetchBatchId();
    }

    this._batchIdPromise.then(() => {
      if (!this._queue.running) {
        this._emit('batchUploadStarted', this);
        this._queue.start((error) => {
          if (error) {
            this._emit('batchUploadError', error, this);
            return;
          }
          this._emit('batchUploadFinished', this);
        });
      }
    }).catch((error) => {
      this._emit('batchUploadError', error, this);
    });
  }

  _fetchBatchId() {
    const opts = {
      method: 'POST',
      url: this._url,
      headers: this._headers,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
      auth: this._auth,
    };

    return new Promise((resolve, reject) => {
      if (this._batchId) {
        return resolve(this);
      }

      fetch(opts).then((res) => {
        this._batchId = res.batchId;
        return resolve(this);
      }).catch((error) => {
        return reject(error);
      });
    });
  }

  _uploadJob(blob, uploadIndex, opts, callback) {
    this._emit('blobUploadStarted', this, blob, uploadIndex, opts);
    this._upload(blob, uploadIndex, opts).then((res) => {
      res.json().then((json) => {
        this._emit('blobUploadFinished', this, json, blob, uploadIndex, opts);
        callback(null, json);
      });
    }).catch((error) => {
      this._emit('blobUploadError', error, this, blob, uploadIndex, opts);
      callback(error);
    });
  }

  _upload(blob, uploadIndex, opts) {
    let finalOptions = {
      json: false,
      resolveWithFullResponse: true,
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
      timeout: this._timeout,
      httpTimeout: this._httpTimeout,
      transactionTimeout: this._transactionTimeout,
      auth: this._auth,
    };
    finalOptions = extend(true, finalOptions, opts);

    return fetch(finalOptions);
  }

  getBlob(index, opts) {
    return new Promise((resolve, reject) => {
      if (!this._batchId) {
        return reject(new Error('No \'batchId\' set'));
      }

      let finalOptions = {
        method: 'GET',
        url: join(this._url, this._batchId, index),
        timeout: this._timeout,
        httpTimeout: this._httpTimeout,
        transactionTimeout: this._transactionTimeout,
        auth: this._auth,
      };
      finalOptions = extend(true, finalOptions, opts);

      fetch(finalOptions).then((res) => {
        res.batchId = this._batchId;
        res.index = index;
        resolve(new BatchBlob(res));
      }).catch(error => reject(error));
    });
  }

  getBlobs(opts) {
    return new Promise((resolve, reject) => {
      if (!this._batchId) {
        return reject(new Error('No \'batchId\' set'));
      }

      let finalOptions = {
        method: 'GET',
        url: join(this._url, this._batchId),
        timeout: this._timeout,
        httpTimeout: this._httpTimeout,
        transactionTimeout: this._transactionTimeout,
        auth: this._auth,
      };
      finalOptions = extend(true, finalOptions, opts);

      fetch(finalOptions).then((blobs) => {
        const batchBlobs = blobs.map((blob, index) => {
          blob.batchId = this._batchId;
          blob.index = index;
          return new BatchBlob(blob);
        });
        resolve(batchBlobs);
      }).catch(error => reject(error));
    });
  }
}
