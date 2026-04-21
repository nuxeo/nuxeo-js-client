const { createTextBlob } = require('./helpers/blob-helper');

describe('Upload', () => {
  let nuxeo;
  let nuxeoBatch;

  beforeAll(() => {
    nuxeo = new Nuxeo({ baseURL, auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    nuxeoBatch = nuxeo.batchUpload();
    return nuxeo.connect();
  });

  it('should lazily initialize a batch', () => {
    const blob = createTextBlob('foo', 'foo.txt');
    return nuxeoBatch.upload(blob).then(({ batch }) => {
      expect(batch._batchId).toBeDefined();
    });
  });

  it('should cancel a batch', () => (
    nuxeoBatch.cancel().then((batch) => {
      expect(batch).toEqual(nuxeoBatch);
      expect(batch._batchId).toBeNull();
      expect(batch._batchIdPromise).toBeNull();
    })
  ));

  it('should do nothing when cancelling a non-started batch', () => {
    const batch = nuxeo.batchUpload();
    return batch.cancel().then((b) => {
      expect(b).toEqual(batch);
      expect(b._batchId).toBeNull();
      expect(b._batchIdPromise).toBeNull();
    });
  });

  describe('#upload', () => {
    it('should upload a blob', () => {
      const nuxeoBlob = createTextBlob('foo', 'foo.txt');
      const batch = nuxeo.batchUpload();
      return batch.upload(nuxeoBlob).then(({ blob }) => {
        expect(Object.keys(blob).sort()).toEqual(['upload-batch', 'upload-fileId',
          'uploaded', 'fileIdx', 'uploadedSize', 'uploadType'].sort());
        expect(blob.uploaded).toBe('true');
        expect(blob.fileIdx).toBe('0');
        expect(blob.uploadedSize).toBe('3');
        expect(blob.uploadType).toBe('normal');
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
        expect(blobs.length).toBe(5);
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
          expect(blob).toBeInstanceOf(Nuxeo.BatchBlob);
          expect(blob.name).toBe('bar.txt');
          expect(blob.size).toBe(3);
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
          expect(blobs).toBeInstanceOf(Array);
          expect(blobs.length).toBe(2);
          expect(blobs[0]['upload-batch']).toBe(batch._batchId);
          expect(blobs[0]['upload-fileId']).toBe('0');
          expect(blobs[0].name).toBe('foo.txt');
          expect(blobs[1]['upload-batch']).toBe(batch._batchId);
          expect(blobs[1]['upload-fileId']).toBe('1');
          expect(blobs[0].size).toBe(3);
          expect(blobs[1].name).toBe('bar.txt');
          expect(blobs[1].size).toBe(3);
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
          expect(res.status).toBe(204);
          return b.fetchBlob(0);
        })
        .catch((err) => {
          expect(err.response.status).toBe(404);
          return b.fetchBlobs();
        })
        .then(({ batch, blobs }) => {
          expect(blobs).toBeInstanceOf(Array);
          expect(blobs.length).toBe(1);
          expect(blobs[0]['upload-batch']).toBe(batch._batchId);
          expect(blobs[0]['upload-fileId']).toBe('0');
          expect(blobs[0].name).toBe('bar.txt');
          return batch.cancel();
        });
    });
  });
});
