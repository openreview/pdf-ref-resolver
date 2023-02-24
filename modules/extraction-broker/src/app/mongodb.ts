import mongoose from 'mongoose';
import { Mongoose } from 'mongoose';
import { initConfig, isTestingEnv } from './config';
import { putStrLn } from '~/util/pretty-print';
import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/cli/arglib';
import { createCollections } from './mongo-schemas';


export function mongoConnectionString(): string {
  const config = initConfig();
  const ConnectionURL = config.get('mongodb:connectionUrl');
  const MongoDBName = config.get('mongodb:dbName');
  let connectUrl = `${ConnectionURL}/${MongoDBName}`;
  return connectUrl;
}

export async function connectToMongoDB(): Promise<Mongoose> {
  const connstr = mongoConnectionString();
  putStrLn(`connecting to ${connstr}`);
  return mongoose.connect(connstr);
}

interface CurrentTimeOpt {
  currentTime(): Date;
}

export function createCurrentTimeOpt(): CurrentTimeOpt {
  if (!isTestingEnv()) {
    const defaultOpt: CurrentTimeOpt = {
      currentTime: () => new Date()
    };
    return defaultOpt;
  }
  putStrLn('Using MongoDB Mock Timestamps');
  const currentFakeDate = new Date();
  currentFakeDate.setDate(currentFakeDate.getDate() - 14);
  const mockedOpts: CurrentTimeOpt = {
    currentTime: () => {
      const currDate = new Date(currentFakeDate);
      const rando = Math.floor(Math.random() * 10) + 1;
      const jitter = rando % 4;
      currentFakeDate.setHours(currentFakeDate.getHours() + jitter);
      return currDate;
    }
  };
  return mockedOpts;
}

export function registerCommands(yargv: YArgsT) {
  registerCmd(
    yargv,
    'mongo',
    'Create/Delete/Update Mongo Database',
    opt.flag('clean'),
  )(async (args: any) => {
    const clean: boolean = args.clean;
    initConfig();
    const conn = mongoConnectionString();
    putStrLn('Mongo Tools');
    putStrLn(`Connection: ${conn}`);

    if (clean) {
      putStrLn('Cleaning Database');
      const mongoose = await connectToMongoDB();
      putStrLn('dropDatabase..');
      await mongoose.connection.dropDatabase();
      putStrLn('createCollections..');
      await createCollections();
      putStrLn('Close connections');
      await mongoose.connection.close();
      putStrLn('...done');
    }
  });

}
