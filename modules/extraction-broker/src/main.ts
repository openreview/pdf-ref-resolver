#!/bin/env node

import {
  YArgs,
} from '~/cli/arglib';

import * as grobidIo from './app/grobid-io';
import * as mongoIo from './app/mongodb';
import * as grobidData from './app/grobid-data';

grobidIo.registerCommands(YArgs);
mongoIo.registerCommands(YArgs);
grobidData.registerCommands(YArgs);

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
