var chai = require('chai');
var expect = chai.expect;
var temp = require('temp');
var fs = require('fs');
var path = require('path');
var nuxeo = require('../lib/node/nuxeo');

var client = new nuxeo.Client({});
client.schemas(['dublincore', 'file']);

describe('Nuxeo automation', function() {

  describe('CRUD', function() {
    var container,
      children = [],
      createOp;

    it('create container document', function(done) {
      client.operation('Document.Create')
        .params({
          type: 'Folder',
          name: 'TestDocs',
          properties: 'dc:title=Test Docs \ndc:description=Simple container'
        })
        .input('doc:/')
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          container = data;
          expect(data.uid).to.exist;
          done();
        });
    });

    it('create first child', function(done) {
      createOp = client.operation('Document.Create').param('type', 'File').param('name', 'TestFile1')
        .input('doc:' + container.path);
      createOp.execute(function(error, data) {
        if (error) {
          throw error;
        }

        expect(data.uid).to.exist;
        expect(data.path.indexOf(container.path)).to.equal(0);
        children.push(data);
        done();
      });
    });

    it('create second child', function(done) {
      createOp.param('name', 'TestFile2')
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          expect(data.uid).to.exist;
          expect(data.path.indexOf(container.path)).to.equal(0);
          children.push(data);
          done();
        });
    });

    it('update second child', function(done) {
      client.operation('Document.Update')
        .params({
          save : 'true',
          properties : 'dc:description=Simple File\ndc:subjects=art,sciences'
        })
        .input('doc:' + children[1].path)
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          expect(data.properties['dc:description']).to.equal('Simple File');
          expect(data.properties['dc:subjects']).to.have.length(2);
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

  describe('query and pagination', function() {
    var container;

    function createChild(index, done) {
      client.operation('Document.Create')
        .params({
          type : 'File',
          name : 'TestFile' + index
        })
        .input('doc:' + container.path)
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          expect(data.uid).to.exist;
          expect(data.path.indexOf(container.path)).to.equal(0);
          done();
        });
    }

    it('create container document', function(done) {
      client.operation('Document.Create')
        .params({
          type : 'Folder',
          name : 'TestPagination',
          properties : 'dc:title=Test Pagination \ndc:description=Simple container'
        })
        .input('doc:/')
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          container = data;
          expect(data.uid).to.exist;
          done();
        });
    });

    it('create first child', function(done) {
      createChild(1, done);
    });

    it('create second child', function(done) {
      createChild(2, done);
    });

    it('create third child', function(done) {
      createChild(3, done);
    });

    it('query first page', function(done) {
      client.operation('Document.PageProvider')
        .params({
          query: 'select * from Document where ecm:parentId = ?',
          pageSize: 2,
          page: 0,
          queryParams: container.uid
        })
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          expect(data.entries).to.have.length(2);
          expect(data.pageSize).to.equal(2);
          expect(data.pageCount).to.equal(2);
          expect(data.totalSize).to.equal(3);
          done();
        });
    });

    it('query second page', function(done) {
      client.operation('Document.PageProvider')
        .params({
          query: 'select * from Document where ecm:parentId = ?',
          pageSize: 2,
          page: 1,
          queryParams: container.uid
        })
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          expect(data.entries).to.have.length(1);
          expect(data.pageSize).to.equal(2);
          expect(data.pageCount).to.equal(2);
          expect(data.totalSize).to.equal(3);
          done();
        });
    });
  });

  describe('blob upload', function() {
    var container;

    it('create container document', function(done) {
      client.operation('Document.Create')
        .params({
          type : 'Folder',
          name : 'TestBlobs',
          properties : 'dc:title=Test Blobs \ndc:description=Simple container'
        })
        .input('doc:/')
        .execute(function(error, data) {
          if (error) {
            throw error;
          }

          container = data;
          expect(data.uid).to.exist;
          done();
        });
    });

    it('create text blob', function(done) {
      var tmpFile = temp.openSync({
        suffix: '.txt'
      });
      var stats = fs.statSync(tmpFile.path);
      var file = fs.createReadStream(tmpFile.path);

      client.operation('FileManager.Import')
        .context({ currentDocument: container.path })
        .input(file)
        .execute(function (error, data) {
          if (error) {
            fs.unlinkSync(tmpFile.path);
            throw error;
          }

          expect(data.type).to.equal('Note');
          expect(data.title).to.equal(path.basename(tmpFile.path));
          fs.unlinkSync(tmpFile.path);
          done();
        });
    });

    it('create binary blob', function(done) {
      var tmpFile = temp.openSync({
        suffix: '.bin'
      });
      var stats = fs.statSync(tmpFile.path);
      var file = fs.createReadStream(tmpFile.path);

      client.operation('FileManager.Import')
        .context({ currentDocument: container.path })
        .input(file)
        .execute(function(error, data) {
          if(error) {
            throw error;
          }

          expect(data.type).to.equal('File');
          expect(data.title).to.equal(path.basename(tmpFile.path));
          done();
        });
    });

    it('create binary blob with UTF-8 filename', function(done) {
      var tmpFile = temp.openSync({
        prefix: 'κόσμε',
        suffix: '.bin'
      });
      var stats = fs.statSync(tmpFile.path);
      var file = fs.createReadStream(tmpFile.path);

      client.operation('FileManager.Import')
        .context({ currentDocument: container.path })
        .input(file)
        .execute(function(error, data) {
          if(error) {
            throw error;
          }

          expect(data.type).to.equal('File');
          expect(data.title).to.equal(path.basename(tmpFile.path));
          done();
        });
    });
  });

});
