#!/bin/env node

import {
  runRegisteredCmds,
  YArgs,
} from '~/util/arglib';

import * as grobidCli from './grobid/grobid-cli';
import * as mongoCli from './db/mongodb';
import * as appCli from './app/app-cli';

grobidCli.registerCommands(YArgs);
mongoCli.registerCommands(YArgs);
appCli.registerCommands(YArgs);

runRegisteredCmds(YArgs);
