# Client Library for Nuxeo API

JavaScript client library for the Nuxeo Automation and REST API.

The library can work in a browser, or in Node.js, using the same API.


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

    var nuxeo = require('nuxeo');

You can also install the current development version with:

    $ npm install nuxeo/nuxeo-js-client


## Initialization


### Creating a Client

To be able to make API calls on a Nuxeo server, you need to create a `Client` object:

    var client = new nuxeo.Client();

Default values are not the same in the browser or in Node.js.

Default values in the browser are:

    {
      baseURL: '/nuxeo',
      restPath: 'site/api/v1',
      automationPath: 'site/automation',
      username: null,
      password: null,
      timeout: 3000
    }

Default values in Node.js are:

    {
      baseURL: 'http://localhost:8080/nuxeo/',
      restPath: 'site/api/v1/',
      automationPath: 'site/automation/',
      username: 'Administrator',
      password: 'Administrator',
      timeout: 3000
    }


To connect to a different Nuxeo server, you can use the following:

    var client = new nuxeo.Client({
      baseURL: 'http://demo.nuxeo.com/nuxeo',
      username: 'Administrator',
      password: 'Administrator'
    })

### Testing the Connection

    client.connect(function(error, client) {
      if (error) {
        // cannot connect
        throw error;
      }

      // OK, the returned client is connected
      console.log('Client is connected: ' + client.connected);
    });

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


## Making API Calls!

### Callbacks and Error Handling

Most of the methods that actually make an API call can take a callback in the form:

    function(error, data, response /* the response from Restler, or jqXHR from jQuery when using browser client */) {
      if (error) {
        // something went wrong
        showError(error);
      }

      // OK
      console.log(data);
    }

### Automation API

Automation calls are made through the `Operation` object returned by the `client.operation()` method.

#### Samples

Retrieving the Root children document:

    client.operation('Document.GetChildren')
      .input('doc:/')
      .execute(function(error, children) {
        if (error) {
          // something went wrong
          throw error;
        }

        console.log('Root document has ' + children.entries.length + ' children');
      });

Creating a Folder in the Root document:

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

See [automation.js](test/automation.js) for more samples.

#### Available Methods

Assuming you have created an `Operation` object,

    var operation = client.operation('Document.GetChildren');

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

See [uploader.js](test/uploader.js) for more samples.

### REST API

REST API calls are made through the `Request` object returned by the `client.request()` method.

#### Samples

Fetching the Root document:

    client.request('path/')
      .get(function(error, root) {
        if (error) {
          // something went wrong
          throw error;
        }

        console.log('Fetched ' + root.title + ' document')
      });

Fetching Administrator user:

    client.request('user/Administrator')
      .get(function(error, user) {
        if (error) {
          // something went wrong
          throw error;
        }

        console.log(user)
      });

Fetching the whole list of Natures:

    client.request('directory/nature')
      .get(function(error, data) {
        if (error) {
          // something went wrong
          throw error;
        }

        console.log(JSON.stringify(data.entries, null, 2))
      });

#### Available Methods

Assuming you have created an `Request` object,

    var request = client.request('path/');

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

Fetch and update the Root description

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

See [document.js](test/document.js) for more samples.

#### Available Methods

Assuming you have created a `Document` object on the Root document,

    var document = client.document('/');

you can have access to the following methods.

**document.fetch(callback)**

Fetches (executes a GET request on) the referenced document.

**document.create(doc, callback)**

Creates the `doc` document (executees a POST request) in the referenced document.

**document.update(data, callback)**

Updates (executes a PUT request on) the referenced document with the given `data`.

**document.delete(callback)**

Deletes (executes a DELETE request on) the referenced document.

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


## About Nuxeo

Nuxeo provides a modular, extensible Java-based [open source software platform for enterprise content management] [1] and packaged applications for [document management] [2], [digital asset management] [3] and [case management] [4]. Designed by developers for developers, the Nuxeo platform offers a modern architecture, a powerful plug-in model and extensive packaging capabilities for building content applications.

[1]: http://www.nuxeo.com/en/products/ep
[2]: http://www.nuxeo.com/en/products/document-management
[3]: http://www.nuxeo.com/en/products/dam
[4]: http://www.nuxeo.com/en/products/case-management

More information on: <http://www.nuxeo.com/>
