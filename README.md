---
title: Proxy Server for LINE Store API and CDN
emoji: 🐻
colorFrom: green
colorTo: blue
sdk: docker
app_port: 3000
---

# line-stamp-api-proxy

![logo](assets/opengraph_2560x1280.png)

Proxy server for LINE store API and CDN.

For educational and research purposes only.

[The demo server provided by Hugging Face🤗](https://daydreamer-json-line-stamp-api-proxy.hf.space/) is available.

## API Documentation

Please refer to [API.md](API.md).

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Web Framework**: Hono
- **HTTP Client**: ky (Fetch API)
- **Logging**: log4js
- **Media encoding**: FFmpeg

## How it Works

This proxy server acts as an intermediary between clients and LINE's store API and CDN. When a client makes a request to this server, it forwards the request to LINE's servers using appropriate headers and user agents, then returns the response to the client. This allows access to LINE's sticker and emoji data without direct API access.

```mermaid
graph TD
  Client[Client] --> Proxy[Proxy Server]
  Proxy -->|Search Request| LineAPI[LINE Store API]
  Proxy -->|Download Request| LineCDN[LINE CDN]
  LineAPI -->|Search Results| Proxy
  LineCDN -->|Media Files| Proxy
  Proxy -->|Response| Client
```

## Disclaimer

This project has no affiliation with LY Corporation (LINE ヤフー株式会社) and was created solely for private use, educational, and research purposes.

Please use it at your own risk.
