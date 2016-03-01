'use strict';

import join from '../lib/deps/utils/join';
import { createTextBlob, getTextFromBody } from './helpers/blob-helper';

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);
const FILE_TEST_NAME = 'bar.txt';
const FILE_TEST_PATH = join(WS_JS_TESTS_PATH, FILE_TEST_NAME);

describe('Document', () => {
  let nuxeo;
  let repository;

  before(() => {
    nuxeo = new Nuxeo({ auth: { username: 'Administrator', password: 'Administrator' } });
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
    return nuxeo.repository().create(WS_ROOT_PATH, newDoc)
      .then(() => nuxeo.repository().create(WS_JS_TESTS_PATH, newDoc2));
  });

  after(() => {
    return repository.delete(WS_JS_TESTS_PATH);
  });

  it('should be retrieved from a Repository', () => {
    return repository.fetch('/default-domain').then((doc) => {
      expect(doc).to.be.an.instanceof(Nuxeo.Document);
      expect(doc.uid).to.exist();
    });
  });

  describe('#isFolder', () => {
    it('should return true for a folderish document', () => {
      return repository.fetch('/default-domain').then((doc) => {
        expect(doc.isFolder()).to.be.true();
      });
    });
    it('should return false for a non-folderish document', () => {
      return repository.fetch(FILE_TEST_PATH).then((doc) => {
        expect(doc.isFolder()).to.be.false();
      });
    });
  });

  describe('#set', () => {
    it('should fill only dirtyProperties field', () => {
      return repository.fetch(FILE_TEST_PATH).then((doc) => {
        doc.set({
          'dc:description': 'foo',
        });
        expect(doc.properties['dc:description']).to.be.null();
        expect(doc._dirtyProperties['dc:description']).to.be.equal('foo');
      });
    });
  });

  describe('#get', () => {
    it('should return a property value', () => {
      return repository.fetch(FILE_TEST_PATH).then((doc) => {
        expect(doc.get('dc:title')).to.be.equal('bar.txt');
      });
    });

    it('should return undefined for non existing property', () => {
      return repository.fetch(FILE_TEST_PATH).then((doc) => {
        expect(doc.get('dc:non-existing')).to.be.undefined();
      });
    });

    it('should return the dirty property value if any', () => {
      return repository.fetch(FILE_TEST_PATH).then((doc) => {
        doc.set({
          'dc:description': 'foo',
        });
        expect(doc.get('dc:description')).to.be.equal('foo');
      });
    });
  });

  describe('#save', () => {
    it('should save an updated document', () => {
      return repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          expect(doc.get('dc:description')).to.be.null();
          doc.set({
            'dc:description': 'foo',
          });
          return doc.save();
        }).then((doc) => {
          expect(doc.get('dc:description')).to.be.equal('foo');
        });
    });

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
  });

  describe('#fetchBlob', () => {
    it('should download the main blob', () => {
      return repository.fetch(FILE_TEST_PATH)
        .then(doc => doc.fetchBlob())
        .then(res => isBrowser ? res.blob() : res.body)
        .then(body => getTextFromBody(body))
        .then((text) => {
          expect(text).to.be.equal('foo');
        });
    });

    it('should download a blob given a xpath', () => {
      return repository.fetch(FILE_TEST_PATH)
        .then(doc => doc.fetchBlob('file:content'))
        .then((res) => isBrowser ? res.blob() : res.body)
        .then(body => getTextFromBody(body))
        .then((text) => {
          expect(text).to.be.equal('foo');
        });
    });
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

    it('should move a document keeping its name', () => {
      return repository.fetch(FOO_PATH_BEFORE).then((doc) => {
        return doc.move(FOLDER_PATH);
      }).then((doc) => {
        expect(doc.path).to.be.equal(FOO_PATH_AFTER);
      });
    });

    it('should move a document changing its final name', () => {
      return repository.fetch(FOO_PATH_AFTER).then((doc) => {
        return doc.move(WS_JS_TESTS_PATH, 'newFoo');
      }).then((doc) => {
        expect(doc.path).to.be.equal(FOO_PATH_AFTER_RENAMING);
      });
    });
  });

  describe('#followTransition', () => {
    it('should set the life cycle state to deleted', () => {
      return repository.fetch(FILE_TEST_PATH).then((doc) => {
        expect(doc.state).to.be.equal('project');
        return doc.followTransition('delete');
      }).then((doc) => {
        expect(doc.state).to.be.equal('deleted');
      });
    });
  });

  describe('#convert', () => {
    describe('should convert the main blob', () => {
      it('using a destination format', () => {
        return repository.fetch(FILE_TEST_PATH)
          .then((doc) => {
            return doc.convert({ format: 'html' });
          })
          .then((res) => isBrowser ? res.blob() : res.body)
          .then((body) => {
            return getTextFromBody(body);
          })
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          });
      });

      it('using a destination mime type', () => {
        return repository.fetch(FILE_TEST_PATH)
          .then((doc) => {
            return doc.convert({ type: 'text/html' });
          })
          .then((res) => isBrowser ? res.blob() : res.body)
          .then((body) => {
            return getTextFromBody(body);
          })
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          });
      });

      it('using a given converter', () => {
        return repository.fetch(FILE_TEST_PATH)
          .then((doc) => {
            return doc.convert({ converter: 'office2html' });
          })
          .then((res) => isBrowser ? res.blob() : res.body)
          .then((body) => {
            return getTextFromBody(body);
          })
          .then((text) => {
            expect(text.indexOf('<html>') >= 0).to.be.true();
            expect(text.indexOf('foo') >= 0).to.be.true();
          });
      });
    });

    it('should convert a blob given an xpath', () => {
      return repository.fetch(FILE_TEST_PATH)
        .then((doc) => {
          return doc.convert({ xpath: 'file:content', type: 'text/html' });
        })
        .then((res) => isBrowser ? res.blob() : res.body)
        .then((body) => {
          return getTextFromBody(body);
        })
        .then((text) => {
          expect(text.indexOf('<html>') >= 0).to.be.true();
          expect(text.indexOf('foo') >= 0).to.be.true();
        });
    });
  });

  describe('#fetchRenditions', () => {
    it('should fetch the renditions list', () => {
      return repository.fetch(FILE_TEST_PATH)
        .then(doc => doc.fetchRenditions())
        .then((renditions) => {
          expect(renditions.length).to.be.equal(3);
          expect(renditions[0].name).to.be.equal('thumbnail');
          expect(renditions[1].name).to.be.equal('zipExport');
          expect(renditions[2].name).to.be.equal('xmlExport');
        });
    });
  });

  describe('#fetchRendition', () => {
    it('should fetch a rendition given its name', () => {
      return repository.fetch(FILE_TEST_PATH)
        .then(doc => doc.fetchRendition('xmlExport'))
        .then(res => isBrowser ? res.blob() : res.body)
        .then(body => getTextFromBody(body))
        .then((text) => {
          expect(text).to.contain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(text).to.contain(`<path>${FILE_TEST_PATH.substring(1)}</path>`);
        });
    });
  });
});
