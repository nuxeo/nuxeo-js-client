var chai = require('chai');
var expect = chai.expect;
var nuxeo = require('../lib/node/nuxeo');

var client = new nuxeo.Client();
client.schemas(['dublincore', 'file']);

describe('Document', function() {

  describe('#fetch', function() {
    it('should fetch domain document', function(done) {
      client.document('/default-domain')
        .fetch(function(error, doc) {
          expect(doc.uid).to.exist;

          done();
        });
    });

    it('should returns 404 for non existing document', function(done) {
      client.document('/non-existing')
        .fetch(function(error, doc, response) {
          expect(doc).to.be.null;
          expect(error).to.be.not.null;
          expect(response.statusCode).to.be.equal(404);

          done();
        });
    });
  });

  var folderPath;
  describe('#create', function() {
    it('should create a new document', function(done) {
      client.document('/')
        .create({
          'type': 'Folder',
          'name': 'folder',
          'properties': {
            'dc:title': 'A Folder'
          }
        }, function(err, doc) {
          expect(doc.uid).to.exist;
          expect(doc.properties['dc:title']).to.equal('A Folder');

          folderPath = doc.path;

          done();
        });
    });
  });

  describe('#update', function() {
    it('should update existing document', function(done) {
      client.document(folderPath)
        .update({
          properties: {
            'dc:title': 'new title'
          }
        }, function(err, doc) {
          expect(doc.properties['dc:title']).to.equal('new title');

          done();
        });
    });
  });

  describe('#set', function() {
    it('should fill dirtyProperties', function(done) {
      client.document(folderPath)
        .fetch(function(err, doc) {
          var newSourceValue = 'new-source-' + (new Date()).getTime();
          doc.set({ 'dc:source': newSourceValue });

          expect(doc.dirtyProperties['dc:source']).to.exist;
          expect(doc.dirtyProperties['dc:source']).to.equal(newSourceValue);

          done();
        });
    });
  });

  describe('#save', function() {
    it('should save updated document', function(done) {
      client.document(folderPath)
        .fetch(function(err, doc) {
          var newSourceValue = 'new-source-' + (new Date()).getTime();
          doc.set({ 'dc:source': newSourceValue });

          doc.save(function(error, data) {
            expect(data.uid).to.exist;
            expect(data.properties['dc:source']).to.equal(newSourceValue);

            done();
          });
        });
    });
  });

  describe('#delete', function() {
    it('should delete existing document', function(done) {
      client.document('/folder')
        .delete(function(err, data, response) {
          expect(response.statusCode).to.equal(204);
          expect(data).to.be.undefined;

          done();
        });
    });
  });


});
