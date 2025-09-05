import { Hono } from 'hono';
import ky from 'ky';
import { logger } from '../utils/logger';
import { loadConfig } from '../utils/config';

const config = loadConfig();
const requestTimeout = config.request_timeout || 30000;

const app = new Hono();

app.get('/sticker/:productId', async (c) => {
  const validDeviceTypes = ['ios', 'android', 'pc'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'ios', android: 'android', pc: 'LINEStorePC' } as const satisfies Record<
    DeviceType,
    string
  >;

  const productId: number = parseInt(c.req.param('productId') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  if (productId === -1) return c.text('Invalid productId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/product/${productId}/${transformedValidDeviceTypes[deviceType]}/productInfo.meta`,
      {
        headers: { 'User-Agent': config.userAgent.lineIos },
        timeout: requestTimeout,
      },
    );

    const allowedHeaders = ['Content-Type', 'ETag', 'Cache-Control', 'Last-Modified'];
    const filteredHeaders = new Headers();
    allowedHeaders.forEach((header) => {
      if (response.headers.has(header)) {
        filteredHeaders.set(header, response.headers.get(header)!);
      }
    });
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Sticker meta download error', error);
    return c.text('Internal Server Error', 500);
  }
});

app.get('/emoji/:productId', async (c) => {
  const validDeviceTypes = ['ios', 'android'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'iPhone', android: 'android' } as const satisfies Record<
    DeviceType,
    string
  >;

  const productId: string = c.req.param('productId') || 'null';
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  if (!/^[0-9a-f]+$/.test(productId)) return c.text('Invalid productId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/sticonshop/v1/sticon/${productId}/${transformedValidDeviceTypes[deviceType]}/meta.json`,
      {
        headers: { 'User-Agent': config.userAgent.lineIos },
        timeout: requestTimeout,
      },
    );

    const allowedHeaders = ['Content-Type', 'ETag', 'Cache-Control', 'Last-Modified'];
    const filteredHeaders = new Headers();
    allowedHeaders.forEach((header) => {
      if (response.headers.has(header)) {
        filteredHeaders.set(header, response.headers.get(header)!);
      }
    });
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Sticon meta download error', error);
    return c.text('Internal Server Error', 500);
  }
});

export default app;
