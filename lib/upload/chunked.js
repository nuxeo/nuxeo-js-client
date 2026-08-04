const extend = require('extend');
const Queue = require('promise-queue');
const BatchUpload = require('./batch');
const BatchBlob = require('./blob');

const DEFAULT_OPTS = {
  chunked: {
    size: 1048576, // nginx default size limit
    concurrency: 8
  }
};
class ChunkedBatchUpload extends BatchUpload {
  chunked;
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    super(options);
    this.chunked = options.chunked;
  }

  async _upload(blob, onProgress) {
    if (!this.chunked) return super._upload(blob);

    if (!this._batchIdPromise) {
      this._batchIdPromise = this._fetchBatchId();
    }

    const uploadIndex = this._uploadIndex;
    this._uploadIndex += 1;

    await this._batchIdPromise();

    blob.content.controller = new AbortController();
    const { signal: abortSignal } = blob.content.controller;
    const errorController = new AbortController();
    const errorSignal = errorController.signal;

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
      }
    };

    const count = Math.ceil(blob.size / this.chunked.size);
    opts.headers['X-Upload-Type'] = 'chunked';
    opts.headers['X-Upload-Chunk-Count'] = count;

    const queue = new Queue(this.chunked.concurrency);
    let result;
    const checkSignals = () => {
      if (abortSignal.aborted) throw new Error('upload aborted');
      if (errorSignal.aborted) throw new Error('upload error');
    };
    const promises = Array.from({ length: count }, (_, k) => {
      const chunk = blob.content.slice(
        this.chunked.size * k,
        Math.min(blob.size, this.chunked.size * (k + 1))
      );
      const options = this._computeOptions({
        ...opts,
        body: chunk,
        headers: {
          ...opts.headers,
          'X-Upload-Chunk-Index': k,
          'Content-Length': chunk.size,
        },
      });
      return queue.add(async () => {
        checkSignals();
        let _result;
        try {
          _result = await this._nuxeo.http(options);
        } catch (e) {
          this.errorController.abort('error');
          throw e;
        }
        checkSignals();
        const progress = _result.uploadedChunkIds.length / _result.chunkCount;
        onProgress?.(uploadIndex, progress);
        if (progress === 1) result = _result;
      });
    });

    return Promise.all(promises).then(() => {
      result.batchId = this._batchId;
      result.index = uploadIndex;
      return {
        blob: new BatchBlob(result),
        batch: this
      };
    });
  }
}

module.exports = ChunkedBatchUpload;
