#!/bin/env node

import {
  runRegisteredCmds,
  YArgs,
} from '~/util/arglib';

import * as mongoCli from './db/mongodb';
import * as appCli from './app/app-cli';

mongoCli.registerCommands(YArgs);
appCli.registerCommands(YArgs);

runRegisteredCmds(YArgs);
