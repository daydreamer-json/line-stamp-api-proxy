import { Hono } from 'hono';
import ky from 'ky';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import { loadConfig } from '../utils/config';

const config = loadConfig();
const requestTimeout = config.request_timeout || 30000;

const app = new Hono();

app.get('/sticker/:productId', async (c) => {
  const productId: number = parseInt(c.req.param('productId') || '-1');
  if (productId === -1) return c.text('Invalid productId', 400);
  const preferredLanguage = c.req.query('lang') ?? (c.req.header('Accept-Language') || 'ja');

  try {
    const response = await ky(`https://store.line.me/stickershop/product/${productId}/${preferredLanguage}`, {
      headers: { 'User-Agent': config.userAgent.chromeWindows },
      timeout: requestTimeout,
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const jsonLdScript = $('head script[type="application/ld+json"]').first().html();

    if (jsonLdScript) {
      try {
        const data = JSON.parse(jsonLdScript);
        return c.json(data, 200);
      } catch (parseError) {
        logger.error('JSON-LD parse error', parseError);
        return c.text('Invalid JSON-LD', 500);
      }
    } else {
      return c.text('No JSON-LD found', 404);
    }
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Sticker meta_web download error', error);
    return c.text('Internal Server Error', 500);
  }
});

app.get('/emoji/:productId', async (c) => {
  const productId: string = c.req.param('productId') || 'null';
  if (!/^[0-9a-f]+$/.test(productId)) return c.text('Invalid productId', 400);
  const preferredLanguage = c.req.query('lang') ?? (c.req.header('Accept-Language') || 'ja');

  try {
    const response = await ky(`https://store.line.me/emojishop/product/${productId}/${preferredLanguage}`, {
      headers: { 'User-Agent': config.userAgent.lineIos },
      timeout: requestTimeout,
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const jsonLdScript = $('head script[type="application/ld+json"]').first().html();

    if (jsonLdScript) {
      try {
        const data = JSON.parse(jsonLdScript);
        return c.json(data, 200);
      } catch (parseError) {
        logger.error('JSON-LD parse error', parseError);
        return c.text('Invalid JSON-LD', 500);
      }
    } else {
      return c.text('No JSON-LD found', 404);
    }
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Emoji meta_web download error', error);
    return c.text('Internal Server Error', 500);
  }
});

export default app;
