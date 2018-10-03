const { createTextBlob } = require('./helpers/blob-helper');

describe('Upload', () => {
  let nuxeo;
  let nuxeoBatch;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    nuxeoBatch = nuxeo.batchUpload();
    return nuxeo.connect();
  });

  it('should lazily initialize a batch', () => {
    const blob = createTextBlob('foo', 'foo.txt');
    return nuxeoBatch.upload(blob).then(({ batch }) => {
      expect(batch._batchId).to.exist();
    });
  });

  it('should cancel a batch', () => (
    nuxeoBatch.cancel().then((batch) => {
      expect(batch).to.be.eql(nuxeoBatch);
      expect(batch._batchId).to.be.null();
      expect(batch._batchIdPromise).to.be.null();
    })
  ));

  it('should do nothing when cancelling a non-started batch', () => {
    const batch = nuxeo.batchUpload();
    return batch.cancel().then((b) => {
      expect(b).to.be.eql(batch);
      expect(b._batchId).to.be.null();
      expect(b._batchIdPromise).to.be.null();
    });
  });

  describe('#upload', () => {
    it('should upload a blob', () => {
      const nuxeoBlob = createTextBlob('foo', 'foo.txt');
      const batch = nuxeo.batchUpload();
      return batch.upload(nuxeoBlob).then(({ blob }) => {
        expect(blob).to.have.all.keys('upload-batch', 'upload-fileId',
          'uploaded', 'fileIdx', 'uploadedSize', 'uploadType');
        expect(blob.uploaded).to.be.equal('true');
        expect(blob.fileIdx).to.be.equal('0');
        expect(blob.uploadedSize).to.be.equal('3');
        expect(blob.uploadType).to.be.equal('normal');
        return batch.cancel();
      });
    });

    it('should upload multiple blobs on the same batch', () => {
      const batch = nuxeo.batchUpload({ concurrency: 1 });
      const nuxeoBlob = createTextBlob('foo', 'foo.txt');
      for (let i = 0; i < 5; i += 1) {
        batch.upload(nuxeoBlob);
      }

      return batch.done().then(({ blobs }) => {
        expect(blobs.length).to.be.equal(5);
        return batch.cancel();
      });
    });
  });

  describe('#fetchBlob', () => {
    it('should return a BatchBlob object for a given index', () => {
      const b = nuxeo.batchUpload({ concurrency: 1 });

      const blob1 = createTextBlob('foo', 'foo.txt');
      const blob2 = createTextBlob('bar', 'bar.txt');

      return b.upload(blob1, blob2)
        .then(({ batch }) => batch.fetchBlob(1))
        .then(({ batch, blob }) => {
          expect(blob).to.be.an.instanceof(Nuxeo.BatchBlob);
          expect(blob.name).to.equal('bar.txt');
          expect(blob.size).to.equal(3);
          return batch.cancel();
        });
    });
  });

  describe('#fetchBlobs', () => {
    it('should return a list of BatchBlob objects', () => {
      const b = nuxeo.batchUpload({ concurrency: 1 });

      const blob1 = createTextBlob('foo', 'foo.txt');
      const blob2 = createTextBlob('bar', 'bar.txt');

      return b.upload([blob1, [blob2]])
        .then(({ batch }) => batch.fetchBlobs())
        .then(({ batch, blobs }) => {
          expect(blobs).to.be.an.instanceof(Array);
          expect(blobs.length).to.equal(2);
          expect(blobs[0]['upload-batch']).to.equal(batch._batchId);
          expect(blobs[0]['upload-fileId']).to.equal('0');
          expect(blobs[0].name).to.equal('foo.txt');
          expect(blobs[1]['upload-batch']).to.equal(batch._batchId);
          expect(blobs[1]['upload-fileId']).to.equal('1');
          expect(blobs[0].size).to.equal(3);
          expect(blobs[1].name).to.equal('bar.txt');
          expect(blobs[1].size).to.equal(3);
          return batch.cancel();
        });
    });
  });

  describe('#removeBlob', () => {
    it('should remove a blob for a given index', () => {
      const b = nuxeo.batchUpload({ concurrency: 1 });

      const blob1 = createTextBlob('foo', 'foo.txt');
      const blob2 = createTextBlob('bar', 'bar.txt');

      return b.upload(blob1, blob2)
        .then(({ batch }) => batch.removeBlob(0))
        .then((res) => {
          expect(res.status).to.equal(204);
          return b.fetchBlob(0);
        })
        .catch((err) => {
          expect(err.response.status).to.equal(404);
          return b.fetchBlobs();
        })
        .then(({ batch, blobs }) => {
          expect(blobs).to.be.an.instanceof(Array);
          expect(blobs.length).to.equal(1);
          expect(blobs[0]['upload-batch']).to.equal(batch._batchId);
          expect(blobs[0]['upload-fileId']).to.equal('0');
          expect(blobs[0].name).to.equal('bar.txt');
          return batch.cancel();
        });
    });
  });
});
