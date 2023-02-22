import {
  registerCmd,
  config,
  opt,
  YArgs
} from '~/cli/arglib'

registerCmd(
  YArgs,
  'corpus-server',
  'server filesystem artifacts from corpus',
  config(
    opt.cwd,
    opt.existingDir('corpus-root: root directory for corpus files'),
  ),
)((args: any) => {
  const { corpusRoot } = args;

});

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
YArgs
  .demandCommand(1, 'You need at least one command before moving on')
  .strict()
  .help()
  .fail((err: any) => {
    console.log('Error', err);
    YArgs.showHelp();
  })
  .argv;
