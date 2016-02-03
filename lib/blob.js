'use strict';

/**
 * The `Blob` class represents an abstraction over a blob to be used in the APIs.
 *
 * @example
 * // in the browser, assuming you have a File object from an input for instance
 * var blob = new Nuxeo.Blob({ content: file });
 * // in node
 * var file = fs.createReadStream(filePath);
 * var stats = fs.statSync(filePath);
 * var blob = new Nuxeo.Blob({
 *    content: file,
 *    name: path.basename(filePath1),
 *    mimeType: 'text/plain',
 *    size: stats.size,
 *  });
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Blob =
/*
 * Creates a Blob.
 * @param {string} opts.content - The content of the Blob. Could be a File or Blob object in the browser.
 * @param {string} opts.name - The name of the Blob. It overrides the one from content.name.
 * @param {string} opts.mimeType - The mime-type of the Blob. It overrides the one from content.type.
 * @param {string} opts.size - The size of the Blob. It overrides the one from content.size.
 */
function Blob() {
  var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  _classCallCheck(this, Blob);

  this.content = opts.content;
  this.name = opts.name || this.content.name;
  this.mimeType = opts.mimeType || this.content.type;
  this.size = opts.size || this.content.size;
};

exports.default = Blob;
module.exports = exports['default'];