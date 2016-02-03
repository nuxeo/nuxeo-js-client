'use strict';

import join from '../lib/deps/utils/join';

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
      'entity-type': 'document',
      name: WS_JS_TEST_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    const newDoc2 = {
      'entity-type': 'document',
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
      repository.fetch(FILE_TEST_PATH).then((doc) => {
        expect(doc.get('dc:non-existing')).to.be.undefined();
      });
    });

    it('should return the dirty property value if any', () => {
      repository.fetch(FILE_TEST_PATH).then((doc) => {
        doc.set({
          'dc:description': 'foo',
        });
        expect(doc.get('dc:description')).to.be.equal('foo');
      });
    });
  });
});
