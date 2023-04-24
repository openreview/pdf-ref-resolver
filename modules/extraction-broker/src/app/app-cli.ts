import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';

import { runExtractReferences } from './pipeline';
import { initConfig } from '~/util/config';

export function registerCommands(args: YArgsT) {

  registerCmd(
    args,
    'extract-references',
    'Extract PDF references using Grobid service, match with OpenReview papers',
    config(
      // opt.env,
      opt.file('pdf: Input pdf file'),
      opt.flag('to-file: Write output to file; Filename is `input.pdf.refs.(txt|json)`', false),
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
      opt.file('config: Path to config file'),
      opt.flag('overwrite: Overwrite any existing output file', false),
    ),
  )(async (args: any) => {
    const { pdf, toFile, overwrite, format, outputPath, config } = args;

    const loadedConfig = initConfig(config)

    await runExtractReferences({ pdf, toFile, overwrite, format, outputPath, config: loadedConfig });
  });

}
