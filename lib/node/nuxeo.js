var util = require("./node/util"),
  extend = require("extend"),
  p = require('./node/path'),
  rest = require("restler");

rest.parsers.auto.matchers = {
  "application/json": rest.parsers.json,
  "application/json+nxentity": rest.parsers.json
};

var REST_API_SUFFIX = "site/api/v1/";
var AUTOMATION_SUFFIX = "site/automation/";

var DEFAULT_CLIENT_OPTIONS = {
  baseURL: "http://localhost:8080/nuxeo/",
  username: "Administrator",
  password: "Administrator"
};

var Client = function(options) {
  options = extend(true, {}, DEFAULT_CLIENT_OPTIONS, options || {});
  this._baseURL = options.baseURL;
  if (this._baseURL[this._baseURL.length - 1] !== "/") {
    this._baseURL += "/";
  }
  this._username = options.username;
  this._password = options.password;
  this._repositoryName = options.repositoryName || "default";
  this._schemas = options.schemas || [];

  var self = this;
  var RestService = rest.service(function() {
    this.defaults.username = self._username;
    this.defaults.password = self._password;
  }, {
   baseURL: this._baseURL + REST_API_SUFFIX
  });
  this._restService = new RestService();

  var AutomationService = rest.service(function() {
    this.defaults.username = self._username;
    this.defaults.password = self._password;
  }, {
   baseURL: this._baseURL + AUTOMATION_SUFFIX
  });
  this._automationService = new AutomationService();

  this.connected = false;
};

Client.prototype = {
  connect: function(callback) {
    var self = this;

    function fetchOperationsDefs(cb) {
      rest.get(self._baseURL + "site/automation", {
        username: self._username,
        password: self._password,
        headers: {
          "Accept": "application/json"
        }
      }).on("complete", function(data) {
        if (data instanceof Error) {
          console.log(data);
          return;
        }
        self.operations = data.operations;
        self.chains = data.chains;
        self.connected = true;
        if (cb) {
          cb(null, self);
        }
      });
    }

    rest.post(this._baseURL + "site/automation/login", {
      username: this._username,
      password: this._password,
      headers: {
        "Accept": "application/json"
      }
    }).on("complete", function(data) {
      if (data instanceof Error) {
        callback(data, self)
      } else {
        try {
          if (data["entity-type"] === "login" && data["username"] === self._username) {
            self.connected = true;
            fetchOperationsDefs(callback);
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
  },
  repositoryName: function(repositoryName) {
    this._repositoryName = repositoryName;
    return this;
  },
  schema: function(schema) {
    this._schemas.push(schema);
    return this;
  },
  request: function(path) {
    return new Request({
      service: this._restService,
      path: path,
      repositoryName: this._repositoryName,
      schemas: this._schemas
    });
  },
  operation: function(id) {
    return new Operation( {
      service: this._automationService,
      id: id,
      repositoryName: this._repositoryName,
      schemas: this._schemas
    });
  }
};

var Request = function(options) {
  this._path = options.path || "";
  this._service = options.service;
  this._repositoryName = options.repositoryName;
  this._schemas = [].concat(options.schemas);
  this._headers = options.headers || {};
  this._query = options.query || {};
};

Request.prototype.header = function(name, value) {
  this._headers[name] = value;
  return this;
};

Request.prototype.headers = function(headers) {
  this._headers = extend({}, this._headers, headers);
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
  this._schemas.concat(schemas);
  this._schemas.push.apply(this._schemas, schemas);
  return this;
};

Request.prototype.query = function(query) {
  this._query = extend({}, this._query, query);
  return this;
};

Request.prototype.path = function(path) {
  this._path = p.join(this._path, path);
  return this;
};

Request.prototype.get = function(options, callback) {
  if (typeof options === "function") {
    // no options
    callback = options;
    options = {};
  }
  options = extend(true, options, {
    method: "get"
  });
  this.execute(options, callback);
}

Request.prototype.post = function(options, callback) {
  if (typeof options === "function") {
    // no options
    callback = options;
    options = {};
  }
  this.headers({ "Content-Type": "application/json" });
  if (options.data && typeof options.data !== "string") {
    options.data = JSON.stringify(options.data);
  }
  options = extend(true, options, {
    method: "post"
  });
  this.execute(options, callback);
};

Request.prototype.put = function(options, callback) {
  if (typeof options === "function") {
    // no options
    callback = options;
    options = {};
  }
  this.headers({ "Content-Type": "application/json" });
  if (options.data && typeof options.data !== "string") {
    options.data = JSON.stringify(options.data);
  }
  options = extend(true, options, {
    method: "put"
  });
  this.execute(options, callback);
};

Request.prototype.delete = function(options, callback) {
  if (typeof options === "function") {
    // no options
    callback = options;
    options = {};
  }
  options = extend(true, options, {
    method: "delete"
  });
  this.execute(options, callback);
};

Request.prototype.execute = function(options, callback) {
  if (typeof options === "function") {
    // no options
    callback = options;
    options = {};
  }
  options = options || {};
  options.method = options.method || "get";
  options.parser = rest.parsers.auto;

  var headers = extend({}, this._headers);
  headers["Accept"] = "application/json";
  if (this._schemas.length > 0) {
    headers["X-NXDocumentProperties"] = this._schemas.join(",");
  }
  headers = extend(headers, options.headers || {});
  options.headers = headers;

  // stringify if needed
  if (options.headers["Content-Type"] === "application/json") {
    if (options.data && typeof options.data === "object") {
      options.data = JSON.stringify(options.data);
    }
  }

  // query params
  var query = extend({}, this._query);
  query = extend(query, options.query || {});
  options.query = query;

  var path = "";
  if (this._repositoryName !== undefined) {
    path = p.join("repo", this._repositoryName);
  }
  path = p.join(path, this._path);

  var request = this._service.request(path, options);
  request.on("complete", function(data, response) {
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

var Operation = function(options) {
  this._id = options.id;
  this._timeout = 30000;
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
  this._headers = extend({}, this._headers, headers);
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

Operation.prototype.context = function(context) {
  this._automationParams.context = context;
  return this;
};

Operation.prototype.input = function(input) {
  this._automationParams.input = input;
  return this;
};

Operation.prototype.execute = function(options, callback) {
  if (typeof options === "function") {
    // no options
    callback = options;
    options = {};
  }
  options = options || {};
  options.method = "post";
  options.parser = rest.parsers.auto;

  var headers = extend({}, this._headers);
  headers["Nuxeo-Transaction-Timeout"] = 5 + (this._timeout / 1000) | 0;
  if (this._schemas.length > 0) {
    headers["X-NXDocumentProperties"] = this._schemas.join(",");
  }
  if (this._repositoryName !== undefined) {
    headers["X-NXRepository"] = this._repositoryName;
  }
  headers["Content-Type"] = "application/json+nxrequest";
  headers = extend(headers, options.headers || {});
  options.headers = headers;

  if (typeof this._automationParams.input === "object") {
    // multipart
    var automationParams = {
      params : this._automationParams.params,
      context : this._automationParams.context
    };
    options.multipart = true;
    options.data = {
      "params": JSON.stringify(automationParams),
      "file": this._automationParams.input
    }
  } else {
    options.data = JSON.stringify(this._automationParams);
  }

  var request = this._service.request(this._id, options);
  request.on("complete", function(data, response) {
    if (data instanceof Error) {
      console.log(typeof data);
      console.log(data)
      if (callback) {
        callback(data, null, response)
      }
    } else {
      // console.log(response.statusCode);
      // console.log(typeof data);
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


module.exports = {
  Client: Client
};
