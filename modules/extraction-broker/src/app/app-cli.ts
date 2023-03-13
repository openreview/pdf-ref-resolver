
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
      opt.file('pdf'),
      // opt.str('out'),
    ),
  )(async (args: any) => {
    const { pdf } = args;

    await runExtractReferences({ pdf });

    // TODO opt: write xml
    // TODO opt: commit to db
    // TODO opt: print results
    //
    // fs.writeFileSync(out, result.right);
    // .catch((error: Error) => {
    //   putStrLn(`Error: ${error.message}`);
    // })
  });
}
