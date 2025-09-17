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

  const productId: number = parseInt(c.req.param('productId') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  const isStaticFlag: boolean = c.req.query('is_static') === 'true' || false;
  const variantSize: number = parseInt(c.req.query('size') || '2');

  if (productId === -1) return c.text('Invalid productId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);
  if (variantSize > 2 || variantSize < 1) return c.text('Invalid size', 400);
  if (deviceType === 'android' && variantSize === 2) return c.text('Invalid device_type or size', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/product/${productId}/${deviceType}/${
        isStaticFlag ? 'stickers' : 'stickerpack'
      }${variantSize === 2 ? '@2x' : ''}.zip`,
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
      `attachment; filename="${productId}_${deviceType}_${variantSize}x${isStaticFlag ? '_static' : ''}.zip"`,
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
    logger.error('Sticker ZIP download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// 個別ステッカーダウンロードエンドポイント
app.get('/single/:stickerId', async (c) => {
  const validDeviceTypes = ['ios', 'android'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];

  const stickerId: number = parseInt(c.req.param('stickerId') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  const isStaticFlag: boolean = c.req.query('is_static') === 'true' || false;
  const variantSize: number = parseInt(c.req.query('size') || '2');
  const gifFlag: boolean = c.req.query('gif') === 'true';

  if (stickerId === -1) return c.text('Invalid stickerId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);
  if (variantSize > 2 || variantSize < 1) return c.text('Invalid size', 400);
  if (deviceType === 'android' && variantSize === 2) return c.text('Invalid device_type or size', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/${deviceType}/sticker${
        isStaticFlag ? '' : '_animation'
      }${variantSize === 2 ? '@2x' : ''}.png`,
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

    // 通常の場合
    const allowedHeaders = ['Content-Type', 'ETag', 'Cache-Control', 'Last-Modified'];
    const filteredHeaders = new Headers();
    allowedHeaders.forEach((header) => {
      if (response.headers.has(header)) {
        filteredHeaders.set(header, response.headers.get(header)!);
      }
    });
    // filteredHeaders.set(
    //   'Content-Disposition',
    //   `attachment; filename="${stickerId}_${deviceType}_${variantSize}x${isStaticFlag ? '_static' : ''}.png"`,
    // );
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Sticker download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// サムネイルダウンロードエンドポイント
app.get('/thumb/:productId', async (c) => {
  const productId: number = parseInt(c.req.param('productId') || '-1');
  if (productId === -1) return c.text('Invalid productId', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/product/${productId}/LINEStorePC/main.png`,
      {
        headers: { 'User-Agent': config.userAgent.chromeWindows },
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
    // filteredHeaders.set('Content-Disposition', `attachment; filename="${productId}_thumb.png"`);
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Thumbnail download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// 個別ステッカーサウンドダウンロードエンドポイント
app.get('/sound/single/:stickerId', async (c) => {
  const validDeviceTypes = ['ios', 'android', 'pc'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'ios', android: 'android', pc: 'LINEStorePC' } as const satisfies Record<
    DeviceType,
    string
  >;
  type DeviceTypeTransformed = (typeof transformedValidDeviceTypes)[DeviceType];

  const stickerId: number = parseInt(c.req.param('stickerId') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;

  if (stickerId === -1) return c.text('Invalid stickerId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/${transformedValidDeviceTypes[deviceType]}/sticker_sound.m4a`,
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
    // filteredHeaders.set(
    //   'Content-Disposition',
    //   `attachment; filename="${stickerId}_${deviceType}_${variantSize}x${isStaticFlag ? '_static' : ''}.png"`,
    // );
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Sticker sound download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// サムネイルサウンドダウンロードエンドポイント
app.get('/sound/thumb/:productId', async (c) => {
  const validDeviceTypes = ['ios', 'android', 'pc'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'ios', android: 'android', pc: 'LINEStorePC' } as const satisfies Record<
    DeviceType,
    string
  >;
  type DeviceTypeTransformed = (typeof transformedValidDeviceTypes)[DeviceType];

  const productId: number = parseInt(c.req.param('productId') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;

  if (productId === -1) return c.text('Invalid productId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);

  try {
    const response = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/product/${productId}/${transformedValidDeviceTypes[deviceType]}/main_sound.m4a`,
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
    // filteredHeaders.set('Content-Disposition', `attachment; filename="${productId}_thumb.png"`);
    filteredHeaders.set('X-Origin-Date', response.headers.get('Date')!);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('Thumbnail sound download failed', error);
    return c.text('Internal Server Error', 500);
  }
});

// SOUND+(ANIMATION or STATIC) 動画化ダウンロードエンドポイント
app.get('/mp4/single/:stickerId', async (c) => {
  const validDeviceTypes = ['ios', 'android'] as const;
  type DeviceType = (typeof validDeviceTypes)[number];
  const transformedValidDeviceTypes = { ios: 'ios', android: 'android' } as const satisfies Record<DeviceType, string>;
  type DeviceTypeTransformed = (typeof transformedValidDeviceTypes)[DeviceType];

  const stickerId: number = parseInt(c.req.param('stickerId') || '-1');
  const deviceType: DeviceType = (c.req.query('device_type') || 'ios') as DeviceType;
  const isStaticFlag: boolean = c.req.query('is_static') === 'true' || false;
  const variantSize: number = parseInt(c.req.query('size') || '2');

  if (stickerId === -1) return c.text('Invalid stickerId', 400);
  if (!validDeviceTypes.includes(deviceType as DeviceType)) return c.text('Invalid device_type', 400);
  if (variantSize > 2 || variantSize < 1) return c.text('Invalid size', 400);
  if (deviceType === 'android' && variantSize === 2) return c.text('Invalid device_type or size', 400);

  try {
    const imageResponse = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/${deviceType}/sticker${
        isStaticFlag ? '' : '_animation'
      }${variantSize === 2 ? '@2x' : ''}.png`,
      {
        headers: { 'User-Agent': config.userAgent.lineIos },
        timeout: requestTimeout,
      },
    );
    const soundResponse = await ky(
      `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/${transformedValidDeviceTypes[deviceType]}/sticker_sound.m4a`,
      {
        headers: { 'User-Agent': config.userAgent.lineIos },
        timeout: requestTimeout,
      },
    );

    const randomHash = Math.random().toString(36).substring(2);
    const inputImagePath = `tmp_${randomHash}_input.png`;
    const inputSoundPath = `tmp_${randomHash}_input.m4a`;
    const outputPath = `tmp_${randomHash}_output.mp4`;

    await fs.promises.writeFile(inputImagePath, Buffer.from(await imageResponse.arrayBuffer()));
    await fs.promises.writeFile(inputSoundPath, Buffer.from(await soundResponse.arrayBuffer()));

    await new Promise<void>((resolve, reject) => {
      exec(
        `ffmpeg -loglevel warning ${
          isStaticFlag ? '-loop 1 ' : ''
        }-i ${inputImagePath} -i ${inputSoundPath} -map 0:v:0 -map 1:a:0 -filter_complex "[0]scale=iw:ih,split[bg][fg];[bg]drawbox=c=black:t=fill[bg2];[bg2][fg]overlay=0:0:format=auto,format=yuv420p" -c:v libx264 -preset medium -pix_fmt yuv420p ${
          isStaticFlag ? '-r 4 ' : ''
        }-c:a copy ${isStaticFlag ? '-shortest ' : ''}-movflags +faststart ${outputPath}`,
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    });

    const outputBuffer = await fs.promises.readFile(outputPath);
    for (const filePath of [inputImagePath, inputSoundPath, outputPath]) await fs.promises.unlink(filePath);

    const filteredHeaders = new Headers();
    filteredHeaders.set('Content-Type', 'video/mp4');
    filteredHeaders.set('X-Origin-Date', imageResponse.headers.get('Date')!);

    return new Response(outputBuffer, {
      status: 200,
      headers: filteredHeaders,
    });
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return c.text('Not Found', 404);
    }
    logger.error('MP4 process failed', error);
    return c.text('Internal Server Error', 500);
  }
});

export default app;
