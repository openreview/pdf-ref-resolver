#!/bin/env node

import {
  runRegisteredCmds,
  yargsInstance
} from '~/util/arglib';

import * as mongoCli from './db/mongodb';
import * as appCli from './app/app-cli';
const YArgs = yargsInstance();

mongoCli.registerCommands(YArgs);
appCli.registerCommands(YArgs);

runRegisteredCmds(YArgs);
