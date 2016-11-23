'use strict';

const extend = require('extend');

/**
 * The `BatchBlob` class wraps a blob uploaded through a {@link BatchUpload} to be used
 * in an {@link Operation} input or as a property value on a {@link Document}.
 */
class BatchBlob {
  constructor(data = {}) {
    this['upload-batch'] = data.batchId;
    this['upload-fileId'] = '' + data.index;
    delete data.batchId;
    delete data.index;
    extend(this, data);
  }
}

module.exports = BatchBlob;
