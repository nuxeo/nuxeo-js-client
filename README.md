# Client Library for Nuxeo API

The Nuxeo JavaScript Client is a JavaScript client library for the Nuxeo Automation and REST API. The library can work in a browser, or in Node.js, using the same API.

This is an on-going project, supported by Nuxeo.

# Getting Started

## Installation

### Browser Applications

Just copy the `lib/jquery/nuxeo.js` file in your application and include it in your page's `<head>`.

### Bower Powered Applications

The `nuxeo` client can be also installed through bower:

    $ bower install nuxeo

#### Note about the jQuery version

We require jQuery version 1.8.3 as a minimum version, you can of course use any version >= 1.8.3 through your own `bower.json` file:

    ...
    "dependencies": {
      "jquery": "1.11.1",
      "nuxeo": "0.1.0",
      ...
    }
    ...

### Node.js Applications

After installing [Node.js](http://nodejs.org/#download), use `npm` to install the `nuxeo` package:

    $ npm install nuxeo

Then, use the following `require` statement to have access to the same API than the browser client:

```javascript
var nuxeo = require('nuxeo');
```

You can also install the current development version with:

    $ npm install nuxeo/nuxeo-js-client


## Initialization


### Creating a Client

To be able to make API calls on a Nuxeo server, you need to create a `Client` object:

```javascript
var client = new nuxeo.Client();
```

Default values are not the same in the browser or in Node.js.

Default values in the browser are:

```javascript
{
  baseURL: '/nuxeo',
  restPath: 'site/api/v1',
  automationPath: 'site/automation',
  username: null,
  password: null,
  timeout: 3000
}
```

Default values in Node.js are:

```javascript
{
  baseURL: 'http://localhost:8080/nuxeo/',
  restPath: 'site/api/v1/',
  automationPath: 'site/automation/',
  authentication: {
    method: 'basic',
    username: 'Administrator',
    password: 'Administrator'
  },
  timeout: 3000
}
```

To connect to a different Nuxeo server, you can use the following:

```javascript
var client = new nuxeo.Client({
  baseURL: 'http://demo.nuxeo.com/nuxeo'
});
```

### Testing the Connection

```javascript
client.connect(function(error, client) {
  if (error) {
    // cannot connect
    throw error;
  }

  // OK, the returned client is connected
  console.log('Client is connected: ' + client.connected);
});
```

### Client Methods

The `Client` object stores the values set by the following methods and uses them when creating Operation,
Request or Document objects.

If you set the repository name through `client.repositoryName('test')`, when creating an `Operation`
object through `var operation = client.operation('Document.GetChildren')`, the `operation` object
will have its `repositoryName` field set to `test`.

Values can be modified by using the same methods on the `Operation`, `Request` and `Document` objects.

**client.timeout(timeout)**

Sets the common timeout in ms to be used for the requests.
Used also for the `Nuxeo-Transaction-Timeout` header.

**client.header(name, value)**

Sets a common header to be used for the requests.

**client.headers(headers)**

Sets common headers to be used for the requests.

**client.repositoryName(repositoryName)**

Sets the default repository name for the requests (`X-NXRepository` header).

**client.schema(schema)**

Adds a schema to the default list of schemas to retrieved when fetching documents (`X-NXDocumentProperties` header).

**client.schemas(schemas)**

Adds schemas to the default list of schemas to retrieved when fetching documents (`X-NXDocumentProperties` header).

## Authentication

The authentication configuration is done through the `authentication` object when initializing a `Client`.

The default `authentication` object is:

```javascript
authentication: {
  method: 'basic',
  username: 'Administrator',
  password: 'Administrator'
}
```

### jQuery

The jQuery client only offers the `basic` authentication for now.

To connect with `myuser`:

```javascript
var client = new nuxeo.Client({
  authentication: {
    // optional as it's the default value
    method: 'basic',
    username: 'myuser',
    password: 'mysecretpassword'
  }
})
```

### Node.js

The Node.js client supports the following authentication method: `basic`, `proxy` and `portal`.

#### basic

```javascript
var client = new nuxeo.Client({
  authentication: {
    // optional as it's the default value
    method: 'basic',
    username: 'myuser',
    password: 'mysecretpassword'
  }
})
```

#### proxy

To configure a `proxy` authentication:

```javascript
var client = new nuxeo.Client({
  authentication: {
    method: 'proxy',
    username: 'myuser',
    // optional header name, default is 'Auth-User'
    proxyAuthHeaderName: 'Custom-Header-Name'
  }
})
```

#### portal

To configure a `portal` authentication:

```javascript
var client = new nuxeo.Client({
  authentication: {
    method: 'portal',
    username: 'myuser',
    secret: 'nuxeo5secret'
  }
})
```

## Making API Calls

### Callbacks and Error Handling

Most of the methods that actually make an API call can take a callback in the form:

```javascript
function(error, data, response /* the response from Restler, or jqXHR from jQuery when using browser client */) {
  if (error) {
    // something went wrong
    showError(error);
  }

  // OK
  console.log(data);
}
```

### Automation API

Automation calls are made through the `Operation` object returned by the `client.operation()` method.

#### Samples

Retrieving the Root children document:

```javascript
client.operation('Document.GetChildren')
  .input('doc:/')
  .execute(function(error, children) {
    if (error) {
      // something went wrong
      throw error;
    }

    console.log('Root document has ' + children.entries.length + ' children');
  });
```

Creating a Folder in the Root document:

```javascript
client.operation('Document.Create')
  .params({
    type: 'Folder',
    name: 'My Folder',
    properties: 'dc:title=My Folder \ndc:description=A Simple Folder'
  })
  .input('doc:/')
  .execute(function(error, folder) {
    if (error) {
      // something went wrong
      throw error;
    }

    console.log('Created ' + folder.title + ' folder')
  });
```

See [automation.js](test/automation.js) for more samples.

#### Available Methods

Assuming you have created an `Operation` object,

```javascript
var operation = client.operation('Document.GetChildren');
```

you can have access to the following methods.

**operation.overrideMimeType(overrideMimeType)**

Allow to modify the response content-type header. **Only available in the jQuery based client.**

**operation.input(object)**

Sets the input for this operation. Can be a `document ref`, a `Blob` (in the browser)
or a `file` (created with `rest.file()`) in Node.js.

**operation.param(name, value)**

Sets one param of this operation.

**operation.params(params)**

Sets the params of this operation. These params are merged with the already existing ones.

**operation.context(context)**

Sets the operation context of this operation.

**operation.execute(callback)**

Executes this operation.

### Uploader API

#### Samples

Upload a blob to an existing document. In this example, `file` is a File JavaScript object, as filled when using the `<input type="file" .../>` HTML object.

```javascript
// Create the uploader bound to the operation
var uploader = client.operation("Blob.Attach")
  .params({ document: existingDocId,
    save : true,
    xpath: "file:content"
  })
  .uploader();

// Upload the file
uploader.uploadFile(file, function(fileIndex, file, timeDiff) {
  // When done, execute the operation
  uploader.execute(function(error, data) {
    if (error) {
      // something went wrong
      throw error;
    }

    // successfully attached blob
  });
}
```

See [uploader.js](test/uploader.js) for more samples.

### REST API

REST API calls are made through the `Request` object returned by the `client.request()` method.

#### Samples

Fetching the Root document:

```javascript
client.request('path/')
  .get(function(error, root) {
    if (error) {
      // something went wrong
      throw error;
    }

    console.log('Fetched ' + root.title + ' document')
  });
```

Fetching Administrator user:

```javascript
client.request('user/Administrator')
  .get(function(error, user) {
    if (error) {
      // something went wrong
      throw error;
    }

    console.log(user)
  });
```

Fetching the whole list of Natures:

```javascript
client.request('directory/nature')
  .get(function(error, data) {
    if (error) {
      // something went wrong
      throw error;
    }

    console.log(JSON.stringify(data.entries, null, 2))
  });
```

#### Available Methods

Assuming you have created an `Request` object,

```javascript
var request = client.request('path/');
```

you can have access to the following methods.

**request.overrideMimeType(overrideMimeType)**

Allow to modify the response content-type header. **Only available in the jQuery based client.**

**request.path(path)**

Appends the given `path` to the existing `path` of the `request`.

**request.query(query)**

Sets the query parameters of this request. These query parameters are merged with the already
existing ones.

**request.get(options, callback)**

Executes a GET request on the given path, here on the Root document.

**request.post(options, callback)**

Executes a POST request on the given path, here on the Root document.
The body to be sent should be in `options.data`.

**request.put(options, callback)**

Executes a PUT request on the given path, here on the Root document.
The body to be sent should be in `options.data`.

**request.delete(options, callback)**

Executes a DELETE request on the given path, here on the Root document.

### Higher Level Document API

When working with documents, you can also use the `Document` object returned by the `client.document()` method.
The `Document` object wraps `Request` objects when doing API calls.

If the data returned by any call made with the Document API is a document
(has the `entity-type` field as `document`), the data is automatically wrapped in
a new `Document` object.

#### Samples

Creating a Folder in the Root document:

```javascript
client.document('/')
  .create({
    type: 'Folder',
    name: 'My Folder',
    properties: {
      "dc:title": "My Folder",
      "dc:description": "A Simple Folder"
    }
  }, function(error, folder) {
    if (error) {
      // something went wrong
      throw error;
    }

    console.log('Created ' + folder.title + ' folder')
  });
```

Fetching and updating the Root description

```javascript
client.document('/')
  .fetch(function(error, doc) {
    if (error) {
      // something went wrong
      throw error;
    }

    doc.set({ 'dc:description': 'An updated description' });
    doc.save(function(error, doc) {

      console.log('Successfully updated ' + doc.title + ' with new description: ' + doc.properties['dc:description']);
    });
  });
```

Moving a document

```javascript
client.document('/my-doc')
  .fetch(function(error, doc) {
    if (error) {
      // something went wrong
      throw error;
    }

    doc.move({
      target: '/my-new-folder',
      // optional new name
      name: 'my-new-name-doc'
    }, function(error, doc) {
      console.log('Successfully moved ' + doc.title + ', updated path: ' + doc.path);
    });
  });
```

Copying a document

```javascript
client.document('/my-doc')
  .fetch(function(error, doc) {
    if (error) {
      // something went wrong
      throw error;
    }

    doc.copy({
      target: '/my-new-folder',
      // optional new name
      name: 'my-new-name-doc'
    }, function(error, doc) {
      console.log('Successfully copied ' + doc.title + 'to : ' + doc.path);
    });
  });
```

Setting a complex property. Assuming the document has a complex field `schema:author` which contains 3 fields `firstName`, `lastName` and `email`.

```javascript
client.document('/my-doc')
  .fetch(function(error, doc) {
    if (error) {
      // something went wrong
      throw error;
    }

    var firstName = ...,
      lastName = ...,
      email = ...;
    doc.set({
      'schema:author': {
        'firstName': firstName,
        'lastName': lastName,
        'email': email
      }
    });
    doc.save(function(error, doc) {
      console.log('Successfully updated ' + doc.title);
      console.log(JSON.stringify(doc.properties['schema:author'], null, 2));
    });
  });
```

See [document.js](test/document.js) for more samples.

#### Available Methods

Assuming you have created a `Document` object on the Root document,

```javascript
var document = client.document('/');
```

you can have access to the following methods.

**document.fetch(callback)**

Fetches (executes a GET request on) the referenced document.

**document.create(doc, callback)**

Creates the `doc` document (executees a POST request) in the referenced document.

**document.update(data, callback)**

Updates (executes a PUT request on) the referenced document with the given `data`.

**document.delete(callback)**

Deletes (executes a DELETE request on) the referenced document.

**document.copy(data, callback)**

Copies the referenced document. It internally uses the `Document.Copy` operation.

It accepts through the `data` object the parameters used by the `Document.Copy` operation:

```javascript
data = {
  target: targetDocId,
  name: newName
}
```

**document.move(data, callback)**

Moves the referenced document. It internally uses the `Document.Move` operation.

It accepts through the `data` object the parameters used by the `Document.Move` operation:

```javascript
data = {
  target: targetDocId,
  name: newName
}
```

**document.set(properties)**

Sets properties (locally) on the document. The updated properties are marked as dirty,
and can be retrieved through the `document.dirtyProperties` object.
`properties` must be a JavaScript object: `{ 'dc:title': 'My Title', ... }`.
This method does not make any API call.

**document.save(callback)**

Updates (executes a PUT request on) the referenced document with only its dirty properties.
To be called after setting properties with `document.set()`.

**document.children(callback)**

Retrieves the children of the referenced document.


# Development

## Requirements

* [Node.js](http://nodejs.org/#download)
* [gulp](http://gulpjs.com/)
* [Bower](http://bower.io/)
* [npm](https://www.npmjs.com/)

## Setup

Install [Node.js](http://nodejs.org/#download) and then use `npm` to install all the required
libraries:

    $ git clone https://github.com/nuxeo/nuxeo-js-client
    $ cd nuxeo-js-client
    $ npm install

## Test

To run the tests, use the following:

    $ gulp test

For now, only the node client is tested through `gulp test`.

## Reporting Issues

You can follow the developments in the Nuxeo Platform project of our JIRA bug tracker, which includes a Nuxeo JavaScript Client component: [https://jira.nuxeo.com/browse/NXP/component/13319](https://jira.nuxeo.com/browse/NXP/component/13319).

You can report issues on [answers.nuxeo.com](http://answers.nuxeo.com).


## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Netflix, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at [www.nuxeo.com](http://www.nuxeo.com/).
