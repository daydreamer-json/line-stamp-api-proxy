import fs from 'fs';
import YAML from 'yaml';

// デフォルト設定
const DEFAULT_CONFIG = {
  request_timeout: 30000,
  log4js: {
    appenders: {
      console: {
        type: 'console',
        layout: {
          type: 'pattern',
          pattern: '%[%d{hh:mm:ss.SSS} %-5.0p >%] %m',
        },
      },
    },
    categories: {
      default: {
        appenders: ['console'],
        level: 'info',
      },
    },
  },
  userAgent: {
    chromeWindows:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    lineIos: 'LINE/2025.729.2024 CFNetwork/3859.100.1 Darwin/25.0.0',
  },
};

export function loadConfig() {
  try {
    const configFile = fs.readFileSync('config/config.yaml', 'utf8');
    return YAML.parse(configFile);
  } catch (error) {
    console.warn('設定ファイルの読み込みに失敗しました。デフォルト設定を使用します。', error);
    return DEFAULT_CONFIG;
  }
}
