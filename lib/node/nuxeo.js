var crypto = require('crypto'),
  extend = require('extend'),
  request = require('request'),
  mime = require('mime-types'),
  path = require('path'),
  Random = require("random-js"),
  FormData = require('form-data');

require('request').debug = false;


// override FormData#_multiPartHeader to make it work with Nuxeo Automation,
// until fixed on Nuxeo side.
FormData.prototype._multiPartHeader = function(field, value, options) {
  var boundary = this.getBoundary();
  var header = '';

  // custom header specified (as string)?
  // it becomes responsible for boundary
  // (e.g. to handle extra CRLFs on .NET servers)
  if (options.header != null) {
    header = options.header;
  } else {
    header += '--' + boundary + FormData.LINE_BREAK +
      'Content-Disposition: form-data; name="' + field + '"';

    // fs- and request- streams have path property
    // or use custom filename and/or contentType
    // TODO: Use request's response mime-type
    if (options.filename || value.path) {
      var filename = path.basename(options.filename || value.path);
      header +=
        '; filename="' + filename + '"' + "; filename*=UTF-8''" + encodeURIComponent(filename) + FormData.LINE_BREAK +
        'Content-Type: ' +  (options.contentType || mime.lookup(options.filename || value.path));

    // http response has not
    } else if (value.readable && value.hasOwnProperty('httpVersion')) {
      var filename = path.basename(value.client._httpMessage.path);
      header +=
        '; filename="' + filename + '"' + "; filename*=UTF-8''" + encodeURIComponent(filename) + FormData.LINE_BREAK +
        'Content-Type: ' + value.headers['content-type'];
    }

    header += FormData.LINE_BREAK + FormData.LINE_BREAK;
  }

  return header;
};
// done overriding


var random = Random.engines.mt19937().autoSeed(),
  nuxeoRequest = request.defaults({
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    json: true
  });

if (typeof(log) === 'undefined') {
  log = function() {};
}

function join() {
  var args = Array.prototype.slice.call(arguments);
  for (var i = args.length - 1; i >= 0; i--) {
    if (args[i] === null || args[i] === undefined || (typeof args[i] == 'string' && args[i].length === 0)) {
      args.splice(i, 1);
    }
  }
  var joined = args.join('/');
  return joined.replace(/(^\/+)|([^:])\/\/+/g, '$2/');
}

var DEFAULT_CLIENT_OPTIONS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  restPath: 'site/api/v1/',
  automationPath: 'site/api/v1/automation/',
  auth: {
    method: 'basic',
    username: 'Administrator',
    password: 'Administrator'
  },
  timeout: 30000
};

var auth = {
  proxy: {
    DEFAULT_HEADER_NAME: 'Auth-User'
  },
  portal: {
    TOKEN_SEPARATOR: ':',
    headerNames: {
      RANDOM: 'NX_RD',
      TIMESTAMP: 'NX_TS',
      TOKEN: 'NX_TOKEN',
      USER: 'NX_USER'
    }
  }
};

var Client = function(options) {
  options = extend(true, {}, DEFAULT_CLIENT_OPTIONS, options || {});
  this._baseURL = options.baseURL;
  this._restURL = join(this._baseURL, options.restPath, '/');
  this._automationURL = join(this._baseURL, options.automationPath, '/');
  this._auth = options.auth;
  this._repositoryName = options.repositoryName || 'default';
  this._schemas = options.schemas || [];
  this._headers = options.headers || {};
  this._timeout = options.timeout;
  this.connected = false;

  if (options.ca) {
    nuxeoRequest = nuxeoRequest.defaults({
      ca: options.ca
    });
  }
};

