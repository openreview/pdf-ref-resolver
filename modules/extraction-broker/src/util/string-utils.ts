import _ from 'lodash';

import Crypto from 'crypto-js';

export function shaEncodeAsHex(str: string): string {
  const cryptoSha = Crypto.SHA1(str);
  return cryptoSha.toString();
}
