import { Hono } from 'hono';
import ky from 'ky';
import { logger } from '../utils/logger';
import { loadConfig } from '../utils/config';

const config = loadConfig();
const requestTimeout = config.request_timeout || 30000;

const app = new Hono();

// カテゴリタイプのバリデーション
const validCategories = ['sticker', 'emoji', 'theme', 'family'] as const;
type Category = (typeof validCategories)[number];

// タイプのバリデーション
const validTypes = ['ALL', 'OFFICIAL', 'CREATORS', 'SUBSCRIPTION'] as const;
type SearchType = (typeof validTypes)[number];

app.get('/', async (c) => {
  const queryParams = c.req.query();
  const requiredParams = ['category', 'type', 'query', 'limit', 'offset'];

  if (!requiredParams.every((param) => param in queryParams)) {
    return c.text('Missing query parameter', 400);
  }

  // カテゴリのバリデーション
  if (!validCategories.includes(queryParams.category as Category)) {
    return c.text('Invalid category', 400);
  }

  if (queryParams.type && !validTypes.includes(queryParams.type as SearchType)) {
    return c.text('Invalid type', 400);
  }

  const preferredLanguage = 'lang' in queryParams ? queryParams.lang : c.req.header('Accept-Language') || 'ja';

  try {
    // LINE Store APIへのリクエスト
    const response = await ky(`https://store.line.me/api/search/${queryParams.category}`, {
      searchParams: queryParams, // クエリパラメータをそのまま渡す
      headers: {
        'Accept-Language': preferredLanguage,
        'User-Agent': config.userAgent.chromeWindows,
      },
      timeout: requestTimeout,
    });

    // 許可するヘッダーをフィルタリング（Content-Length追加）
    const allowedHeaders = ['Date', 'Content-Type', 'ETag', 'Cache-Control'];
    const filteredHeaders = new Headers();

    allowedHeaders.forEach((header) => {
      if (response.headers.has(header)) {
        filteredHeaders.set(header, response.headers.get(header)!);
      }
    });

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (error) {
    logger.error('LINE API request failed', error);
    return c.text('Internal Server Error', 500);
  }
});

export default app;
