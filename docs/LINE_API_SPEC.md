# LINE Store Web API

Base URL: `https://store.line.me`

## Search product

`GET /api/search/:category`

Request Headers

- `Accept-Language`: ISO country code
  - Used to determine the language of search results

Path Parameters

- `category`: 'sticker' | 'emoji' | 'theme' | 'family'
  - 'sticker'='スタンプ', 'emoji'='絵文字', 'theme'='着せ替え', 'family'='その他'

Query Parameters

- `query`: string
- `category`: 'sticker' | 'emoji' | 'theme' | 'family'
  - Must match the path parameters exactly
- `type`: 'ALL' | 'OFFICIAL' | 'CREATORS' | 'SUBSCRIPTION'
  - 'ALL'='すべて', 'OFFICIAL'='公式', 'CREATORS'='クリエイターズ', 'SUBSCRIPTION'='LINE スタンプ プレミアム'
- `offset`: number
- `limit`: number

---

# LINE Product CDN Spec

Base URL: `https://stickershop.line-scdn.net`

## Stickers

Path Parameters

- `productId`: number
  - Sticker product ID (integer)

### Metadata JSON

`GET /stickershop/v1/product/:productId/:deviceType/productInfo.meta`

Path Parameters

- `deviceType`: 'ios' | 'android' | 'LINEStorePC'

```typescript
const stickerResourceTypes = ['STATIC', 'ANIMATION', 'SOUND', 'ANIMATION_SOUND'] as const;
type productInfo_meta = {
  packageId: number; // productId
  onSale: boolean;
  validDays: number;
  title: { [lang: string]: string }; // Example: {ja: 'タイトル', en: 'Title'}
  author: { [lang: string]: string }; // Example: {ja: '名前', en: 'Author'}
  price: {
    country: string;
    currency: string;
    symbol: string;
    price: number;
  }[];
  stickers: {
    id: number; // stickerId
    width: number; // image width
    height: number; // image height
  }[];
  hasAnimation: boolean;
  hasSound: boolean;
  stickerResourceType: (typeof stickerResourceTypes)[number];
};
```

### Product packed zip

`GET /stickershop/v1/product/:productId/:deviceType/:file`

Path Parameters

- `deviceType`: 'ios' | 'android'
- `file`: 'stickerpack@2x.zip' | 'stickerpack.zip' | 'stickers.zip'
  - 'stickerpack@2x.zip' = png (2x) + apng (2x) + m4a
  - 'stickerpack.zip' = png (1x) + apng (1x) + m4a
  - 'stickers.zip' = png (1x) STATIC
  - android stickerpack@2x.zip is not available

### Independent sticker

`GET /stickershop/v1/sticker/:stickerId/:deviceType/:file`

Path Parameters

- `stickerId`: number
- `deviceType`: 'ios' | 'android'
- `file`: 'sticker@2x.png' | 'sticker.png'
  - android sticker@2x.png is not available

### Product thumbnail

`GET /stickershop/v1/product/:productId/LINEStorePC/main.png`

### Independent sticker sound

`GET /stickershop/v1/sticker/:stickerId/:deviceType/sticker_sound.m4a`

Path Parameters

- `stickerId`: number
- `deviceType`: 'ios' | 'android' | 'LINEStorePC'

### Product thumbnail sound

`GET /stickershop/v1/product/:productId/:deviceType/main_sound.m4a`

Path Parameters

- `deviceType`: 'ios' | 'android' | 'LINEStorePC'

---

## Sticons (emoji)

Path Parameters

- `productId`: string
  - Sticons product ID (integer) 96 bit hex (deliver func is unknown)

### Metadata JSON

`GET /sticonshop/v1/sticon/:productId/:deviceType/meta.json`

Path Parameters

- `deviceType`: 'iPhone' | 'android'

```typescript
type meta_json = {
  productId: string;
  altTexts: { [iconIndex: string]: string };
  orders: string[]; // array of iconIndex
  sticonResourceType?: 'STATIC' | 'ANIMATION'; // STATIC if key does not exist
};
```

### Product packed zip

`GET /sticonshop/v1/sticon/:productId/:deviceType/:file`

Path Parameters

- `deviceType`: 'iPhone' | 'android'
- `file`: 'package_animation.zip' | 'package.zip'
  - 'package_animation.zip' = APNG
  - 'package.zip' = PNG

### Independent sticon

`GET /sticonshop/v1/sticon/:productId/:deviceType/:file`

Path Parameters

- `deviceType`: 'iPhone' | 'android'
- `file`: `${iconIndex}_animation.png` | `${iconIndex}.png`
  - `iconIndex`: 3-digit icon index string (001-999)
  - `${iconIndex}_animation.png` = APNG
  - `${iconIndex}.png` = PNG

### Product thumbnail

`GET /sticonshop/v1/product/:productId/iPhone/main.png`

---

## Themes

?

---

## Family

?

---

## Product packed zip structure

### Stickers

- stickerpack@2x.zip | stickerpack.zip
  - productInfo.meta (JSON)
  - `${stickerId}@2x.png` | `${stickerId}.png` (PNG STATIC)
  - `${stickerId}_key@2x.png` | `${stickerId}_key.png` (PNG STATIC low quality)
  - tab_on@2x.png | tab_on.png (small thumbnail)
  - tab_off@2x.png | tab_off.png (small thumbnail grayscale)
  - sound
    - `${stickerId}.m4a` (M4A SOUND)
  - animation | animation@2x
    - `${stickerId}@2x.png` | `${stickerId}.png` (APNG ANIMATION)
- stickers@2x.zip | stickers.zip
  - productInfo.meta
  - `${stickerId}@2x.png` | `${stickerId}.png` (PNG STATIC)
  - `${stickerId}_key@2x.png` | `${stickerId}_key.png` (PNG STATIC low quality)
  - tab_on@2x.png | tab_on.png (small thumbnail)
  - tab_off@2x.png | tab_off.png (small thumbnail grayscale)

`sound` and `animation` folder may not exist depending on the resource type. (example: STATIC)

### Sticons (emoji)

- package_animation.zip
  - meta.json
  - `${iconIndex}_animation.png` (APNG)
  - `${iconIndex}_key_animation.png` (APNG)
- package.zip
  - meta.json
  - `${iconIndex}.png` (PNG)
  - `${iconIndex}_key.png` (PNG)
