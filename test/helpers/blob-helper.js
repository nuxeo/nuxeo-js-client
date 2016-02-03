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
