import 'chai';

import _ from 'lodash';
import yargs from 'yargs';
import {
  config, opt, ArgvApp, registerCmd, YArgs,
} from './arglib';

describe('Arglib tests', () => {
  beforeEach(() => {
    // yargs.reset()
  });

  it('should register multiple commands', () => {
    registerCmd(
      yargs,
      'extract-abstracts',
      'run the abstract field extractors over htmls in corpus',
      config(
        opt.cwd,
        opt.existingDir('corpus-root: root directory for corpus files'),
        opt.ion('overwrite: force overwrite of existing files', { boolean: false }),
      ),
    )((_args: any) => {
      // prettyPrint({ msg: 'success!', args });
    });

    const args1 = 'extract-abstracts --cwd . --corpus-root a/b/c --overwrite'.split(' ');
    // const args1b = 'extract-abstracts --cwd . --corpus-root . --overwrite'.split(' ');

    registerCmd(
      yargs,
      'c1',
      'run c1',
      opt.existingDir('dir: dir 0'),
    )((_args: any) => {
      // prettyPrint({ 'running cmd': args })
    });
    // const args2 = 'c1 --dir non-existent'.split(' ');

    // YArgs
    //   .demandCommand(1, 'You need at least one command before moving on')
    //   .fail((_msg, _err, _yargs) => {
    //     // const errmsg = err ? `${err.name}: ${err.message}` : '';
    //     // prettyPrint({ msg, errmsg });
    //   }).parse(args1);
  });

  async function runCmd(args: string, ...fs: ArgvApp[]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      yargs.command(
        'testcmd', 'desc', config(...fs), (argv: any) => resolve(argv),
      );
      const argtokens = args.split(' ');
      const allargs = _.concat(['testcmd'], argtokens);
      // prettyPrint({ allargs });

      yargs
        .demandCommand(1, 'You need at least one command before moving on')
        .fail((msg, _err, _yargs) => {
          // const errmsg = err ? `${err.name}: ${err.message}` : '';
          // prettyPrint({ msg, errmsg });
          reject(msg);
        }).parse(allargs);
    });
  }

  it('should resolve file/directory args', async () => {
    const result = await runCmd(
      '--cwd . --corpus-root /foobar',
      opt.cwd,
      opt.existingDir('corpus-root: root directory for corpus files'),
    ).catch(_error => {
      // prettyPrint({ caughtErr });
    });
    if (result) {
      const errors: string[] = result.errors as any;
      expect(errors.length).toBe(1);
      expect(errors[0]).toMatch(/foobar doesn't exist/);
    }
  });
});
