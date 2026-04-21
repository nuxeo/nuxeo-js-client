/* eslint no-undef: 0 */

/**
 * FormData subclass that adds an appendWithMimeType helper.
 * Avoids monkey-patching the global FormData prototype.
 */
class NuxeoFormData extends FormData {
  /**
   * Appends a value with a specific MIME type by wrapping it in a Blob.
   *
   * @param {string} key - The form field name.
   * @param {*} value - The value to append.
   * @param {string} mimeType - The MIME type for the Blob wrapper.
   */
  appendWithMimeType(key, value, mimeType) {
    const blob = new Blob([value], { type: mimeType });
    this.append(key, blob);
  }
}

module.exports = NuxeoFormData;
