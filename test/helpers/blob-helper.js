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

export function getTextFromBody(body) {
  return new Nuxeo.Promise((resolve) => {
    if (isBrowser) {
      if (support.readBlob) {
        const reader = new FileReader();
        reader.addEventListener('loadend', () => {
          const dataView = new DataView(reader.result);
          const decoder = new TextDecoder('utf-8');
          resolve(decoder.decode(dataView));
        });
        reader.readAsArrayBuffer(body);
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
