var chai = require("chai");
var expect = chai.expect;
var nuxeo = require("../lib/node/nuxeo");

var client = new nuxeo.Client();
client.schemas(["dublincore", "file"]);

describe("REST tests", function() {
  var doc;

  it("fetch domain document", function(done) {
    client.document("/default-domain")
      .fetch(function(error, data) {
        if (error) {
          throw error;
        }

        doc = data;
        expect(doc.uid).to.exist;
        done();
      });
  });

  it("update fetched document", function(done) {
    var newSourceValue = 'automaton-test-' + (new Date()).getTime();
    doc.set({ "dc:source": newSourceValue });

    expect(doc.dirtyProperties["dc:source"]).to.exist;
    expect(doc.dirtyProperties["dc:source"]).to.equal(newSourceValue);

    doc.save(function(error, data, response) {
      expect(data.uid).to.exist;
      expect(data.properties['dc:source']).to.equal(newSourceValue);
      done();
    });
  })

});
