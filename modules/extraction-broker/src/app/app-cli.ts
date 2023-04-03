
import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';

import { runExtractReferences } from './pipeline';
import { OpenReviewQueries } from '~/openreview/openreview-queries';
import { putStrLn } from '~/util/pretty-print';

export function registerCommands(args: YArgsT) {

  registerCmd(
    args,
    'extract-references',
    'Extract PDF references using Grobid service, match with OpenReview papers',
    config(
      opt.env,
      opt.file('pdf: input pdf file'),
      // opt.flag('recursive', false),
      opt.flag('to-file', false),
      opt.ion('format', {
        describe: 'Specify JSon or plain text output',
        type: 'string',
        choices: ['txt', 'json'],
        default:'json'
        
      }),
      opt.flag('to-console', true),
      opt.flag('overwrite', false),
    ),
  )(async (args: any) => {
    const { pdf, toFile, toConsole, overwrite, format } = args;

    await runExtractReferences({ pdf, toFile, toConsole, overwrite, format });
  });

  registerCmd(
    args,
    'test-login',
    'just for testing',
    config(
      opt.env,
    ),
  )(async (args: any) => {
    const { env } = args;

    const q = new OpenReviewQueries();
    await q.openExchange.getCredentials();
    putStrLn('Done..')
  });
}
