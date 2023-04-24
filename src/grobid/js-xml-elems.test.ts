import { prettyPrint } from '~/util/pretty-print';
import { findElement, parseJSDocument } from './js-xml-elems';

//
describe('JSElem traversal', () => {

  it('should parse jselem formats', () => {
    const examples = [
      { elements: [] }
    ]
    examples.forEach(example => {
      const parsed = parseJSDocument(example);
      prettyPrint({ parsed });
    })
  });
})
