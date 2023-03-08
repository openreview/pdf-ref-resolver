import _ from 'lodash';

import {
  createLogger,
  transports,
  format,
  Logger,
  config,
} from 'winston';

export const AllLogLevels = [
  'error',
  'warn',
  'info',
  'http',
  'verbose',
  'debug',
  'silly',
];

export function setLogEnvLevel(level: string): void {
  process.env.loglevel = level;
}

export function getLogEnvLevel(): string {
  const envLogLevel = process.env.loglevel;
  const envLevel = envLogLevel;

  switch (envLevel) {
    case 'error':
    case 'warn':
    case 'info':
    case 'http':
    case 'verbose':
    case 'debug':
    case 'silly':
      return envLevel;
  }
  return 'debug';
}

export function getLogger(label: string): Logger {
  const { cli } = config;

  const logLevel = getLogEnvLevel();
  const level = logLevel || 'debug';

  const logger = createLogger({
    level,
    levels: cli.levels,
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.timestamp({
            format: 'HH:mm:ss:sss'
          }),
          format.label({ label, message: true }),
          format.printf(info => `${info.timestamp} ${info.level} ${info.message}`)
        ),
      })
    ],
  });

  if (logLevel === undefined) {
    logger.warn(`log level could not be deduced from env variables, setting to ${level}`);
  }

  return logger;
}

export type TransportType = 'file' | 'console';


export function setLogLevel(log: Logger, transportType: TransportType, level: string) {
  _.each(
    log.transports, t => {
      const setLevel =
        ((transportType === 'file') && (t instanceof transports.File))
        || ((transportType === 'console') && (t instanceof transports.Console))
        ;

      if (setLevel) {
        t.level = level;
      }
    }
  );
}
