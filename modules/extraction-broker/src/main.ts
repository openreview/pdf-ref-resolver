#!/bin/env node

import {
  YArgs,
} from '~/util/arglib';

import * as grobidIo from './grobid/grobid-io';
import * as grobidData from './grobid/grobid-data';
import * as mongoIo from './db/mongodb';

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
