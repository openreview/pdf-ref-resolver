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
      opt.file('pdf: Input pdf file'),
      opt.ion('output-path', {
        describe: 'Specify a directory to write output. Defaults to same as input PDF',
        type: 'string',
        default: undefined
      }),
      opt.file('config: Path to config file'),
      opt.flag('overwrite: Overwrite any existing output file', false),
      opt.flag('with-matched: only output references that match an OpenReview note', false),
      opt.flag('with-unmatched: only output references that *do not* match an OpenReview note', false),
      opt.flag('with-partial-matched: only output references with match < 100% to an OpenReview note', false),
      opt.flag('with-source: include the raw Grobid data in the output (verbose, for debugging)', false),
    ),
  )(async (args: any) => {
    const { config } = args;

    const loadedConfig = initConfig(config)

    await runExtractReferences({
      ...args,
      config: loadedConfig,
    });
  });

}
