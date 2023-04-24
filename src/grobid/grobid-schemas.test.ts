import _ from 'lodash';
import { isIsomorphic } from '~/util/io-ts-utils';

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

  it.only('should encode/decode person names', () => {
    const examples = [
      { persName: {
        forename: { _attributes: { type: 'first' }, _text: 'Y' },
        surname: { _text: 'Abbasi-Yadkori' }
      }}
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
