'use strict';

import Buffer from './buffer';

export function btoa(str) {
  return new Buffer(str).toString('base64');
}
