import _ from 'lodash';
import * as E from 'fp-ts/Either'
import * as io from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { prettyPrint } from '~/util/pretty-print';
import {
  Attributes,
  Elem,
  Monogr,
  PersName
} from './grobid-schemas'

describe('Grobid Schemas', () => {
  const pers = {
    persName: {
      forename: { _attributes: { type: 'first' }, _text: 'Y' },
      surname: { _text: 'Abbasi-Yadkori' }
    }
  }


  const sampleDoc = {
    _attributes: { 'xml:id': 'b0' },
    analytic: {
      title: {
        _attributes: { level: 'a', type: 'main' },
        _text: 'Improved algorithms for linear stochastic bandits'
      },
      author: [
        {
          persName: {
            forename: { _attributes: { type: 'first' }, _text: 'D' },
            surname: { _text: 'Pál' }
          }
        },
        {
          persName: {
            forename: { _attributes: { type: 'first' }, _text: 'C' },
            surname: { _text: 'Szepesvári' }
          }
        }
      ]
    },
    monogr: {
      title: {
        _attributes: { level: 'j' },
        _text: 'Advances in neural information processing systems'
      },
      imprint: {
        biblScope: { _attributes: { unit: 'volume' }, _text: '24' },
        date: {
          _attributes: { type: 'published', when: '2011' },
          _text: '2011'
        }
      }
    }
  };

  const attrExamples = [
    { type: 'first' },
    { type: 'main', level: 'q' },
    { 'xml:id': 'id00' },
  ];
  it('should encode/decode attributes', () => {
    attrExamples.forEach(example => {
      expect(isIsomorphic(Attributes, example)).toEqual(true);
    });
  });

  const elemExamples = [
    { _attributes: { type: 'first' }, _text: 'Y' },
    { _attributes: { type: 'main', level: '4' } },
    { _text: 'Blah' },
  ];
  it('should encode/decode elems', () => {
    elemExamples.forEach(example => {
      expect(isIsomorphic(Elem, example)).toEqual(true);
    });
  });

  it('should encode/decode person names', () => {
    const examples = [
      {
        forename: { _attributes: { type: 'first' }, _text: 'Y' },
        surname: { _text: 'Abbasi-Yadkori' }
      }
    ];

    examples.forEach(example => {
      expect(isIsomorphic(PersName, example)).toEqual(true);
    });
  });

  it('should encode/decode monogr elem', () => {
    const examples = [
      {
        title: {
          _attributes: { type: 'sample', level: 'j' },
          _text: 'Advances in neural information processing systems'
        },
        imprint: {
          biblScope: { _attributes: { unit: 'volume' }, _text: '24' },
          date: {
            _attributes: { type: 'published', when: '2011' },
            _text: '2011'
          }
        }
      }
    ];
    examples.forEach(example => {
      expect(isIsomorphic(Monogr, example)).toEqual(true);
    });
  });
});



export function isIsomorphic<A, IO>(ioType: io.Type<A, IO, IO>, input: IO, verbose: boolean = false): boolean {
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
