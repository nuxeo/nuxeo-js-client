var nuxeo = (function(nuxeo) {

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

  var DEFAULT_CLIENT_OPTIONS = {
    baseURL: '/nuxeo',
    restPath: 'site/api/v1',
    automationPath: 'site/automation',
    username: null,
    password: null,
    timeout: 3000
  };

  var Client = function(options) {
    options = jQuery.extend(true, {}, DEFAULT_CLIENT_OPTIONS, options || {});
    this._baseURL = options.baseURL;
    this._restURL = join(this._baseURL, options.restPath);
    this._automationURL = join(this._baseURL, options.automationPath);
    this._username = options.username;
    this._password = options.password;
    this._repositoryName = options.repositoryName || 'default';
    this._schemas = options.schemas || [];
    this._headers = options.headers || {};
    this._timeout = options.timeout;
    this.connected = false;
  };

  Client.prototype.connect = function(callback) {
    var self = this;
    jQuery.ajax({
      type: 'POST',
      url: join(this._automationURL, 'login'),
      username: this._username,
      password: this._password,

      headers: {
        'Accept': 'application/json'
      }
    })
      .done(function(data, textStatus, jqXHR) {
        if (data['entity-type'] === 'login' && data['username'] === self._username) {
          self.connected = true;
          if (callback) {
            callback(null, self)
          }
        } else {
          if (callback) {
            callback(data, self)
          }
        }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        if (callback) {
          callback(errorThrown, self)
        }
      });
  };
  Client.prototype.header = function(name, value) {
    this._headers[name] = value;
    return this;
  };

  Client.prototype.headers = function(headers) {
    this._headers = jQuery.extend(true, {}, this._headers, headers);
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
    jQuery.ajax({
      type: 'GET',
      url: this._automationURL,
      username: this._username,
      password: this._password,

      headers: {
        'Accept': 'application/json'
      }
    })
      .done(function (data, textStatus, jqXHR) {
        if (callback) {
          callback(null, data, jqXHR);
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (callback) {
          callback(errorThrown, null, jqXHR);
        }
      });
  };

  Client.prototype.operation = function(id) {
    return new Operation( {
      id: id,
      url: this._automationURL,
      timeout: this._timeout,
      repositoryName: this._repositoryName,
      schemas: this._schemas,
      headers: this._headers
    });
  };

  Client.prototype.request = function(path) {
    return new Request({
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

  nuxeo.Client = Client;


  var Operation = function(options) {
    this._id = options.id;
    this._url = options.url;
    this._timeout = options.timeout;
    this._repositoryName = options.repositoryName;
    this._schemas = [].concat(options.schemas);
    this._headers = options.headers || {};
    this._automationParams = {
      params: {},
      context: {},
      input: undefined
    };

    this.header('X-NXVoidOperation', false);
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
    this._headers = jQuery.extend(true, {}, this._headers, headers);
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
    this._automationParams.params = jQuery.extend(true, {}, this._automationParams.params, params);
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

  Operation.prototype.voidOperation = function(voidOperation) {
    this.header('X-NXVoidOperation', voidOperation);
    return this;
  };

  Operation.prototype.execute = function(options, callback) {
    function getOperationURL(url, operationId) {
      if (url.indexOf('/', url.length - 1) == -1) {
        url += '/';
      }
      url += operationId;
      return url;
    }

    if (typeof options === 'function') {
      // no options
      callback = options;
      options = {};
    }
    options = options || {};

    var headers = jQuery.extend(true, {}, this._headers);
    headers['Nuxeo-Transaction-Timeout'] = 5 + (this._timeout / 1000) | 0;
    if (this._schemas.length > 0) {
      headers['X-NXDocumentProperties'] = this._schemas.join(',');
    }
    if (this._repositoryName !== undefined) {
      headers['X-NXRepository'] = this._repositoryName;
    }
    headers = jQuery.extend(true, headers, options.headers || {});

    var xhrParams = {
      type: 'POST',
      username: this._username,
      password: this._password,
      timeout: this._timeout,
      headers: headers,
      url: getOperationURL(this._url, this._id)
    };

    if (typeof this._automationParams.input === 'object') {
      // multipart
      var automationParams = {
        params : this._automationParams.params,
        context : this._automationParams.context
      };

      var formData = new FormData();
      var params = new Blob([ JSON.stringify(automationParams) ], {
        'type' : 'application/json+nxrequest'
      });
      formData.append('request', params, 'request');
      formData.append(options.filename, this._automationParams.input, options.filename);

      xhrParams.data = formData;
      xhrParams.processData = false;
      xhrParams.contentType = 'multipart/form-data';
    } else {
      xhrParams.data = JSON.stringify(this._automationParams);
      xhrParams.contentType = 'application/json+nxrequest';
    }

    jQuery.ajax(xhrParams)
      .done(function (data, textStatus, jqXHR) {
        if (callback) {
          callback(null, data, jqXHR)
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (callback) {
          callback(errorThrown, null, jqXHR)
        }
      });
  };


  var Request = function(options) {
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
    this._headers = jQuery.extend(true, {}, this._headers, headers);
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
    this._query = jQuery.extend(true, {}, this._query, query);
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
    options = jQuery.extend(true, {}, options, {
      method: 'get'
    });
    this.execute(options, callback);
  };

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
    options = jQuery.extend(true, options, {
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
    options = jQuery.extend(true, options, {
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
    options = jQuery.extend(true, options, {
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

    var headers = jQuery.extend(true, {}, this._headers);
    headers['Accept'] = 'application/json';
    headers['Nuxeo-Transaction-Timeout'] = 5 + (this._timeout / 1000) | 0;
    if (this._schemas.length > 0) {
      headers['X-NXDocumentProperties'] = this._schemas.join(',');
    }
    headers = jQuery.extend(true, headers, options.headers || {});

    // stringify if needed
    if (headers['Content-Type'] === 'application/json') {
      if (options.data && typeof options.data === 'object') {
        options.data = JSON.stringify(options.data);
      }
    }

    // query params
    var query = jQuery.extend(true, {}, this._query);
    query = jQuery.extend(true, query, options.query || {});

    var path = '';
    if (this._repositoryName !== undefined) {
      path = join('repo', this._repositoryName);
    }
    path = join(path, this._path);
    var data = options.data || query;
    var xhrParams = {
      type: options.method,
      username: this._username,
      password: this._password,
      timeout: this._timeout,
      headers: headers,
      data: data,
      url: join(this._url, path)
    };

    jQuery.ajax(xhrParams)
      .done(function (data, textStatus, jqXHR) {
        if (callback) {
          callback(null, data, jqXHR)
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (callback) {
          callback(errorThrown, null, jqXHR)
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
      jQuery.extend(true, this, data);
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
    this._headers = jQuery.extend(true, {}, this._headers, headers);
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
    this.dirtyProperties = jQuery.extend(true, {}, this.dirtyProperties, properties);
    this.properties = jQuery.extend(true, {}, this.properties, properties);
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
      if (data !== undefined && typeof data === 'object'
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
      if (data !== undefined && typeof data === 'object'
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
      if (data !== undefined && typeof data === 'object'
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
      if (data !== undefined && typeof data === 'object'
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

  return nuxeo;

})(nuxeo || {});
