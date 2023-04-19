
import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';

import { runExtractReferences } from './pipeline';

export function registerCommands(args: YArgsT) {

  registerCmd(
    args,
    'extract-references',
    'Extract PDF references using Grobid service, match with OpenReview papers',
    config(
      opt.env,
      opt.file('pdf: Input pdf file'),
      opt.flag('to-file: Write output to file; Filename is `input.pdf.refs.(txt|json)`', false),
      // opt.dir(
      //   'output-path: Specify a directory to write output (if --to-file=true). Defaults to same as input PDF',
      //   { default: '/dev/null' }
      // ),
      opt.ion('output-path', {
        describe: 'Specify a directory to write output (if --to-file=true). Defaults to same as input PDF',
        type: 'string',
        default: undefined
      }),
      opt.ion('format', {
        describe: 'Specify JSon or plain text output',
        type: 'string',
        choices: ['txt', 'json'],
        default: 'json'
      }),
      opt.flag('overwrite: Overwrite any existing output file', false),
    ),
  )(async (args: any) => {
    const { pdf, toFile, overwrite, format, outputPath } = args;

    await runExtractReferences({ pdf, toFile, overwrite, format, outputPath });
  });

}
