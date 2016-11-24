'use strict';

const Buffer = require('./buffer');

function btoa(str) {
  return new Buffer(str).toString('base64');
}

module.exports = {
  btoa,
};
