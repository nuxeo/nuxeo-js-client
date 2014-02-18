var extend = require('extend'),
  rest = require('restler');

function join() {
  var args = Array.prototype.slice.call(arguments);
  for(var i = args.length - 1; i >= 0; i--) {
    if(args[i] === null || args[i] === undefined || (typeof args[i] == 'string'  && args[i].length === 0)) {
      args.splice(i, 1);
    }
  }
  var joined = args.join('/');
  return joined.replace(/(^\/+)|([^:])\/\/+/g, '$2/');
}

rest.parsers.auto.matchers = {
  'application/json': rest.parsers.json,
  'application/json+nxentity': rest.parsers.json
};

var DEFAULT_CLIENT_OPTIONS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  restPath: 'site/api/v1/',
  automationPath: 'site/automation/',
  username: 'Administrator',
  password: 'Administrator',
  timeout: 3000
};

var Client = function(options) {
  options = extend(true, {}, DEFAULT_CLIENT_OPTIONS, options || {});
  this._baseURL = options.baseURL;
  this._restURL = join(this._baseURL, options.restPath, '/');
  this._automationURL = join(this._baseURL, options.automationPath, '/');
  this._username = options.username;
  this._password = options.password;
  this._repositoryName = options.repositoryName || 'default';
  this._schemas = options.schemas || [];
  this._headers = options.headers || {};
  this._timeout = options.timeout;
  this.connected = false;

  var self = this;
  var RestService = rest.service(function() {
    this.defaults.username = self._username;
    this.defaults.password = self._password;
  }, {
    baseURL: self._restURL
  });
  this._restService = new RestService();

  var AutomationService = rest.service(function() {
    this.defaults.username = self._username;
    this.defaults.password = self._password;
  }, {
    baseURL: self._automationURL
  });
  this._automationService = new AutomationService();
};

Client.prototype.connect = function(callback) {
  var self = this;
  rest.post(join(this._automationURL, 'login'), {
    username: this._username,
    password: this._password,
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data) {
    if (data instanceof Error) {
      callback(data, self)
    } else {
      try {
        if (data['entity-type'] === 'login' && data['username'] === self._username) {
          self.connected = true;
        } else {
          if (callback) {
            callback(data, self);
          }
        }
      } catch (e) {
        console.log(e);
        if (callback) {
          callback(data, self);
        }
      }
    }
  });
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
  rest.get(this._automationURL, {
    username: this._username,
    password: this._password,
    headers: {
      'Accept': 'application/json'
    }
  }).on('complete', function(data, response) {
    if (data instanceof Error) {
      console.log(data);
      if (callback) {
        callback(data, null, response);
      }
      return;
    }

    if (callback) {
      callback(null, data, response);
    }
  });
};

Client.prototype.operation =function(id) {
  return new Operation( {
    service: this._automationService,
    id: id,
    timeout: this._timeout,
    repositoryName: this._repositoryName,
    schemas: this._schemas,
    headers: this._headers
  });
};

Client.prototype.request = function(path) {
  return new Request({
    service: this._restService,
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


var Operation = function(options) {
  this._id = options.id;
  this._timeout = options.timeout;
  this._service = options.service;
  this._repositoryName = options.repositoryName;
  this._schemas = [].concat(options.schemas);
  this._headers = options.headers || {};
  this._automationParams = {
    params: {},
    context: {},
    input: undefined
  }
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
  options.method = 'post';
  options.parser = rest.parsers.auto;

  var headers = extend(true, {}, this._headers);
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
      params : this._automationParams.params,
      context : this._automationParams.context
    };
    options.multipart = true;
    options.data = {
      'params': JSON.stringify(automationParams),
      'file': this._automationParams.input
    }
  } else {
    options.data = JSON.stringify(this._automationParams);
  }

  var request = this._service.request(this._id, options);
  request.on('complete', function(data, response) {
    if (data instanceof Error) {
      console.log(typeof data);
      console.log(data);
      if (callback) {
        callback(data, null, response)
      }
    } else {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (callback) {
          callback(null, data, response)
        }
      } else {
        if (callback) {
          callback(data, null, response)
        }
      }
    }
  });
};


var Request = function(options) {
  this._path = options.path || '';
  this._service = options.service;
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
    method: 'get'
  });
  this.execute(options, callback);
}

Request.prototype.post = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }
  this.headers({ 'Content-Type': 'application/json' });
  if (options.data && typeof options.data !== 'string') {
    options.data = JSON.stringify(options.data);
  }
  options = extend(true, options, {
    method: 'post'
  });
  this.execute(options, callback);
};

Request.prototype.put = function(options, callback) {
  if (typeof options === 'function') {
    // no options
    callback = options;
    options = {};
  }
  this.headers({ 'Content-Type': 'application/json' });
  if (options.data && typeof options.data !== 'string') {
    options.data = JSON.stringify(options.data);
  }
  options = extend(true, options, {
    method: 'put'
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
    method: 'delete'
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
  options.method = options.method || 'get';
  options.parser = rest.parsers.auto;

  var headers = extend(true, {}, this._headers);
  headers['Accept'] = 'application/json';
  if (this._schemas.length > 0) {
    headers['X-NXDocumentProperties'] = this._schemas.join(',');
  }
  headers = extend(true, headers, options.headers || {});
  options.headers = headers;

  // stringify if needed
  if (options.headers['Content-Type'] === 'application/json') {
    if (options.data && typeof options.data === 'object') {
      options.data = JSON.stringify(options.data);
    }
  }

  // query params
  var query = extend(true, {}, this._query);
  query = extend(true, query, options.query || {});
  options.query = query;

  var path = '';
  if (this._repositoryName !== undefined) {
    path = join('repo', this._repositoryName);
  }
  path = join(path, this._path);

  var request = this._service.request(path, options);
  request.on('complete', function(data, response) {
    // for (var n in response) {
    //   console.log(n)
    // }
    if (data instanceof Error) {
      if (callback) {
        callback(data, null, response)
      }
    } else {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (callback) {
          callback(null, data, response)
        }
      } else {
        if (callback) {
          callback(data, null, response)
        }
      }
    }
  });
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
    if (data && typeof data === 'object'
      && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    callback(error, data,  response);
  });
};

Document.prototype.create = function(data, callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  if (this._adapter !== undefined) {
    path = join(path, '@bo', this._adapter, data.name);
  }
  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.post({ data: data }, function(error, data, response) {
    if (data && typeof data === 'object'
      && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    callback(error, data,  response);
  });
};

Document.prototype.update = function(data, callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  if (this._adapter !== undefined) {
    path = join(path, '@bo', this._adapter);
  }
  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.put({ data: data }, function(error, data, response) {
    if (data && typeof data === 'object'
      && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    callback(error, data,  response);
  });
};

Document.prototype.delete = function(callback) {
  var self = this;
  var path = this.uid !== undefined ? join('id', this.uid) : join('path', this.path);
  var request = this._client.request(path);
  request.timeout(this._timeout).schemas(this._schemas).headers(this._headers).repositoryName(this.repository);
  request.delete(function(error, data, response) {
    if (data && typeof data === 'object'
      && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    callback(error, data,  response);
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
    if (data !== undefined && typeof data === 'object'
      && data['entity-type'] === 'document') {
      data = self._client.document(data);
    }
    callback(error, data,  response);
  });
};

module.exports = {
  Client: Client
};
