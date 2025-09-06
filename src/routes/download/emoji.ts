import { Hono } from 'hono';
import ky from 'ky';
import fs from 'fs';
import { exec } from 'child_process';
import { logger } from '../../utils/logger';
import { loadConfig } from '../../utils/config';

const config = loadConfig();
const requestTimeout = config.request_timeout || 30000;

const app = new Hono();

// ZIPダウンロードエンドポイント
app.get('/zip/:productId', async (c) => {
  const validDeviceTypes = ['ios', 'android'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'iPhone', android: 'android' } as const satisfies Record<
    DeviceType,
    string
  >;
  type DeviceTypeTransformed = (typeof transformedValidDeviceTypes)[DeviceType];

  const productId: string = c.req.param('productId') || 'null';
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  const isStaticFlag: boolean = c.req.query('is_static') === 'true' || false;

  if (!/^[0-9a-f]+$/.test(productId)) return c.text('Invalid productId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/sticonshop/v1/sticon/${productId}/${
        transformedValidDeviceTypes[deviceType]
      }/package${isStaticFlag ? '' : '_animation'}.zip`,
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
    filteredHeaders.set(
      'Content-Disposition',
      `attachment; filename="${productId}_${deviceType}_${isStaticFlag ? '_static' : ''}.zip"`,
    );
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Sticon ZIP download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// 個別絵文字ダウンロードエンドポイント
app.get('/single/:productId/:iconIndex', async (c) => {
  const validDeviceTypes = ['ios', 'android'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'iPhone', android: 'android' } as const satisfies Record<
    DeviceType,
    string
  >;
  type DeviceTypeTransformed = (typeof transformedValidDeviceTypes)[DeviceType];

  const productId: string = c.req.param('productId') || 'null';
  const iconIndex: number = parseInt(c.req.param('iconIndex') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  const isStaticFlag: boolean = c.req.query('is_static') === 'true' || false;
  const gifFlag: boolean = c.req.query('gif') === 'true';
  // const variantSize: number = parseInt(c.req.query('size') || '2');

  if (!/^[0-9a-f]+$/.test(productId)) return c.text('Invalid productId', 400);
  if (iconIndex === -1) return c.text('Invalid iconIndex', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);
  // if (variantSize > 2 || variantSize < 1) return c.text('Invalid size', 400);
  // if (deviceType === 'android' && variantSize === 2) return c.text('Invalid device_type or size', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/sticonshop/v1/sticon/${productId}/${
        transformedValidDeviceTypes[deviceType]
      }/${String(iconIndex).padStart(3, '0')}${isStaticFlag ? '' : '_animation'}.png`,
      {
        headers: { 'User-Agent': config.userAgent.lineIos },
        timeout: requestTimeout,
      },
    );

    // GIF変換が必要な場合（アニメーションの場合のみ）
    if (gifFlag && !isStaticFlag) {
      const buffer = await response.arrayBuffer();
      const prefix = Math.random().toString(36).substring(2);
      const inputPath = `tmp_${prefix}_input.png`;
      const outputPath = `tmp_${prefix}_output.gif`;

      fs.writeFileSync(inputPath, Buffer.from(buffer));

      // FFmpegでAPNGをGIFに変換
      await new Promise<void>((resolve, reject) => {
        exec(
          `ffmpeg -y -i ${inputPath} -loop 0 -filter_complex "[0:v] split [a][b];[a] palettegen [p];[b][p] paletteuse=dither=floyd_steinberg" ${outputPath}`,
          (error) => {
            if (error) reject(error);
            else resolve();
          },
        );
      });

      const gifBuffer = fs.readFileSync(outputPath);

      // 一時ファイルをクリーンアップ
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});

      const filteredHeaders = new Headers();
      filteredHeaders.set('Content-Type', 'image/gif');
      filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

      return new Response(gifBuffer, {
        status: 200,
        headers: filteredHeaders,
      });
    }

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
    logger.error('Sticon image download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// 絵文字サムネイルダウンロードエンドポイント
app.get('/thumb/:productId', async (c) => {
  const productId: string = c.req.param('productId') || 'null';
  if (!/^[0-9a-f]+$/.test(productId)) return c.text('Invalid productId', 400);

  try {
    const response = await ky(`https://stickershop.line-scdn.net/sticonshop/v1/product/${productId}/iPhone/main.png`, {
      headers: { 'User-Agent': config.userAgent.lineIos },
      timeout: requestTimeout,
    });

    const allowedHeaders = ['Content-Type', 'ETag', 'Cache-Control', 'Last-Modified'];
    const filteredHeaders = new Headers();
    allowedHeaders.forEach((header) => {
      if (response.headers.has(header)) {
        filteredHeaders.set(header, response.headers.get(header)!);
      }
    });
    // filteredHeaders.set('Content-Disposition', `attachment; filename="${productId}_thumb.png"`);
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    logger.error('Sticon thumbnail download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

export default app;