Client.prototype._computeAuthentication = function(headers) {
  switch (this._auth.method) {
    case 'basic':
      var auth = "Basic " + new Buffer(this._auth.username + ":" + this._auth.password).toString("base64");
      headers['Authorization'] = auth;
      break;

    case 'proxy':
      var proxyAuthHeaderName = this._auth.proxyAuthHeaderName || auth.proxy.DEFAULT_HEADER_NAME;
      headers[proxyAuthHeaderName] = this._auth.username;
      break;

    case 'portal':
      var date = new Date();
      var randomData = random();

      var clearToken = date.getTime() + auth.portal.TOKEN_SEPARATOR +
        randomData + auth.portal.TOKEN_SEPARATOR +
        this._auth.secret + auth.portal.TOKEN_SEPARATOR +
        this._auth.username;

      var base64hashedToken = crypto.createHash('md5')
        .update(clearToken, 'utf8').digest('base64');
      headers[auth.portal.headerNames.RANDOM] = randomData;
      headers[auth.portal.headerNames.TIMESTAMP] = date.getTime();
      headers[auth.portal.headerNames.TOKEN] = base64hashedToken;
      headers[auth.portal.headerNames.USER] = this._auth.username;
      break;
  }
  return headers;
};

Client.prototype.connect = function(callback) {
  var self = this;
  var options = {};
  var headers = extend(true, {}, this._headers);
  headers = this._computeAuthentication(headers);
  options.headers = headers;

  callback = callback || function() {};
  nuxeoRequest.post(join(this._automationURL, 'login'), options,
    function(err, res, body) {
      if (err) {
        callback(err, self);
      } else {
        if (body['entity-type'] === 'login'
          && body['username'] === self._auth.username) {
          self.connected = true;

        }
        callback(self.connected ? null : body, self);
      }
    }
  );
};

Client.prototype.header = function(name, value) {
  this._headers[name] = value;
  return this;
};

Client.prototype.headers = function(headers) {
  this._headers = extend(true, {}, this._headers, headers);
  return this;
};

Client.prototype.timeout = function(timeout) {
  this._timeout = timeout;
  return this;
};

Client.prototype.repositoryName = function(repositoryName) {
  this._repositoryName = repositoryName;
  return this;
};

Client.prototype.schema = function(schema) {
  this._schemas.push(schema);
  return this;
};

Client.prototype.schemas = function(schemas) {
  this._schemas.push.apply(this._schemas, schemas);
  return this;
};

Client.prototype.fetchOperationDefinitions = function(callback) {
  var options = {};
  var headers = extend(true, {}, this._headers);
  headers = this._computeAuthentication(headers);
  options.headers = headers;

  nuxeoRequest.get(this._automationURL, options,
    function(err, res, body) {
      if (callback) {
        callback(err ? err : null, err ? null : body, res);
      }
    }
  );
};

Client.prototype.operation = function(id) {
  return new Operation({
    client: this,
    url: this._automationURL,
    id: id,
    timeout: this._timeout,
    repositoryName: this._repositoryName,
    schemas: this._schemas,
    headers: this._headers
  });
};

Client.prototype.request = function(path) {
  return new Request({
    client: this,
    url: this._restURL,
    path: path,
    timeout: this._timeout,
    repositoryName: this._repositoryName,
    schemas: this._schemas,
    headers: this._headers
  });
};

Client.prototype.document = function(data) {
  return new Document({
    client: this,
    data: data,
    timeout: this._timeout,
    repositoryName: this._repositoryName,
    schemas: this._schemas,
    headers: this._headers
  });
};

Client.prototype.uploader = function(options) {
  options = extend(true, {}, options, {
    client: this,
    url: this._restURL,
    timeout: this._timeout,
    repositoryName: this._repositoryName,
    headers: this._headers
  });
  return new Uploader(options);
};

var Operation = function(options) {
  this._client = options.client;
  this._id = options.id;
  this._timeout = options.timeout;
  this._url = options.url;
  this._repositoryName = options.repositoryName;
  this._schemas = [].concat(options.schemas);
  this._headers = options.headers || {};
  this._automationParams = {
    params: {},
    context: {},
    input: undefined
  };
};

Operation.prototype.timeout = function(timeout) {
  this._timeout = timeout;
  return this;
};

Operation.prototype.header = function(name, value) {
  this._headers[name] = value;
  return this;
};

