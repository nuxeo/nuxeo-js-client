const join = require('../lib/deps/utils/join');
const { LTS_2016 } = require('../lib/nuxeo-versions');
const { createTextBlob, getTextFromBody } = require('./helpers/blob-helper');

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);
const FILE_TEST_NAME = 'bar.txt';
const FILE_TEST_PATH = join(WS_JS_TESTS_PATH, FILE_TEST_NAME);

function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeout);
  });
}

describe('Document', () => {
  let nuxeo;
  let repository;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    repository = nuxeo.repository({
      schemas: ['dublincore'],
    });

    const newDoc = {
      name: WS_JS_TEST_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    const newDoc2 = {
      name: FILE_TEST_NAME,
      type: 'File',
      properties: {
        'dc:title': 'bar.txt',
      },
    };
    const newUser = {
      'entity-type': 'user',
      properties: {
        username: 'leela',
        password: 'leela1',
      },
    };

    return nuxeo.connect()
      .then(() => nuxeo.repository().create(WS_ROOT_PATH, newDoc))
      .then(() => nuxeo.repository().create(WS_JS_TESTS_PATH, newDoc2))
      .then(() => nuxeo.users().create(newUser));
  });

  after(() => (
    repository.delete(WS_JS_TESTS_PATH)
      .then(() => nuxeo.users().delete('leela'))
  ));

  it('should be retrieved from a Repository', () => (
    repository.fetch('/default-domain')
      .then((doc) => {
        expect(doc).to.be.an.instanceof(Nuxeo.Document);
        expect(doc.uid).to.exist();
      })
  ));

  describe('#isFolder', () => {
    it('should return true for a folderish document', () => (
      repository.fetch('/default-domain')
        .then((doc) => {
          expect(doc.isFolder()).to.be.true();
        })
    ));
    it('should return false for a non-folderish document', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.isFolder()).to.be.false();
        })
    ));
  });

  describe('#hasFacet', () => {
    it('should return true for a document with SuperSpace facet', () => (
      repository.fetch('/default-domain')
        .then((doc) => {
          expect(doc.hasFacet('SuperSpace')).to.be.true();
        })
    ));
    it('should return false for a document without SupserSpace facet', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.hasFacet('SuperSpace')).to.be.false();
        })
    ));
  });

  describe('#isCollection', () => {
    it('should return true for a document that is a Collection', () => (
      repository.create(WS_JS_TESTS_PATH, {
        name: 'collection',
        type: 'Collection',
        properties: {
          'dc:title': 'collection',
        },
      })
      .then((doc) => {
        expect(doc.isCollection()).to.be.true();
      })
    ));
    it('should return false for a document that is not a Collection', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.isCollection()).to.be.false();
        })
    ));
  });

  describe('#isCollectable', () => {
    it('should return true for a document that is Collectable', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.isCollectable()).to.be.true();
        })
    ));
    it('should return false for a document that is not Collectable', () => (
      repository.fetch(WS_ROOT_PATH)
        .then((doc) => {
          expect(doc.isCollectable()).to.be.false();
        })
    ));
  });

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          doc.set({
            'dc:description': 'foo',
          });
          expect(doc.properties['dc:description']).to.be.null();
          expect(doc._dirtyProperties['dc:description']).to.be.equal('foo');
        })
    ));
  });

  describe('#get', () => {
    it('should return a property value', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.get('dc:title')).to.be.equal('bar.txt');
        })
    ));

    it('should return undefined for non existing property', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.get('dc:non-existing')).to.be.undefined();
        })
    ));

    it('should return the dirty property value if any', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          doc.set({
            'dc:description': 'foo',
          });
          expect(doc.get('dc:description')).to.be.equal('foo');
        })
    ));
  });

  describe('#save', () => {
    it('should save an updated document', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.get('dc:description')).to.be.null();
          doc.set({
            'dc:description': 'foo',
          });
          return doc.save();
        })
        .then((doc) => {
          expect(doc.get('dc:description')).to.be.equal('foo');
        })
    ));

    it('should save a document with a property referencing a BatchBlob', () => {
      const batch = nuxeo.batchUpload();
      const blob = createTextBlob('foo', 'foo.txt');

      return nuxeo.Promise.all([batch.upload(blob), repository.fetch(FILE_TEST_PATH)])
        .then((values) => {
          const batchBlob = values[0].blob;
          const doc = values[1];
          doc.set({ 'file:content': batchBlob });
          return doc.save({ schemas: ['dublincore', 'file'] });
        })
        .then((doc) => {
          expect(doc.get('file:content').name).to.be.equal('foo.txt');
          expect(doc.get('file:content').length).to.be.equal('3');
          expect(doc.get('file:content')['mime-type']).to.be.equal('text/plain');
        });
    });

    it('should save a document with a property referencing an array of BatchBlobs', () => {
      const batch = nuxeo.batchUpload();
      const fooBlob = createTextBlob('foo', 'foo.txt');
      const barBlob = createTextBlob('bar', 'bar.txt');

      return nuxeo.Promise.all([batch.upload(fooBlob, barBlob), repository.fetch(FILE_TEST_PATH)])
        .then((values) => {
          const batchBlobs = values[0].blobs;
          const doc = values[1];
          doc.set({ 'files:files': batchBlobs.map((blob) => { return { file: blob }; }) });
          return doc.save({ schemas: ['dublincore', 'files'] });
        })
        .then((doc) => {
          const files = doc.get('files:files');
          expect(files).to.exist();
          const fooFile = files[0].file;
          expect(fooFile.name).to.be.equal('foo.txt');
          expect(fooFile.length).to.be.equal('3');
          expect(fooFile['mime-type']).to.be.equal('text/plain');
          const barFile = files[1].file;
          expect(barFile.name).to.be.equal('bar.txt');
          expect(barFile.length).to.be.equal('3');
          expect(barFile['mime-type']).to.be.equal('text/plain');
        });
    });
  });

  describe('#fetchBlob', () => {
    it('should download the main blob', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.fetchBlob())
        .then((res) => (isBrowser ? res.blob() : res.body))
        .then((body) => getTextFromBody(body))
        .then((text) => {
          expect(text).to.be.equal('foo');
        })
    ));

    it('should download a blob given a xpath', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.fetchBlob('file:content'))
        .then((res) => (isBrowser ? res.blob() : res.body))
        .then((body) => getTextFromBody(body))
        .then((text) => {
          expect(text).to.be.equal('foo');
        })
    ));
  });

  describe('#move', () => {
    const FOO_PATH_BEFORE = join(WS_JS_TESTS_PATH, 'foo');
    const FOO_PATH_AFTER = join(WS_JS_TESTS_PATH, 'folder', 'foo');
    const FOLDER_PATH = join(WS_JS_TESTS_PATH, 'folder');
    const FOO_PATH_AFTER_RENAMING = join(WS_JS_TESTS_PATH, 'newFoo');

    before(() => {
      const doc = {
        name: 'foo',
        type: 'File',
        properties: {
          'dc:title': 'foo',
        },
      };
      const folder = {
        name: 'folder',
        type: 'Folder',
        properties: {
          'dc:title': 'folder',
        },
      };
      return repository.create(WS_JS_TESTS_PATH, doc)
        .then(() => repository.create(WS_JS_TESTS_PATH, folder));
    });

    it('should move a document keeping its name', () => (
      repository.fetch(FOO_PATH_BEFORE)
        .then((doc) => doc.move(FOLDER_PATH))
        .then((doc) => {
          expect(doc.path).to.be.equal(FOO_PATH_AFTER);
        })
    ));

    it('should move a document changing its final name', () => (
      repository.fetch(FOO_PATH_AFTER)
        .then((doc) => doc.move(WS_JS_TESTS_PATH, 'newFoo'))
        .then((doc) => {
          expect(doc.path).to.be.equal(FOO_PATH_AFTER_RENAMING);
        })
    ));
  });

  describe('#followTransition', () => {
    it('should set the life cycle state to deleted', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.state).to.be.equal('project');
          return doc.followTransition('delete');
        })
        .then((doc) => {
          expect(doc.state).to.be.equal('deleted');
        })
    ));
  });

  describe('#convert', () => {
    describe('should convert the main blob', () => {
      it('using a destination format', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.convert({ format: 'html' }))
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          })
      ));

      it('using a destination mime type', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.convert({ type: 'text/html' }))
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          })
      ));

      it('using a given converter', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.convert({ converter: 'office2html' }))
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          })
      ));
    });

    it('should convert a blob given an xpath', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.convert({ xpath: 'file:content', type: 'text/html' }))
        .then((res) => (isBrowser ? res.blob() : res.body))
        .then((body) => getTextFromBody(body))
        .then((text) => {
          expect(text.indexOf('<html>') >= 0).to.be.true();
          expect(text.indexOf('foo') >= 0).to.be.true();
        })
    ));
  });

  describe('#scheduleConversion', () => {
    function waitForConversion(pollingURL) {
      return new Nuxeo.Promise((resolve, reject) => {
        function isConversionDone() {
          nuxeo._http({ url: pollingURL })
            .then((res) => {
              if (res.status === 'completed') {
                resolve(res);
              } else {
                // let's try again
                isConversionDone();
              }
            })
            .catch((err) => reject(err));
        }
        isConversionDone();
      });
    }

    describe('should schedule a conversion of the main blob', () => {
      it('using a destination format', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.scheduleConversion({ format: 'html' }))
          .then((res) => {
            expect(res['entity-type']).to.be.equal('conversionScheduled');
            expect(res.conversionId).to.exist();
            expect(res.pollingURL).to.exist();
            expect(res.resultURL).to.exist();
            return waitForConversion(res.pollingURL);
          })
          .then((res) => nuxeo._http({ url: res.resultURL }))
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          })
      ));

      it('using a destination mime type', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.scheduleConversion({ type: 'text/html' }))
          .then((res) => {
            expect(res['entity-type']).to.be.equal('conversionScheduled');
            expect(res.conversionId).to.exist();
            expect(res.pollingURL).to.exist();
            expect(res.resultURL).to.exist();
            return waitForConversion(res.pollingURL);
          })
          .then((res) => nuxeo._http({ url: res.resultURL }))
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          })
      ));

      it('using a given converter', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.scheduleConversion({ converter: 'office2html' }))
          .then((res) => {
            expect(res['entity-type']).to.be.equal('conversionScheduled');
            expect(res.conversionId).to.exist();
            expect(res.pollingURL).to.exist();
            expect(res.resultURL).to.exist();
            return waitForConversion(res.pollingURL);
          })
          .then((res) => nuxeo._http({ url: res.resultURL }))
          .then((res) => (isBrowser ? res.blob() : res.body))
          .then((body) => getTextFromBody(body))
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          })
      ));
    });

    it('should schedule a conversion of a blob given an xpath', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.scheduleConversion({ xpath: 'file:content', type: 'text/html' }))
        .then((res) => {
          expect(res['entity-type']).to.be.equal('conversionScheduled');
          expect(res.conversionId).to.exist();
          expect(res.pollingURL).to.exist();
          expect(res.resultURL).to.exist();
          return waitForConversion(res.pollingURL);
        })
        .then((res) => nuxeo._http({ url: res.resultURL }))
        .then((res) => (isBrowser ? res.blob() : res.body))
        .then((body) => getTextFromBody(body))
        .then((text) => {
          expect(text.indexOf('<html>') >= 0).to.be.true();
          expect(text.indexOf('foo') >= 0).to.be.true();
        })
    ));
  });

  describe('#fetchRenditions', () => {
    it('should fetch the renditions list', function f() {
      if (nuxeo.nuxeoVersion < LTS_2016) {
        this.skip();
      }

      return repository.fetch(WS_JS_TESTS_PATH)
        .then((doc) => doc.fetchRenditions())
        .then((renditions) => {
          expect(renditions.length).to.be.equal(3);
          expect(renditions[0].name).to.be.equal('thumbnail');
          expect(renditions[1].name).to.be.equal('xmlExport');
          expect(renditions[2].name).to.be.equal('zipTreeExport');
        });
    });
  });

  describe('#fetchRendition', () => {
    it('should fetch a rendition given its name', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.fetchRendition('xmlExport'))
        .then((res) => (isBrowser ? res.blob() : res.body))
        .then((body) => getTextFromBody(body))
        .then((text) => {
          expect(text).to.contain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(text).to.contain(`<path>${FILE_TEST_PATH.substring(1)}</path>`);
        })
    ));
  });

  describe('#fetchACLs', () => {
    it('should fetch a document ACLS', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.fetchACLs())
        .then((acls) => {
          expect(acls.length).to.be.equal(1);
          expect(acls[0].name).to.be.equal('inherited');
          expect(acls[0].aces[0].id).to.be.equal('Administrator:Everything:true:::');
          expect(acls[0].aces[1].id).to.be.equal('members:Read:true:::');
        })
    ));
  });

  describe('#addPermission', () => {
    it('should add a new permission', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.addPermission({
          username: 'members',
          permission: 'Write',
        }))
        .then((doc) => doc.fetchACLs())
        .then((acls) => {
          expect(acls[0].name).to.be.equal('local');
          expect(acls[0].aces[0].id).to.be.equal('members:Write:true:Administrator::');
        })
    ));
  });

  describe('#removePermission', () => {
    it('should remove a permission', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.removePermission({
          id: 'members:Write:true:Administrator::',
        }))
        .then((doc) => doc.fetchACLs())
        .then((acls) => {
          expect(acls[0].name).to.be.equal('inherited');
        })
    ));
  });

  describe('#hasPermission', () => {
    it('should returns true for Write permission on a document', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.hasPermission('Write'))
        .then((perm) => expect(perm).to.be.true())
    ));

    it('should returns false for a non existing permission on a document', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.hasPermission('Foo'))
        .then((perm) => expect(perm).to.be.false())
    ));

    it('should returns false if the user does not have the permission', () => (
      repository.fetch(FILE_TEST_PATH)
        .then((doc) => doc.addPermission({
          username: 'leela',
          permission: 'Read',
        }))
        .then(() => new Nuxeo({ auth: { method: 'basic', username: 'leela', password: 'leela1' } }))
        .then((n) => n.repository().fetch(FILE_TEST_PATH))
        .then((doc) => doc.hasPermission('Write'))
        .then((perm) => expect(perm).to.be.false())
    ));
  });

  describe('Lock Status', () => {
    describe('#lock', () => {
      it('should lock the document', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.lock())
          .then((doc) => doc.fetchLockStatus())
          .then((status) => {
            expect(status.lockOwner).to.exist();
            expect(status.lockCreated).to.exist();
          })
      ));

      it('should throw an error when locking a document already locked', () => {
        const p = repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.lock());
        return expect(p).to.be.rejected();
      });
    });

    describe('#unlock', () => {
      it('should unlock the document', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.unlock())
          .then((doc) => doc.fetchLockStatus())
          .then((status) => {
            expect(status.lockOwner).to.not.exist();
            expect(status.lockCreated).to.not.exist();
          })
      ));

      it('should do nothing if the document is not locked', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.unlock())
          .then((doc) => doc.fetchLockStatus())
          .then((status) => {
            expect(status.lockOwner).to.not.exist();
            expect(status.lockCreated).to.not.exist();
          })
      ));
    });

    describe('#fetchLockStatus', () => {
      it('should fetch nothing for a non locked document', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.fetchLockStatus())
          .then((status) => {
            expect(status.lockOwner).to.not.exist();
            expect(status.lockCreated).to.not.exist();
          })
      ));

      it('should fetch the lock status of a locked document', () => (
        repository.fetch(FILE_TEST_PATH)
          .then((doc) => doc.lock())
          .then((doc) => doc.fetchLockStatus())
          .then((status) => {
            expect(status.lockOwner).to.exist();
            expect(status.lockOwner).to.be.equal('Administrator');
            expect(status.lockCreated).to.exist();
          })
      ));
    });
  });

  // audit is async, need to wait
  describe('#fetchAudit', () => {
    it('should fetch the audit of the document', () => {
      function pollAudit(doc) {
        return new Nuxeo.Promise((resolve, reject) => {
          function poll() {
            sleep(1000)
            .then(() => doc.fetchAudit())
            .then((res) => {
              if (res.entries.length > 0) {
                resolve(res);
              } else {
                // let's try again
                poll();
              }
            })
            .catch((err) => reject(err));
          }
          poll();
        });
      }

      return repository.fetch(WS_JS_TESTS_PATH)
        .then((doc) => pollAudit(doc))
        .then((res) => {
          expect(res['entity-type']).to.be.equal('logEntries');
          expect(res.entries.length).to.be.equal(1);
          expect(res.entries[0].eventId).to.be.equal('documentCreated');
        });
    });
  });
});
