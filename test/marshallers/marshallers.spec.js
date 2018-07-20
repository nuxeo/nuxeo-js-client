const { documentMarshaller } = require('../../lib/marshallers/marshallers');

const ACTUAL_SIMPLE_DOCUMENT = require('./actual-simple-document');
const EXPECTED_SIMPLE_DOCUMENT = require('./expected-simple-document');
const ACTUAL_COMPLEX_DOCUMENT = require('./actual-complex-document');
const EXPECTED_COMPLEX_DOCUMENT = require('./expected-complex-document');

describe('Marshallers', () => {
  describe('Document marshaller', () => {
    it('should keep only required fields', () => {
      const obj = documentMarshaller(ACTUAL_SIMPLE_DOCUMENT);
      expect(obj).to.have.all.keys('entity-type', 'uid', 'properties', 'type');
      expect(obj).to.not.have.all.keys('isLocked', 'path');
      expect(obj).to.deep.equal(EXPECTED_SIMPLE_DOCUMENT);
    });

    it('should process properties', () => {
      const obj = documentMarshaller(ACTUAL_COMPLEX_DOCUMENT);
      expect(obj).to.deep.equal(EXPECTED_COMPLEX_DOCUMENT);
    });
  });
});
