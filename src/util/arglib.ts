import _ from 'lodash';

import fs from 'fs-extra';
import path from 'path';

import yargs, { Argv, Arguments, Options, MiddlewareFunction } from 'yargs';

import { hideBin } from 'yargs/helpers';
import { putStrLn, prettyPrint } from '../util/pretty-print';


export function yargsInstance(): yargs.Argv {
  return yargs(hideBin(process.argv));
}

export type YArgsT = yargs.Argv;

export type ArgvApp = (ya: Argv) => Argv;

export function config(...fs: ArgvApp[]): ArgvApp {
  return ya => _.reduce(fs, (acc, f) => f(acc), ya);
}

function resolveArgPath(argv: Arguments, pathkey: string): string | undefined {
  if (typeof argv[pathkey] !== 'string') {
    return;
  }

  let pathvalue = argv[pathkey] as string;

  if (!path.isAbsolute(pathvalue)) {
    const wd = argv.cwd;
    pathvalue = typeof wd === 'string' ? path.resolve(wd, pathvalue) : path.resolve(pathvalue);
  }
  pathvalue = path.normalize(pathvalue);
  const ccKey = _.camelCase(pathkey);

  argv[pathkey] = pathvalue;
  argv[ccKey] = pathvalue;

  return pathvalue;
}

export const setCwd = (ya: Argv): Argv => ya.option('cwd', {
  describe: 'set working directory',
  normalize: true,
  type: 'string',
  requiresArg: true,
});

const optAndDesc = (optAndDesc: string, ext?: Options) => (ya: Argv): Argv => {
  const [optname, desc] = optAndDesc.includes(':')
    ? optAndDesc.split(':').map(o => o.trim())
    : [optAndDesc, ''];

  const opts = ext || {};
  if (desc.length > 0) {
    opts.description = desc;
  }

  return ya.option(optname, opts);
};

const optFlag = (odesc: string, def?: boolean) => optAndDesc(odesc, {
  type: 'boolean',
  demandOption: def === undefined,
  default: def
});

const optNum = (odesc: string, def?: number) => optAndDesc(odesc, {
  type: 'number',
  demandOption: def === undefined,
  default: def
});

const optString = (odesc: string, def?: string) => optAndDesc(odesc, {
  type: 'string',
  demandOption: def === undefined,
  default: def
});

const optEnv0 = optAndDesc('env:Specify NODE_ENV', {
  type: 'string',
  choices: ['dev', 'prod'],
  default: 'dev'
});

const optEnv = (ya: Argv) => {
  ya.option('env', {
    describe: 'Specify NODE_ENV',
    type: 'string',
    choices: ['dev', 'prod'],
    default: 'dev'
  });

  const middleFunc: MiddlewareFunction = (argv: Arguments) => {
    const argvEnv = typeof argv.env === 'string' ? argv.env : 'dev'
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = env || argvEnv;
  };

  ya.middleware(middleFunc, /* applyBeforeValidation= */ true);

  return ya;
};

const existingPath = (pathAndDesc: string, overrideArgs?: Partial<Options>) => (ya: Argv) => {
  let [pathname, desc] = pathAndDesc.includes(':')
    ? pathAndDesc.split(':')
    : [pathAndDesc, `directory ${pathAndDesc}`];

  pathname = pathname.trim();
  desc = desc.trim();

  const optArgs: Options = {
    describe: desc,
    type: 'string',
    demandOption: true,
    requiresArg: true,
  };
  if (overrideArgs) {
    Object.assign(optArgs, overrideArgs);
  }


  ya.option(pathname, optArgs);

  const middleFunc: MiddlewareFunction = (argv: Arguments) => {
    const p = resolveArgPath(argv, pathname);
    if (p && fs.existsSync(p)) {
      return;
    }

    const errorMsg = `--${pathname}: Path doesn't exist: ${p}`;

    putStrLn(errorMsg);

    _.update(argv, ['errors'], (prev: string[] | undefined | null) => {
      const newval = prev || [];
      return _.concat(newval, [`--${pathname}: Path doesn't exist: ${p}`]);
    });
  };

  ya.middleware(middleFunc, /* applyBeforeValidation= */ true);

  return ya;
};

export const existingDir = (dirAndDesc: string, overrideArgs?: Partial<Options>): (ya: Argv) => Argv => {
  return existingPath(dirAndDesc, overrideArgs);
};

export const existingFile = (fileAndDesc: string): (ya: Argv) => Argv => {
  return existingPath(fileAndDesc);
};

export const configFile = (ya: Argv): Argv => {
  ya.option('config', {
    describe: 'optional path to configuration file',
    type: 'string',
    requiresArg: true,
  });

  ya.middleware((argv: Arguments) => {
    if (typeof argv.config === 'string') {
      const configFile = resolveArgPath(argv, 'config');
      if (!configFile) {
        throw new Error('Non-existent config file specified');
      }
      // Set working directory to config file dir if not already set
      // if (!argv.cwd) {
      //   argv.cwd = path.dirname(configFile);
      // }
      const buf = fs.readFileSync(configFile);
      const conf = JSON.parse(buf.toString());
      const confKVs = _.toPairs(conf);
      _.each(confKVs, ([k, v]) => {
        argv[k] = v;
      });
      return;
    }
    return;
  }, /* applyBeforeValidation= */ true);

  return ya;
};


export const setOpt = (ya: Argv) => {
  return ya.option;
};

export function registerCmd(
  useYargs: Argv,
  name: string,
  description: string,
  ...fs: ArgvApp[]
): (cb: (parsedArgs: any) => void | Promise<void>) => void {
  return (cb: (parsedArgs: any) => void | Promise<void>) => {
    useYargs.command(
      name, description, config(...fs), async (argv: any): Promise<void> => {
        if (_.isArray(argv.errors)) {
          const errors: string[] = argv.errors;
          const errstr = errors.join('\n');
          putStrLn(`Error running Command: ${errstr}`);
          return;
        }
        // const time1 = (new Date()).toLocaleTimeString();
        const res = await Promise.resolve(cb(argv));
        // const time2 = (new Date()).toLocaleTimeString();
        return res;
      }
    );
  };
}

import { argv } from 'process';

export async function runRegisteredCmds(useYargs: Argv): Promise<void> {
  const scriptpath = argv[1];
  const script = path.basename(scriptpath);
  const res = useYargs
    .scriptName(script)
    .strictOptions()
    .strictCommands()
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .fail((msg: string, err: Error, yargInst) => {
      console.log('RunCLI Error', msg);
      yargInst.showHelp();
    })
    .argv;

  await Promise.resolve(res);
}

export const opt = {
  config: configFile,
  existingDir,
  existingFile,
  obj: setOpt,
  dir: existingDir,
  file: existingFile,
  cwd: setCwd,
  ion: optAndDesc,
  flag: optFlag,
  env: optEnv,
  num: optNum,
  str: optString,
  // logLevel: optlogLevel,
};