Operation.prototype.headers = function(headers) {
  this._headers = extend(true, {}, this._headers, headers);
  return this;
};

Operation.prototype.repositoryName = function(repositoryName) {
  this._repositoryName = repositoryName;
  return this;
};

Operation.prototype.schema = function(schema) {
  this._schemas.push(schema);
  return this;
};

Operation.prototype.schemas = function(schemas) {
  this._schemas.push.apply(this._schemas, schemas);
  return this;
};

Operation.prototype.param = function(name, value) {
  this._automationParams.params[name] = value;
  return this;
};

Operation.prototype.params = function(params) {
  this._automationParams.params = extend(true, {}, this._automationParams.params, params);
  return this;
};

Operation.prototype.context = function(context) {
  this._automationParams.context = context;
  return this;
};

Operation.prototype.input = function(input) {
  this._automationParams.input = input;
  return this;
};

Operation.prototype.execute = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }
  options = options || {};
  options.timeout = this._timeout;
  options.method = 'POST';

  var headers = extend(true, {}, this._headers);
  headers = this._client._computeAuthentication(headers);
  headers['Nuxeo-Transaction-Timeout'] = 5 + (this._timeout / 1000) | 0;
  if (this._schemas.length > 0) {
    headers['X-NXDocumentProperties'] = this._schemas.join(',');
  }
  if (this._repositoryName !== undefined) {
    headers['X-NXRepository'] = this._repositoryName;
  }
  headers['Content-Type'] = 'application/json+nxrequest';
  headers = extend(true, headers, options.headers || {});
  options.headers = headers;

  if (typeof this._automationParams.input === 'object') {
    // multipart
    var automationParams = {
      params: this._automationParams.params,
      context: this._automationParams.context
    };
    options.formData = {
      'params': JSON.stringify(automationParams),
      'file': this._automationParams.input
    };
  } else {
    options.body = this._automationParams;
  }

  callback = callback || function() {};
  nuxeoRequest.post(join(this._url, this._id), options,
    function(err, res, body) {
      if (err) {
        callback(err, null, res);
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        callback(null, body, res);
      } else {
        callback(body, null, res);
      }
    }
  );
};

Operation.prototype.uploader = function(options) {
  options = extend(true, {}, options, {
    client: this._client,
    operationId: this._id,
    url: this._client._restURL,
    timeout: this._timeout,
    repositoryName: this._repositoryName,
    headers: this._headers,
    automationParams: this._automationParams
  });
  if (!this._uploader) {
    this._uploader = new Uploader(options);
  }
  return this._uploader;
};


var Request = function(options) {
  this._client = options.client;
  this._path = options.path || '';
  this._url = options.url;
  this._timeout = options.timeout;
  this._repositoryName = options.repositoryName;
  this._schemas = [].concat(options.schemas);
  this._headers = options.headers || {};
  this._query = options.query || {};
};

Request.prototype.timeout = function(timeout) {
  this._timeout = timeout;
  return this;
};

Request.prototype.header = function(name, value) {
  this._headers[name] = value;
  return this;
};

Request.prototype.headers = function(headers) {
  this._headers = extend(true, {}, this._headers, headers);
  return this;
};

Request.prototype.repositoryName = function(repositoryName) {
  this._repositoryName = repositoryName;
  return this;
};

Request.prototype.schema = function(schema) {
  this._schemas.push(schema);
  return this;
};

Request.prototype.schemas = function(schemas) {
  this._schemas.push.apply(this._schemas, schemas);
  return this;
};

Request.prototype.query = function(query) {
  this._query = extend(true, {}, this._query, query);
  return this;
};

Request.prototype.path = function(path) {
  this._path = join(this._path, path);
  return this;
};

Request.prototype.get = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }
  options = extend(true, options, {
    method: 'GET'
  });
  this.execute(options, callback);
};

Request.prototype.post = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }

  options = extend(true, options, {
    method: 'POST'
  });
  this.execute(options, callback);
};

Request.prototype.put = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }

  options = extend(true, options, {
    method: 'PUT'
  });
  this.execute(options, callback);
};

