'use strict';

function createTextBlob(content, name) {
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

function getTextFromBody(body) {
  return new Nuxeo.Promise((resolve) => {
    if (isBrowser) {
      if (support.readBlob) {
        const reader = new FileReader();
        reader.addEventListener('loadend', () => {
          resolve(reader.result);
        });
        reader.readAsText(body, 'utf-8');
      } else {
        resolve();
      }
    } else {
      let data = '';
      body.on('data', (chunk) => {
        if (chunk === null) {
          return;
        }
        data += chunk.toString();
      });
      body.on('end', () => {
        resolve(data);
      });
    }
  });
}

module.exports = {
  createTextBlob,
  getTextFromBody,
};
