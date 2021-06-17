"use strict";

var Buffer = require('./buffer');

function btoa(str) {
  return Buffer.from(str).toString('base64');
}

module.exports = {
  btoa: btoa
};