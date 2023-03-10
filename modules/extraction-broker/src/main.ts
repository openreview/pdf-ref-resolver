#!/bin/env node

import {
  YArgs,
} from '~/util/arglib';

import * as grobidCli from './grobid/grobid-cli';
import * as mongoCli from './db/mongodb';
import * as appCli from './app/app-cli';

grobidCli.registerCommands(YArgs);
mongoCli.registerCommands(YArgs);
appCli.registerCommands(YArgs);

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
