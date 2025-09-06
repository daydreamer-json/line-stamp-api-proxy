# API Documentation

This proxy server provides endpoints to access LINE Store API and CDN resources.

Base URL: `http://localhost:3000` (replace with your actual server URL)  
Demo server URL: `https://daydreamer-json-line-stamp-api-proxy.hf.space`

## Root Endpoint

`GET /`

Returns information about the proxy server and example usage.

---

## Search Products

`GET /api/search`

Search for LINE products (stickers, emoji, etc.).

### Query Parameters

- `category`: string (required)
  - Values: 'sticker', 'emoji', 'theme', 'family'
- `type`: string (required)
  - Values: 'ALL', 'OFFICIAL', 'CREATORS', 'SUBSCRIPTION'
- `query`: string (required)
  - Search query string
- `offset`: number (required)
  - Pagination offset
- `limit`: number (required)
  - Number of results to return
- `lang`: string (optional)
  - Language code for search results (e.g., 'en', 'ja')

### Response

Returns the search results from LINE Store API in JSON format.

---

## Get Product Metadata

### Sticker Metadata

`GET /api/meta/sticker/:productId`

Get metadata for a sticker product.

#### Path Parameters

- `productId`: number (integer)
  - Sticker product ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android', 'pc'

### Emoji Metadata

`GET /api/meta/emoji/:productId`

Get metadata for an emoji product.

#### Path Parameters

- `productId`: string (hexadecimal)
  - Emoji product ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android'

---

## Download Stickers

### Sticker Package ZIP

`GET /api/download/sticker/zip/:productId`

Download a ZIP file containing all stickers in a product.

#### Path Parameters

- `productId`: number (integer)
  - Sticker product ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android'
- `is_static`: boolean (optional, default: false)
  - If true, downloads static stickers only
- `size`: number (optional, default: 2)
  - Values: 1 (normal), 2 (high resolution)

### Individual Sticker

`GET /api/download/sticker/single/:stickerId`

Download a single sticker image.

#### Path Parameters

- `stickerId`: number (integer)
  - Individual sticker ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android'
- `is_static`: boolean (optional, default: false)
  - If true, downloads static version
- `size`: number (optional, default: 2)
  - Values: 1 (normal), 2 (high resolution)
- `gif`: boolean (optional, default: false)
  - If true and the sticker is animated, converts to GIF format

### Sticker Thumbnail

`GET /api/download/sticker/thumb/:productId`

Download the thumbnail image for a sticker product.

#### Path Parameters

- `productId`: number (integer)
  - Sticker product ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android', 'pc'

### Individual Sticker Sound

`GET /api/download/sticker/sound/single/:stickerId`

Download the sound file for an individual sticker.

#### Path Parameters

- `stickerId`: number (integer)
  - Individual sticker ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android', 'pc'

### Product Sound Thumbnail

`GET /api/download/sticker/sound/thumb/:productId`

Download the main sound file for a sticker product.

#### Path Parameters

- `productId`: number (integer)
  - Sticker product ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android', 'pc'

---

## Download Emojis

### Emoji Package ZIP

`GET /api/download/emoji/zip/:productId`

Download a ZIP file containing all emojis in a product.

#### Path Parameters

- `productId`: string (hexadecimal)
  - Emoji product ID

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android'
- `is_static`: boolean (optional, default: false)
  - If true, downloads static emojis only

### Individual Emoji

`GET /api/download/emoji/single/:productId/:iconIndex`

Download a single emoji image.

#### Path Parameters

- `productId`: string (hexadecimal)
  - Emoji product ID
- `iconIndex`: number (integer)
  - Emoji icon index

#### Query Parameters

- `device_type`: string (optional, default: 'ios')
  - Values: 'ios', 'android'
- `is_static`: boolean (optional, default: false)
  - If true, downloads static version
- `gif`: boolean (optional, default: false)
  - If true and the emoji is animated, converts to GIF format

### Emoji Thumbnail

`GET /api/download/emoji/thumb/:productId`

Download the thumbnail image for an emoji product.

#### Path Parameters

- `productId`: string (hexadecimal)
  - Emoji product ID
