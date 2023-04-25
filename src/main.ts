#!/bin/env node

import {
  runRegisteredCmds,
  yargsInstance
} from '~/util/arglib';

import * as appCli from './app/app-cli';
const YArgs = yargsInstance();

appCli.registerCommands(YArgs);

runRegisteredCmds(YArgs);
