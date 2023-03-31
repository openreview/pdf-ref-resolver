import _ from 'lodash';
import * as E from 'fp-ts/Either'
import * as io from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { prettyPrint } from '~/util/pretty-print';


/**
 * Test function  for io-ts  encoder/decoders
 * Given a  transcoder and an input,  encode and decode several  times to ensure
 * that data is properly serialized.
 **/
export function isIsomorphic<A, IO>(ioType: io.Type<A, IO, IO>, input: IO, verbose = false): boolean {
  const maybeDecoded = ioType.decode(input);
  if (E.isLeft(maybeDecoded)) {
    const report = PathReporter.report(maybeDecoded);
    if (verbose) {
      prettyPrint({ m: `isIsomorphic(${ioType.name})/decode === false`, input, report });
    }
    return false;
  }

  const decoded = maybeDecoded.right;
  if (verbose) {
    prettyPrint({ m: `(1) decode-success: isIsomorphic(${ioType.name})/decode === true`, decoded });
  }
  const reEncoded = ioType.encode(decoded);
  if (!_.isEqual(input, reEncoded)) {
    if (verbose) {
      prettyPrint({
        m: `isIsomorphic(${ioType.name})/re-encode === false`, input, decoded, reEncoded,
      });
    }
    return false;
  }

  if (verbose) {
    prettyPrint({ m: `(2) encode-success: isIsomorphic(${ioType.name})/decode === true`, reEncoded });
  }

  const maybeReDecoded = ioType.decode(reEncoded);
  if (E.isLeft(maybeReDecoded)) {
    const report = PathReporter.report(maybeReDecoded);
    if (verbose) {
      prettyPrint({
        m: `isIsomorphic(${ioType.name})/re-decode === false`, report, input, reEncoded,
      });
    }
    return false;
  }
  if (verbose) {
    console.log('isIsomorphic: decoded 3');
  }

  const reDecoded = maybeReDecoded.right;

  if (!_.isEqual(decoded, reDecoded)) {
    if (verbose) {
      prettyPrint({
        m: `isIsomorphic(${ioType.name})/re-decode === false`, input, decoded, reDecoded,
      });
    }
    return false;
  }
  if (verbose) {
    console.log('isIsomorphic: decoded 3');
  }

  if (verbose) {
    prettyPrint({
      m: `isIsomorphic(${ioType.name}) === true`, input, decoded, reEncoded, reDecoded,
    });
  }

  return true;
}