Request.prototype.delete = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }

  options = extend(true, options, {
    method: 'DELETE'
  });
  this.execute(options, callback);
};

Request.prototype.execute = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }
  options = options || {};
  options.timeout = this._timeout;
  options.method = options.method || 'GET';

  var headers = extend(true, {}, this._headers);
  headers = this._client._computeAuthentication(headers);
  if (this._schemas.length > 0) {
    headers['X-NXDocumentProperties'] = this._schemas.join(',');
  }
  headers = extend(true, headers, options.headers || {});
  options.headers = headers;

  options.body = options.data;
  delete options.data;

  // query params
  var query = extend(true, {}, this._query);
  query = extend(true, query, options.query || {});
  options.qs = query;
  delete options.query;

  var path = this._url;
  if (this._repositoryName !== undefined) {
    path = join(path, 'repo', this._repositoryName);
  }
  path = join(path, this._path);

  nuxeoRequest(path, options,
    function(err, res, body) {
      if (err && callback) {
        callback(err, null, res);
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (callback) {
          callback(null, body, res);
        }
      } else {
        if (callback) {
          callback(body, null, res);
        }
      }
    }
  );
};


var Document = function(options) {
  this._client = options.client;
  this._timeout = options.timeout;
  this._repositoryName = options.repositoryName;
  this._schemas = [].concat(options.schemas);
  this._headers = options.headers || {};
  this.properties = {};
  this.dirtyProperties = {};

  var data = options.data;
  if (typeof data === 'string') {
    // id or path ref
    if (data.indexOf('/') === 0) {
      this.path = data;
    } else {
      this.uid = data;
    }
  } else if (typeof data === 'object') {
    // JSON doc
    extend(true, this, data);
  } else {
    // unsupported
    throw new Error();
  }
};

Document.prototype.timeout = function(timeout) {
  this._timeout = timeout;
  return this;
};

Document.prototype.header = function(name, value) {
  this._headers[name] = value;
  return this;
};

Document.prototype.headers = function(headers) {
  this._headers = extend(true, {}, this._headers, headers);
  return this;
};

Document.prototype.repositoryName = function(repositoryName) {
  this.repository = repositoryName;
  return this;
};

Document.prototype.schema = function(schema) {
  this._schemas.push(schema);
  return this;
};

Document.prototype.schemas = function(schemas) {
  this._schemas.push.apply(this._schemas, schemas);
  return this;
};

Document.prototype.adapter = function(adapter) {
  this._adapter = adapter;
  return this;
};

Document.prototype.set = function(properties) {
  this.dirtyProperties = extend(true, {}, this.dirtyProperties, properties);
  this.properties = extend(true, {}, this.properties, properties);
  return this;
};

