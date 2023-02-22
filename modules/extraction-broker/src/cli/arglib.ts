
import _ from 'lodash';

import fs from 'fs-extra';
import path from 'path';

import yargs, { Argv, Arguments, Options, MiddlewareFunction } from 'yargs';
import { putStrLn } from '../util/pretty-print';

export const YArgs = yargs;

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

const optFlag = (odesc: string, def?: boolean) =>  optAndDesc(odesc, {
  type: 'boolean',
  demandOption: def === undefined,
  default: def
});

const optNum = (odesc: string, def?: number) =>  optAndDesc(odesc, {
  type: 'number',
  demandOption: def === undefined,
  default: def
});

const optString = (odesc: string, def?: string) =>  optAndDesc(odesc, {
  type: 'string',
  demandOption: def === undefined,
  default: def
});

// const optlogLevel = (def?: string) => optAndDesc('log-level: set logging level', {
//   type: 'string',
//   choices: AllLogLevels,
//   demandOption: def === undefined,
//   default: def
// });

const existingPath = (pathAndDesc: string) => (ya: Argv) => {
  let [pathname, desc] = pathAndDesc.includes(':')
    ? pathAndDesc.split(':')
    : [pathAndDesc, `directory ${pathAndDesc}`];

  pathname = pathname.trim();
  desc = desc.trim();
  ya.option(pathname, {
    describe: desc,
    type: 'string',
    demandOption: true,
    requiresArg: true,
  });

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

export const existingDir = (dirAndDesc: string): (ya: Argv) => Argv => {
  return existingPath(dirAndDesc);
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
      if (!argv.cwd) {
        argv.cwd = path.dirname(configFile);
      }
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
export async function runRegisteredCmds(useYargs: Argv): Promise<void> {
  const res = useYargs
    .strictCommands()
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .fail((err) => {
      console.log('RunCLI Error', err);
      useYargs.showHelp();
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
  num: optNum,
  str: optString,
  // logLevel: optlogLevel,
};
