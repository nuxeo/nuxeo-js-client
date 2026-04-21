/* global FileReader */

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
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let data = '';
      const read = () => reader.read().then(({ done, value }) => {
        if (done) {
          resolve(data);
          return undefined;
        }
        data += decoder.decode(value, { stream: true });
        return read();
      });
      read();
    }
  });
}

module.exports = {
  createTextBlob,
  getTextFromBody,
};
