import * as util from 'util';
import _ from 'lodash';

function getCallerContext() {
  function getErrorObject(): Error {
    try { throw new Error('unused'); } catch (error: any) { return error; }
  }

  // Get caller context
  const err = getErrorObject();
  const { stack } = err;
  let lines = stack ? stack.split('\n') : [];
  lines = _.dropWhile(lines, (l) => !l.includes('at prettyPrint'));
  lines = _.drop(lines, 1);
  lines = _.takeWhile(lines, l => !l.includes('node_modules'));
  lines = _.take(lines, 3);
  let lpad = '  ';
  const callerContext = _.join(_.map(_.reverse(lines), l => {
    let line = _.trim(l);
    const index = line.indexOf('at ');
    line = line.slice(index + 3, line.length);
    const parts = _.split(line, '(');
    const callingContext = _.trim(parts[0]);
    const [path, lineNum, col] = _.split(parts[1], ':');

    _.dropRight(col, 1);

    const pathParts = _.split(path, '/');
    const endPath = _.join(_.slice(pathParts, pathParts.length - 2, pathParts.length), '/');
    const result = `>${lpad}${callingContext}: ${endPath}: ${lineNum}`;
    lpad += lpad;

    return result;
  }), '\n');

  return callerContext;
}

export type InspectOptions = util.InspectOptions & {
  // show calling context in ouput
  showContext: boolean;
};

const inspectOptionDefaults: InspectOptions = {
  showHidden: false,
  depth: 8,
  customInspect: true,
  showProxy: true,
  colors: true,
  maxArrayLength: 100,
  breakLength: 80,
  compact: 10,
  sorted: false,
  getters: false,
  showContext: false,
};

/**
 * Prints out one or more expressions directly to process.stdout, with a few
 *   improvements over console.log to make debug printing easier.
 * Usage:
 *   let x=1, y=2, z=3;
 *   prettyPrint({x, y, z}); <== note use of braces
 *
 * prints:
 *      --- at:
 *      >  caller1: path/file.js: 68
 *      >    caller2: path/file.js: 216
 *
 *      x: 1
 *      y: 2
 *      z: 3
 *      ===
 */
const [fst, lst, mid, sole] = '╭╰│═'.split(''); /*  "┏┗┃═" */

export function prettyPrint(vsobj: any, options: Partial<InspectOptions> = {}): void {
  let callerContext = '';
  const opts: InspectOptions = _.merge({}, inspectOptionDefaults, options);

  if (opts.showContext) {
    callerContext = getCallerContext();
    callerContext = `--- at:  ${callerContext}\n`;
  }

  const props = Object.getOwnPropertyNames(vsobj);
  const lens = _.map(props, p => p.length);
  const maxlen = _.max(lens) || 0;

  const fmt = _.join(_.map(props, (p, pi) => {
    const isSolo = props.length === 1;
    const isFirst = pi === 0;
    const isLast = pi === props.length - 1;
    let prefixChar = mid;
    if (isFirst) prefixChar = fst;
    else if (isLast) prefixChar = lst;
    else if (isSolo) prefixChar = sole;

    const o = vsobj;
    const v = o[p];
    const ins = util.inspect(v, opts);
    const insLines = ins.split('\n');
    const ins0 = insLines[0];

    const indented = _.map(insLines.slice(1), (l) => {
      const indentPad = ''.padEnd(maxlen);
      return `    ${indentPad}${l}`;
    }).join('\n');
    const continuation = indented.length > 0 ? `\n${indented}` : '';
    return `  ${prefixChar} ${p.padEnd(maxlen)}: ${ins0}${continuation}`;
  }), '\n');

  const output = callerContext + fmt;
  putStrLn(output);
}

export function putStrLn(...vs: any[]) {
  const fmts = _.map(vs, v => {
    if (_.isString(v)) {
      return v;
    }
    return util.inspect(v, inspectOptionDefaults);
  });
  const fmt = fmts.join(' ');
  process.stdout.write(fmt);
  process.stdout.write('\n');
}
