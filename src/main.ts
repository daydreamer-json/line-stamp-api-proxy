import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from './utils/logger';
import { loadConfig } from './utils/config';

const config = loadConfig();
const requestTimeout = config.request_timeout || 30000;

const app = new Hono();

// CORSミドルウェア: すべての制限を無効化
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['*'],
    allowHeaders: ['*'],
    exposeHeaders: ['*'],
    maxAge: 86400,
  }),
);

// リクエストログミドルウェア
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  const responseTime = end - start;

  if (c.req.path.includes('.well-known/appspecific/com.chrome.devtools.json')) return;

  const decodedQuery = Object.entries(c.req.query())
    .map(([key, value]) => `${key}=${decodeURIComponent(value)}`)
    .join('&');

  const fullPath = decodedQuery ? `${c.req.path}?${decodedQuery}` : c.req.path;

  logger.debug(`[${c.req.method}] [${c.res.status}] ${fullPath} - ${responseTime}ms`);
});

app.use('*', async (c, next) => {
  await next();
  c.header('Server', 'THIS SERVER IS POWERED BY PENGUINS');
});

// ベースルート
app.get('/', (c) => {
  return c.text(
    `Proxy Server for LINE Store API and CDN
by daydreamer-json

This server is powered by penguins uwu (and Hono)

---

Example:
- /api/search?category=sticker&type=ALL&query=koupen&offset=0&limit=1
- /api/download/sticker/zip/18537?device_type=ios&is_static=false&size=2
- /api/download/sticker/single/23214968?device_type=android&is_static=false&size=1
- /api/download/sticker/thumb/18537?device_type=ios
- /api/download/sticker/sound/single/350279022?device_type=ios
- /api/download/sticker/sound/thumb/18537?device_type=ios

More info: /docs`,
    200,
    {
      'Content-Type': 'text/plain',
    },
  );
});

// APIルートグループ
const apiRoutes = app.basePath('/api');

// ルートを登録
import searchRoutes from './routes/search';
import metaRoutes from './routes/meta';
import stickerRoutes from './routes/download/sticker';
import emojiRoutes from './routes/download/emoji';
import docsRoutes from './routes/docs';

apiRoutes.route('/search', searchRoutes);
apiRoutes.route('/meta', metaRoutes);
apiRoutes.route('/download/sticker', stickerRoutes);
apiRoutes.route('/download/emoji', emojiRoutes);
app.route('/docs', docsRoutes);

// サーバー起動
const port = process.env.PORT || 3000;
logger.info(`Server running on port ${port}`);
Bun.serve({
  port,
  fetch: app.fetch,
});
