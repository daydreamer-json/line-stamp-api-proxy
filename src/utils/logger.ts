import log4js from 'log4js';
import { loadConfig } from './config';

const config = loadConfig();
const logFormat = config?.log4js?.appenders?.console?.layout?.pattern || '%[%d{hh:mm:ss.SSS} %-5.0p >%] %m';

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: { type: 'pattern', pattern: logFormat },
    },
  },
  categories: {
    default: {
      appenders: ['console'],
      level: config?.log4js?.categories?.default?.level || 'info',
    },
  },
});

export const logger = log4js.getLogger();