Document.prototype.fetch = function(callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  if (this._adapter !== undefined) {
    path = join(path, '@bo', this._adapter);
  }
  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.get(function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.create = function(data, callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  if (this._adapter !== undefined) {
    path = join(path, '@bo', this._adapter, data.name);
  }

  if (!data['entity-type']) {
    data['entity-type'] = 'document';
  }

  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.post({
    data: data
  }, function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.copy = function(data, callback) {
  var self = this;
  var operation = this._client.operation('Document.Copy');
  operation.timeout(this._timeout).schemas(this._schemas).headers(this._headers)
    .repositoryName(this.repository)
    .input(this.uid).params(data);
  operation.execute(function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.move = function(data, callback) {
  var self = this;
  var operation = this._client.operation('Document.Move');
  operation.timeout(this._timeout).schemas(this._schemas).headers(this._headers)
    .repositoryName(this.repository)
    .input(this.uid).params(data);
  operation.execute(function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.update = function(data, callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  if (this._adapter !== undefined) {
    path = join(path, '@bo', this._adapter);
  }

  if (!data['entity-type']) {
    data['entity-type'] = 'document';
  }

  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.put({
    data: data
  }, function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.delete = function(callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.delete(function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.save = function(callback) {
  this.update({
    uid: this.uid,
    properties: this.dirtyProperties
  }, callback);
};

Document.prototype.children = function(callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  path = join(path, '@children');
  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.get(function(error, data, response) {
    if (data && typeof data === 'object' && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    if (callback) {
      callback(error, data, response);
    }
  });
};

Document.prototype.isFolder = function() {
  return this.facets.indexOf('Folderish') !== -1;
};

var DEFAULT_UPLOADER_OPTIONS = {
  numConcurrentUploads: 5,
  // define if upload should be triggered directly
  directUpload: true,
  // update upload speed every second
  uploadRateRefreshTime: 1000,
  batchStartedCallback: function(batchId) {},
  batchFinishedCallback: function(batchId) {},
  uploadStartedCallback: function(fileIndex, file) {},
  uploadFinishedCallback: function(fileIndex, file, time) {}
};


var Uploader = function(options) {
  options = extend(true, {}, DEFAULT_UPLOADER_OPTIONS, options || {});
  this._client = options.client;
  this._url = options.url;
  this._operationId = options.operationId;
  this._automationParams = {
    params: {},
    context: {},
    input: undefined
  };
  this._automationParams = extend(true, this._automationParams, options.automationParams || {});
  this._numConcurrentUploads = options.numConcurrentUploads;
  this._directUpload = options.directUpload;
  this._uploadRateRefreshTime = options.uploadRateRefreshTime;
  this._batchStartedCallback = options.batchStartedCallback;
  this._batchFinishedCallback = options.batchFinishedCallback;
  this._uploadStartedCallback = options.uploadStartedCallback;
  this._uploadFinishedCallback = options.uploadFinishedCallback;
  this._uploadProgressUpdatedCallback = options.uploadProgressUpdatedCallback;
  this._uploadSpeedUpdatedCallback = options.uploadSpeedUpdatedCallback;
  this._timeout = options.timeout;
  this._repositoryName = options.repositoryName;
  this._headers = options.headers || {};
  this._sendingRequestsInProgress = false;
  this._uploadStack = [];
  this._uploadIndex = 0;
  this._nbUploadInProgress = 0;
  this._completedUploads = [];

  this._initializingBatch = false;
  this._batchInitialized = false;
};

Uploader.prototype.timeout = function(timeout) {
  this._timeout = timeout;
  return this;
};

Uploader.prototype.header = function(name, value) {
  this._headers[name] = value;
  return this;
};

Uploader.prototype.headers = function(headers) {
  this._headers = extend(true, {}, this._headers, headers);
  return this;
};

Uploader.prototype.repositoryName = function(repositoryName) {
  this._repositoryName = repositoryName;
  return this;
};

Uploader.prototype.uploadFile = function(file, options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }

  file.fileName = path.basename(options.name || file.path);
  file.fileMimeType = options.mimeType || mime.lookup(file.fileName);
  file.fileSize = options.size;

  if (callback) {
    file.callback = callback;
  }
  this._uploadStack.push(file);
  if (this._directUpload && !this._sendingRequestsInProgress) {
    this.uploadFiles();
  }
};

Uploader.prototype.uploadFiles = function() {
  if (this._nbUploadInProgress >= this._numConcurrentUploads) {
    this._sendingRequestsInProgress = false;
    log('delaying upload for next file(s) ' + this._uploadIndex + '+ since there are already ' + this._nbUploadInProgress + ' active uploads');
    return;
  }

  if (!this._batchInitialized && !this._initializingBatch) {
    this._initializingBatch = true;

    var options = {};
    options.timeout = this._timeout;
    var headers = extend(true, {}, this._headers);
    headers = this._client._computeAuthentication(headers);
    headers['Nuxeo-Transaction-Timeout'] = 5 + (this._timeout / 1000) | 0;
    if (this._repositoryName !== undefined) {
      headers['X-NXRepository'] = this._repositoryName;
    }
    options.headers = headers;

    var self = this;
    nuxeoRequest.post(join(this._url, 'upload'), options,
      function(err, res, body) {
        if (err) {
          log('Unable to create batch: ' + body);
          return;
        }

        self._batchId = body.batchId;
        self._batchInitialized = true;
        self._doUploadFiles();
      }
    );
  } else if (this._batchInitialized) {
    this._doUploadFiles();
  }
};

Uploader.prototype._doUploadFiles = function() {
  var self = this;

  this._batchStartedCallback(this._batchId);

  this._sendingRequestsInProgress = true;
  while (this._uploadStack.length > 0) {
    var file = this._uploadStack.shift();
    file.fileIndex = this._uploadIndex + 0;
    file.downloadStartTime = new Date().getTime();

    var options = {};
    options.timeout = this._timeout;

    var headers = extend(true, {}, this._headers);
    headers = this._client._computeAuthentication(headers);
    headers['Nuxeo-Transaction-Timeout'] = 5 + (this._timeout / 1000) | 0;
    if (this._repositoryName !== undefined) {
      headers['X-NXRepository'] = this._repositoryName;
    }
    headers['Cache-Control'] = 'no-cache';
    headers['X-File-Name'] = encodeURIComponent(file.fileName);
    headers['X-File-Size'] = file.fileSize;
    headers['X-File-Type'] = file.fileMimeType;
    headers = extend(true, headers, options.headers || {});
    options.headers = headers;

    log('starting upload for file ' + this._uploadIndex);

    file.pipe(nuxeoRequest.post(join(this._url, 'upload', self._batchId, self._uploadIndex), options,
      function(err, res, body) {
        if (err) {
          log('Upload failed, status: ' + body);
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          log('Received loaded event on  file ' + file.fileIndex);
          if (self._completedUploads.indexOf(file.fileIndex) < 0) {
            self._completedUploads.push(file.fileIndex);
          } else {
            log('Event already processed for file ' + file.fileIndex + ', exiting');
            return;
          }
          var now = new Date().getTime();
          var timeDiff = now - file.downloadStartTime;
          self._uploadFinishedCallback(file.fileIndex, file,
            timeDiff);
          log('upload of file ' + file.fileIndex + ' completed');
          if (file.callback) {
            file.callback(file.fileIndex, file,
              timeDiff);
          }
          self._nbUploadInProgress--;
          if (!self._sendingRequestsInProgress && self._uploadStack.length > 0 && self._nbUploadInProgress < self._numConcurrentUploads) {
            // restart upload
            log('restart pending uploads');
            self.uploadFiles();
          } else if (self._nbUploadInProgress === 0) {
            self._batchFinishedCallback(self.batchId);
          }
        } else {
          log('Upload failed, status: ' + body);
        }
      }
    ));

    this._nbUploadInProgress++;
    this._uploadStartedCallback(this._uploadIndex, file);
    this._uploadIndex++;

    if (this._nbUploadInProgress >= this._numConcurrentUploads) {
      this._sendingRequestsInProgress = false;
      log('delaying upload for next file(s) ' + this._uploadIndex + '+ since there are already ' + this._nbUploadInProgress + ' active uploads');
      return;
    }
  }
  this._sendingRequestsInProgress = false;
};

Uploader.prototype.execute = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }
  options = options || {};
  options.timeout = this._timeout;

  var headers = extend(true, {}, this._headers);
  headers = this._client._computeAuthentication(headers);
  headers['Nuxeo-Transaction-Timeout'] = 5 + (this._timeout / 1000) | 0;
  if (this._repositoryName !== undefined) {
    headers['X-NXRepository'] = this._repositoryName;
  }
  headers['Content-Type'] = 'application/json+nxrequest';
  headers = extend(true, headers, options.headers || {});
  options.headers = headers;

  options.body = this._automationParams;

  callback = callback || function() {};
  nuxeoRequest.post(join(this._url, 'upload', this._batchId, 'execute', this._operationId), options,
    function(err, res, body) {
      if (err) {
        callback(err, null, res);
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        callback(null, body, res);
      } else {
        callback(body, null, res);
      }
    }
  );
};

module.exports = {
  Client: Client
};
