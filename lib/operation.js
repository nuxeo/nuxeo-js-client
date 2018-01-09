const extend = require('extend');
const Base = require('./base');
const join = require('./deps/utils/join');
const encodePath = require('./deps/utils/encodePath');
const Blob = require('./blob');
const BatchBlob = require('./upload/blob');
const BatchUpload = require('./upload/batch');
const Document = require('./document');
const FormData = require('./deps/form-data');

const isDocument = (obj) => (obj instanceof Document || (typeof obj === 'object' && obj['entity-type'] === 'document'));

/**
 * The `Operation` class allows to execute an operation on a Nuxeo Platform instance.
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
 * nuxeo.operation('Document.GetChild')
 *   .input('/default-domain')
 *   .params({
 *     name: 'workspaces',
 *   })
 *   .execute()
 *   .then(function(res) {
 *     // res.uid !== null
 *     // res.title === 'Workspaces'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Operation extends Base {
  /**
   * Creates an Operation.
   * @param {string} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this `Operation` object.
   * @param {string} opts.id - The ID of the operation.
   * @param {string} opts.url - The automation URL.
   */
  constructor(opts) {
    const options = extend(true, {}, opts);
    super(options);
    this._nuxeo = options.nuxeo;
    this._id = options.id;
    this._url = options.url;
    this._automationParams = {
      params: {},
      context: {},
      input: undefined,
    };
  }

  /**
   * Adds an operation param.
   * @param {string} name - The param name.
   * @param {string} value - The param value.
   * @returns {Operation} The operation itself.
   */
  param(name, value) {
    this._automationParams.params[name] = value;
    return this;
  }

  /**
   * Adds operation params. The given params are merged with the existing ones if any.
   * @param {object} params - The params to be merge with the existing ones.
   * @returns {Operation} The operation itself.
   */
  params(params) {
    this._automationParams.params = extend(true, {}, this._automationParams.params, params);
    return this;
  }

  /**
   * Sets this operation context.
   * @param {object} context - The operation context.
   * @returns {Operation} The operation itself.
   */
  context(context) {
    this._automationParams.context = context;
    return this;
  }

  /**
   * Sets this operation input.
   * @param {string|Array|Blob|BatchBlob|BatchUpload} input - The operation input.
   * @returns {Operation} The operation itself.
   */
  input(input) {
    this._automationParams.input = input;
    return this;
  }

  /**
   * Executes this operation.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the Operation.
   */
  execute(opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = this._computeContentTypeHeader(this._automationParams.input);
    const options = this._computeOptions(opts);
    let finalOptions = {
      method: 'POST',
      url: this._computeRequestURL(),
      body: this._computeRequestBody(),
    };
    finalOptions = extend(true, finalOptions, options);
    return this._nuxeo.http(finalOptions);
  }

  _computeContentTypeHeader(input) {
    let contentType = 'application/json+nxrequest';
    if (this._isMultipartInput(input)) {
      contentType = 'multipart/form-data';
    } else if (this._isBatchInput(input)) {
      contentType = 'application/json';
    }
    return contentType;
  }

  _computeRequestURL() {
    const input = this._automationParams.input;
    if (input instanceof BatchBlob) {
      return join(this._nuxeo._restURL, 'upload', input['upload-batch'], input['upload-fileId'], 'execute', this._id);
    } else if (input instanceof BatchUpload) {
      return join(this._nuxeo._restURL, 'upload', input._batchId, 'execute', this._id);
    }

    return join(this._url, encodePath(this._id));
  }

  _computeRequestBody() {
    const input = this._automationParams.input;
    if (this._isBatchInput(input)) {
      // no input needed
      const body = extend(true, {}, this._automationParams);
      body.input = undefined;
      return body;
    }

    if (input instanceof Array) {
      if (input.length > 0) {
        const first = input[0];
        if (isDocument(first)) {
          // assume document list
          const docs = input.map((doc) => doc.uid);
          this._automationParams.input = `docs:${docs.join(',')}`;
          return this._automationParams;
        } else if (typeof first === 'string') {
          // assume ref list
          this._automationParams.input = `docs:${input.join(',')}`;
          return this._automationParams;
        } else if (first instanceof Blob) {
          // blob list => multipart
          const automationParams = {
            params: this._automationParams.params,
            context: this._automationParams.context,
          };
          const form = new FormData();
          form.append('params', JSON.stringify(automationParams));

          let inputIndex = 0;
          // eslint-disable-next-line prefer-const
          for (let blob of input) {
            form.append(`input#${inputIndex}`, blob.content, blob.name);
            inputIndex += 1;
          }
          return form;
        }
      }
    } else if (isDocument(input)) {
      this._automationParams.input = input.uid;
      return this._automationParams;
    } else if (input instanceof Blob) {
      const automationParams = {
        params: this._automationParams.params,
        context: this._automationParams.context,
      };
      const form = new FormData();
      form.append('params', JSON.stringify(automationParams));
      form.append('input', input.content, input.name);
      return form;
    }
    return this._automationParams;
  }

  _isMultipartInput(input) {
    if (input instanceof Array) {
      if (input.length > 0) {
        const first = input[0];
        if (first instanceof Blob) {
          return true;
        }
      }
    } else if (input instanceof Blob) {
      return true;
    }
    return false;
  }

  _isBatchInput(input) {
    return input instanceof BatchUpload || input instanceof BatchBlob;
  }
}

module.exports = Operation;
