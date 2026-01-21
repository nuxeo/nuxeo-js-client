/* eslint no-undef: 0 */

FormData.prototype.appendWithMimeType = function appendWithMimeType(key, value, mimeType) {
  const blob = new Blob([value], { type: mimeType });
  this.append(key, blob);
};

FormData.prototype.getContentType = function getContentType() {
  return 'multipart/form-data';
};

FormData.prototype.isBrowser = function isBrowser() {
  return true;
};

module.exports = FormData;
