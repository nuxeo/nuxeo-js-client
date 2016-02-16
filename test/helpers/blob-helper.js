'use strict';

export function createTextBlob(content, name) {
  let blob;
  if (isBrowser) {
    blob = new Blob([content], {
      type: 'text/plain',
    });
  } else {
    blob = content;
  }

  return new Nuxeo.Blob({
    name,
    content: blob,
    mimeType: 'text/plain',
    size: content.length,
  });
}

export function assertTextBlobContent(body, text, size, done) {
  if (isBrowser) {
    expect(body).to.be.an.instanceof(Blob);
    expect(body.size).to.be.equal(size);
    if (support.readBlob) {
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        const dataView = new DataView(reader.result);
        const decoder = new TextDecoder('utf-8');
        expect(decoder.decode(dataView)).to.be.equal(text);
        done();
      });
      reader.readAsArrayBuffer(body);
    }
  } else {
    body.on('data', (chunk) => {
      if (chunk === null) {
        return;
      }
      expect(chunk.toString()).to.equal('foo');
    });
    body.on('end', () => {
      done();
    });
  }
}
