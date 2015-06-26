var chai = require('chai');
var expect = chai.expect;
var temp = require('temp');
var fs = require('fs');
var nuxeo = require('../lib/node/nuxeo');

var client = new nuxeo.Client();
client.schemas(['dublincore', 'file']);

describe('batch upload', function() {
  var container,
    importOp;

  it('create container document', function(done) {
    client.operation('Document.Create')
      .params({
        type : 'Folder',
        name : 'TestBlobs',
        properties : 'dc:title=Test Blobs Batch \ndc:description=Simple container'
      })
      .input('doc:/')
      .execute(function(error, data) {
        if (error) {
          throw error;
        }

        container = data;
        expect(container.uid).to.exist;
        done();
      });
  });

  it('upload text blob', function(done) {
    var tmpFile = temp.openSync({
      suffix: '.txt'
    });
    var file = fs.createReadStream(tmpFile.path);

    importOp = client.operation('FileManager.Import')
      .context({ currentDocument: container.path });
    importOp.uploader().uploadFile(file,
      function(fileIndex, fileObj) {
        expect(fileIndex).to.equal(0);
        done();
    });
  });

  it('upload binary blob', function(done) {
    var tmpFile = temp.openSync({
      suffix: '.bin'
    });
    var stats = fs.statSync(tmpFile.path);
    var file = fs.createReadStream(tmpFile.path);

    importOp.uploader().uploadFile(file, {fileSize: stats.size }, function(fileIndex, fileObj) {
      expect(fileIndex).to.equal(1);
      done();
    });
  });

  it('import', function(done) {
    importOp.uploader().execute(function(error, data) {
      if (error) {
        throw error;
      }

      expect(data.entries).to.have.length(2);
      done();
    });
  });

  it('get children', function(done) {
    client.operation('Document.GetChildren')
      .input('doc:' + container.path)
      .execute(function(error, data) {
        if (error) {
          throw error;
        }

        expect(data.entries).to.have.length(2);
        done();
      });
  });
});
