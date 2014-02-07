(function(nuxeo) {

  if (typeof(log) === "undefined") {
    log = function() {};
  }

  // ************************************
  // Uploader

  nuxeo.DEFAULT_AUTOMATION_UPLOADER_OPTIONS = {
        numConcurrentUploads: 5,
        // define if upload should be triggered directly
        directUpload: true,
        // update upload speed every second
        uploadRateRefreshTime : 1000,
        handler: {
          // invoked when a new batch is started
          batchStarted : function() {
          },
          // invoked when the upload for given file has been started
          uploadStarted : function(fileIndex, file) {
          },
          // invoked when the upload for given file has been finished
          uploadFinished : function(fileIndex, file, time) {
          },
          // invoked when the progress for given file has changed
          fileUploadProgressUpdated : function(fileIndex, file, newProgress) {
          },
          // invoked when the upload speed of given file has changed
          fileUploadSpeedUpdated : function(fileIndex, file, KBperSecond) {
          },
          // invoked when all files have been uploaded
          batchFinished : function(batchId) {
          }
        }
      }

  function uploader(operationId, options) {
    var sendingRequestsInProgress = false,
      uploadStack = [],
      uploadIdx = 0,
      nbUploadInprogress = 0,
      completedUploads = [],
      doneCallbacks = [],
      failCallbacks = [],
      batchId = "batch-" + new Date().getTime() + "-"
        + Math.floor(Math.random() * 100000);

      var uploader = {
        uploadFile: function(cfile, callback) {
          if (callback) {
            cfile.callback = callback;
          }
          uploadStack.push(cfile);
          if (options.directUpload && !sendingRequestsInProgress
              && uploadStack.length > 0) {
            this.uploadFiles();
          }
        },

        uploadFiles: function() {
          if (nbUploadInprogress >= options.numConcurrentUploads) {
            sendingRequestsInProgress = false;
            log("delaying upload for next file(s) " + uploadIdx
                + "+ since there are already " + nbUploadInprogress
                + " active uploads");
            return;
          }

          // this.opts.handler.batchStarted();
          sendingRequestsInProgress = true;

          while (uploadStack.length > 0) {
            var file = uploadStack.shift();
            // create a new xhr object
            var xhr = new XMLHttpRequest();
            var upload = xhr.upload;
            upload.fileIndex = uploadIdx + 0;
            upload.fileObj = file;
            upload.downloadStartTime = new Date().getTime();
            upload.currentStart = upload.downloadStartTime;
            upload.currentProgress = 0;
            upload.startData = 0;
            upload.batchId = batchId;

            // add listeners
            upload.addEventListener("progress", function(event) {
              progress(event)
            }, false);

            if (file.callback) {
              upload.callback = file.callback;
            }

            // The "load" event doesn't work correctly on WebKit (Chrome,
            // Safari),
            // it fires too early, before the server has returned its response.
            // still it is required for Firefox
            if (navigator.userAgent.indexOf('Firefox') > -1) {
              upload.addEventListener("load", function(event) {
                log("trigger load");
                log(event);
                load(event.target)
              }, false);
            }

            // on ready state change is not fired in all cases on webkit
            // - on webkit we rely on progress lister to detected upload end
            // - but on Firefox the event we need it
            xhr.onreadystatechange = (function(xhr) {
              return function() {
                readyStateChange(xhr)
              }
            })(xhr);

            // compute timeout in seconds and integer
            uploadTimeoutS = 5 + (options.uploadTimeout / 1000) | 0;

            var targetUrl = options.url;
            if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
              targetUrl = targetUrl + "/";
            }
            targetUrl = targetUrl + "batch/upload";

            log("starting upload for file " + uploadIdx);
            xhr.open("POST", targetUrl);
            xhr.setRequestHeader("Cache-Control", "no-cache");
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
            xhr.setRequestHeader("X-File-Size", file.size);
            xhr.setRequestHeader("X-File-Type", file.type);
            xhr.setRequestHeader("X-Batch-Id", batchId);
            xhr.setRequestHeader("X-File-Idx", uploadIdx);

            xhr.setRequestHeader('Nuxeo-Transaction-Timeout', uploadTimeoutS);
            //xhr.setRequestHeader("Content-Type", "multipart/form-data");
            nbUploadInprogress++;

            options.handler.uploadStarted(uploadIdx, file);
            uploadIdx++;


            xhr.send(file);

            if (nbUploadInprogress >= options.numConcurrentUploads) {
              sendingRequestsInProgress = false;
              log("delaying upload for next file(s) " + uploadIdx
                  + "+ since there are already "
                  + nbUploadInprogress + " active uploads");
              return;
            }
          }
          sendingRequestsInProgress = false;
        },

        done: function() {
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i]
            var type = jQuery.type(arg);
            if (type === "array") {
              this.done.apply(this, arg);
            } else if (type === "function") {
              doneCallbacks.push(arg);
            }
          }
          return this
        },

        fail: function() {
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i]
            var type = jQuery.type(arg);
            if (type === "array") {
              this.fail.apply(this, arg);
            } else if (type === "function") {
              failCallbacks.push(arg);
            }
          }
          return this
        },

        execute: function(params) {
          params = params || {}
          var done = params.done ? params.done : [],
            fail = params.fail ? params.fail : []

          var opts = jQuery.extend({}, options, params);
          opts.automationParams.params["operationId"] = operationId
          opts.automationParams.params["batchId"] = batchId

          var xhrParams = createXHRParams(opts);

          var targetUrl = opts.url;
          if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
            targetUrl = targetUrl + "/";
          }
          if (targetUrl.indexOf('/batch/execute') < 0) {
            targetUrl = targetUrl + 'batch/execute';
          }

          xhrParams.url = targetUrl;
          xhrParams.data = JSON.stringify(opts.automationParams);
          xhrParams.contentType = 'application/json+nxrequest';
          jQuery.ajax(xhrParams).done(doneCallbacks).done(done)
            .fail(failCallbacks).fail(fail);
        }
      }

      function readyStateChange(xhr) {
        var upload = xhr.upload;
        log("readyStateChange event on file upload " + upload.fileIndex
            + " (state : " + xhr.readyState + ")");
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            load(upload);
          } else {
            log("Upload failed, status: " + xhr.status);
          }
        }
      }

      function load(upload) {
        var fileIdx = upload.fileIndex;
        log("Received loaded event on  file " + fileIdx);
        if (completedUploads.indexOf(fileIdx) < 0) {
          completedUploads.push(fileIdx);
        } else {
          log("Event already processsed for file " + fileIdx + ", exiting");
          return;
        }
        var now = new Date().getTime();
        var timeDiff = now - upload.downloadStartTime;
        options.handler.uploadFinished(upload.fileIndex, upload.fileObj,
            timeDiff);
        log("upload of file " + upload.fileIndex + " completed");
        if (upload.callback) {
            upload.callback(upload.fileIndex, upload.fileObj,
            timeDiff);
        }
        nbUploadInprogress--;
        if (!sendingRequestsInProgress && uploadStack.length > 0
            && nbUploadInprogress < options.numConcurrentUploads) {
          // restart upload
          log("restart pending uploads");
          uploader.uploadFiles();
        } else if (nbUploadInprogress == 0) {
          options.handler.batchFinished(batchId);
        }
      }

      function progress(event) {
        log(event);
        if (event.lengthComputable) {
          var percentage = Math.round((event.loaded * 100) / event.total);
          if (event.target.currentProgress != percentage) {

            log("progress event on upload of file "
                + event.target.fileIndex + " --> " + percentage + "%");

            event.target.currentProgress = percentage;
            options.handler.fileUploadProgressUpdated(
                event.target.fileIndex, event.target.fileObj,
                event.target.currentProgress);

            var elapsed = new Date().getTime();
            var diffTime = elapsed - event.target.currentStart;
            if (diffTime >= options.handler.uploadRateRefreshTime) {
              var diffData = event.loaded - event.target.startData;
              var speed = diffData / diffTime; // in KB/sec

              options.handler
                  .fileUploadSpeedUpdated(event.target.fileIndex,
                      event.target.fileObj, speed);

              event.target.startData = event.loaded;
              event.target.currentStart = elapsed;
            }
            if (event.loaded == event.total) {
              log("file " + event.target.fileIndex
                  + " detected upload complete");
              // having all the bytes sent to the server does not mean the
              // server did actually receive everything
              // but since load event is not reliable on Webkit we need
              // this
              // window.setTimeout(function(){load(event.target, opts);},
              // 5000);
            } else {
              log("file " + event.target.fileIndex + " not completed :"
                  + event.loaded + "/" + event.total);
            }
          }
        }
      }

      return uploader
  }

  // ************************************
  // REST binding

  nuxeo.DEFAULT_REST_OPTIONS = {
          url: "/nuxeo/site/api/v1",
          execTimeout: 30000,
          documentSchemas: "dublincore"
    }

  function location(repo, docRef) {
    var docLoc = {};
    if (repo) {
      docLoc.repo = repo;
    }
    if (docRef) {
      if (typeof(docRef)==='object' && docRef['entity-type']==='document') {
        if (docRef.uid) {
          docLoc.docRef = docRef.uid;
        } else {
          docLoc.docRef = docRef.path;
        }
        docLoc.repo = docRef.repository;
      } else {
        docLoc.docRef = docRef;
      }
    }

    if (!docLoc.docRef) {
      docLoc.document = docLoc.doc = function(docRef) { return location(docLoc.repo, docRef)};
    }
    if (!docLoc.repo) {
      docLoc.repository = docLoc.repo = function(repo) { return location(repo, docLoc.docRef)};
    }

    function encodeDocRef(url, docRef) {
        if (docLoc.docRef.indexOf("/")==0) {
            url = url + "/path" + docLoc.docRef;
            if (url[url.length-1]=='/') {
              url = url.substring(0, url.length-1);
            }
        } else {
            url = url + "/id/" + docLoc.docRef;
        }
        return url;
    }
    function executeRestCall(docLoc, type, options, adapter, body) {
        var url = options.url;
        var done, fail, txTimeout, documentSchemas;
        var qsParam = {};

        url = encodeDocRef(url, docLoc.docRef);

        if (docLoc.adapters) {
          url = url + "/@bo/" + docLoc.adapters[0];
        }

        for (var p in options) {
          if (p === 'done') {
            done = options[p];
          } else if (p === 'fail') {
            fail = options[p];
          } else if (p === 'url') {
            // skip
          } else if (p === 'execTimeout') {
            txTimeout = 5 + (options[p] / 1000) | 0;
          } else if (p === 'documentSchemas') {
            documentSchemas = options[p];
          }
          else {
            qsParam[p]=options[p];
          }
        }

        if (!done) {
          done = function(data, textStatus, jqXHR) {
            console.log("REST call result",data);
          }
        }
        if (!fail) {
          fail = function(jqXHR, textStatus, errorThrown) {
            console.log("REST call ERROR",errorThrown, textStatus);
          }
        }
        if (adapter) {
          url = url + "/@" + adapter;
        }

        // add QueryString params
        if (qsParam) {
          url = url + "?";
          for (var p in qsParam) {
            url = url + p + "=" + qsParam[p] + "&";
          }
          url = url.substring(0, url.length-1);
        }
        var xhrParams = {
            url : url,
            type: type,
            beforeSend: function(xhr) {
              if (repo) {
                xhr.setRequestHeader('X-NXRepository', repo);
              }
              if (txTimeout) {
                xhr.setRequestHeader('Nuxeo-Transaction-Timeout', txTimeout);
              }
              if (documentSchemas.length > 0) {
                  xhr.setRequestHeader('X-NXDocumentProperties',
                      documentSchemas);
                }
              if (docLoc.facets && docLoc.facets.length>0) {
                  // xhr.setRequestHeader('X-NXRepository', repo);
              }
            }
        }
        xhrParams.contentType = 'application/json+nxentity';
        if (body) {
          xhrParams.data = JSON.stringify(body);
        }
        jQuery.ajax(xhrParams).done(function(data, textStatus, jqXHR) {
                          if (data['entity-type']=='document') {
                            data = documentWrapper(data);
                          }
                          done(data,textStatus, jqXHR);
                      }).fail(fail);
    }

    docLoc.fetch = function(options) {
      var opts = jQuery.extend({}, nuxeo.DEFAULT_REST_OPTIONS, options);
      executeRestCall(this, 'GET', opts, undefined);
    }

    docLoc.create = function(options, body) {
        var opts = jQuery.extend({}, nuxeo.DEFAULT_REST_OPTIONS, options);
        executeRestCall(this, 'POST', opts, undefined, body);
    }

    docLoc.update = function(options, body) {
        var opts = jQuery.extend({}, nuxeo.DEFAULT_REST_OPTIONS, options);
        executeRestCall(this, 'PUT', opts, undefined, body);
    }

    docLoc.delete = function(options) {
        var opts = jQuery.extend({}, nuxeo.DEFAULT_REST_OPTIONS, options);
        executeRestCall(this, 'DELETE', opts, undefined);
    }

    docLoc.children = function(options) {
        var opts = jQuery.extend({}, nuxeo.DEFAULT_REST_OPTIONS, options);
        executeRestCall(this, 'GET', opts, "children");
    }

    docLoc.adapter = function(adapterName) {
      if (!this.adapters) {
         this.adapters = [];
      }
      this.adapters.push(adapterName);
      return this;
    }

    docLoc.as = docLoc.adapter;

    docLoc.with = function(facet) {
        if (!this.facets) {
          this.facets = [];
        }
        this.facets.push(facet);
        return this;
      }

    docLoc.op = docLoc.operation = function (operationId, options) {
      var opts = jQuery.extend({}, nuxeo.DEFAULT_AUTOMATION_OPTIONS, options);
      var url = opts.url.replace("/automation", "/api/v1");
      url = encodeDocRef(url, this.docRef);
      if (this.repo) {
        opts.repository = this.repo;
      }
      opts.url = url + "/@op";
      return operation(operationId, opts)
    }

    return docLoc;
  }

  nuxeo.repository = nuxeo.repo = function(repoName) {
    return location(repoName, undefined);
  }

  nuxeo.document = nuxeo.doc = function(docRef) {
    return location(undefined, docRef);
  }

  function documentWrapper(doc) {

    doc.update = function (properties) {
      if (!doc.dirtyFields) {
        doc.dirtyFields = [];
      }
      for (var key in properties) {
        doc.properties[key] = properties[key];
        doc.dirtyFields.push(key);
      }
      return doc;
      };

    doc.getDirtyFields = function () {
      var dirty = {};
      for (var i = 0; i< doc.dirtyFields.length; i++) {
        dirty[doc.dirtyFields[i]] = doc.properties[doc.dirtyFields[i]];
      }
      return dirty;
    }

    doc.getChangeSet = function () {
      return {
        "entity-type": "document",
          "repository": doc.repository,
          "uid": doc.uid,
          "properties": doc.getDirtyFields()
      }
    }

    doc.save = function(options) {
      nuxeo.document(doc).update(options, doc.getChangeSet());
    }
    return doc;
  }

  // ************************************
  // RPC Binding

  nuxeo.DEFAULT_AUTOMATION_OPTIONS = {
        url: "/nuxeo/site/automation",
        execTimeout: 30000,
        uploadTimeout: 20 * 60 * 1000,
        documentSchemas: "dublincore",
        automationParams: {
          params: {},
          context: {}
        }
      }

  function operation(operationId, options) {
    var doneCallbacks = [],
      failCallbacks = [],
      batchUploader = null;

    return {
      param: function(name, value) {
        if (arguments.length == 1) {
          return options.automationParams.params[name]
        } else if (arguments.length >= 2) {
          options.automationParams.params[name] = value
          return this;
        }
      },

      params: function(params) {
        if (arguments.length == 0) {
          return options.automationParams.params
        } else if (arguments.length >= 1) {
          jQuery.extend(options.automationParams.params, params);
          return this;
        }
      },

      input: function(input) {
        if (arguments.length == 0) {
          return options.automationParams.input
        } else if (arguments.length >= 1) {
          options.automationParams.input = input
          return this;
        }
      },

      context: function(context) {
        if (arguments.length == 0) {
          return options.automationParams.context
        } else if (arguments.length >= 1) {
          options.automationParams.context = context
          return this;
        }
      },

      timeout: function(timeout) {
        if (arguments.length == 0) {
          return options.execTimeout;
        } else if (arguments.length >= 1) {
          options.execTimeout = timeout;
          return this;
        }

      },

      done: function() {
        for (var i = 0; i < arguments.length; i++) {
          var arg = arguments[i]
          var type = jQuery.type(arg);
          if (type === "array") {
            this.done.apply(this, arg);
          } else if (type === "function") {
            doneCallbacks.push(arg);
          }
        }
        return this
      },

      fail: function() {
        for (var i = 0; i < arguments.length; i++) {
          var arg = arguments[i]
          var type = jQuery.type(arg);
          if (type === "array") {
            this.fail.apply(this, arg);
          } else if (type === "function") {
            failCallbacks.push(arg);
          }
        }
        return this
      },

      initCallbacks: function () {
        failCallbacks=[];
        doneCallbacks=[];
        return this;
      },

      execute: function(params) {
        params = params || {}
        var done = params.done ? params.done : [],
          fail = params.fail ? params.fail : []

        var opts = jQuery.extend({}, options, params);
        var xhrParams = createXHRParams(operationId, options)
        xhrParams = typeof options.automationParams.input === "object"
          ? fillMultiPartXHRParams(xhrParams, opts) : fillXHRParams(xhrParams, opts)
        jQuery.ajax(xhrParams).done(doneCallbacks).done(done)
          .fail(failCallbacks).fail(fail);
        return this;
      },

      uploader: function() {
        var me = this;
        if (!batchUploader) {
          var opts = jQuery.extend({}, nuxeo.DEFAULT_AUTOMATION_UPLOADER_OPTIONS, options);
          batchUploader = uploader(operationId, opts);
        }
        return batchUploader;
      }
    }
  }

  function fillXHRParams(xhrParams, options) {
    xhrParams.data = JSON.stringify(options.automationParams);
    xhrParams.contentType = 'application/json+nxrequest';
    return xhrParams
  }

  function fillMultiPartXHRParams(xhrParams, options) {
    var automationParams = {
      params : options.automationParams.params,
      context : options.automationParams.context
    };

    var formData = new FormData();
    var params = new Blob([ JSON.stringify(automationParams) ], {
      "type" : "application/json+nxrequest"
    });
    formData.append("request", params, "request");
    formData.append(options.filename, options.automationParams.input, options.filename);

    xhrParams.data = formData;
    xhrParams.processData = false;
    xhrParams.contentType = 'multipart/form-data';
    return xhrParams
  }

  function createXHRParams(operationId, options) {
    if (options === undefined) {
      options = operationId
      operationId = undefined
    }

    var execTimeout = options.execTimeout,
      txTimeout = 5 + (execTimeout / 1000) | 0,
      // xhrTimeout = options.uploadTimeout, ?
      documentSchemas = options.documentSchemas,
      repo = options.repo,
      username = options.username || null,
      password = options.password || null,
      voidOp = options.voidOp || false

    var params = {
      type: 'POST',
      username: username,
      password: password,
      timeout: execTimeout,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('X-NXVoidOperation', voidOp);
        xhr.setRequestHeader('Nuxeo-Transaction-Timeout', txTimeout);
        if (documentSchemas.length > 0) {
          xhr.setRequestHeader('X-NXDocumentProperties',
              documentSchemas);
        }
        if (repo) {
          xhr.setRequestHeader('X-NXRepository', repo);
        }
      }
    }

    if (operationId !== undefined) {
      params.url = getTargetUrl(options.url, operationId)
    }

    return params
  }

  function getTargetUrl(url, operationId) {
    if (url.indexOf("/", url.length - 1) == -1) {
      url += "/";
    }
    url += operationId;
    return url;
  }

  nuxeo.operation = nuxeo.op = function(operationId, options) {
    var opts = jQuery.extend({}, nuxeo.DEFAULT_AUTOMATION_OPTIONS, options);
    return operation(operationId, opts)
  }

})(this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo);
