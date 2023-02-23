import _ from 'lodash';
import * as io from 'io-ts';

const attrTypes = io.partial({
  level: io.string,
  type: io.string,
  'xml:id': io.string,
  'unit': io.string,
});

export const Elem = io.partial({
  _attributes: attrTypes,
  _text: io.string
}, 'Elem');

export const PersName = io.type({
  forename: Elem,
  surname: Elem,
}, 'PersName');


// export const Title = io.alias(Elem, '');

// export const GlyphRef = io.union([
//   io.Int,
//   io.string,
// ], 'GlyphRef');

// export const Line = io.strict({
//   text: io.string,
//   glyphs: io.array(GlyphRef),
// }, 'Line');

// export type Line = io.TypeOf<typeof Line>;

// {
//     _attributes: { 'xml:id': 'b0' },
//     analytic: {
//       title: {
//         _attributes: { level: 'a', type: 'main' },
//         _text: 'Improved algorithms for linear stochastic bandits'
//       },
//       author: [
//         {
//           persName: {
//             forename: { _attributes: { type: 'first' }, _text: 'Y' },
//             surname: { _text: 'Abbasi-Yadkori' }
//           }
//         },
//         {
//           persName: {
//             forename: { _attributes: { type: 'first' }, _text: 'D' },
//             surname: { _text: 'Pál' }
//           }
//         },
//         {
//           persName: {
//             forename: { _attributes: { type: 'first' }, _text: 'C' },
//             surname: { _text: 'Szepesvári' }
//           }
//         }
//       ]
//     },
//     monogr: {
//       title: {
//         _attributes: { level: 'j' },
//         _text: 'Advances in neural information processing systems'
//       },
//       imprint: {
//         biblScope: { _attributes: { unit: 'volume' }, _text: '24' },
//         date: {
//           _attributes: { type: 'published', when: '2011' },
//           _text: '2011'
//         }
//       }
//     }
//   },
