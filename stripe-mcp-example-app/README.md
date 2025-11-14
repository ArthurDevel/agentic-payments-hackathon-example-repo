# Stripe MCP Example App

Simple streaming chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model.

## Setup

1. Add your dat1 API key to `.env`:
```
DAT1_API_KEY=your_key_here
```

2. Install dependencies and run:
```bash
pnpm install
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
stripe-mcp-example-app/
├── app/
│   ├── api/
│   │   ├── chat-stream/   # Streaming chat endpoint
│   │   └── endpoint/      # Endpoint info endpoint
│   ├── page.tsx           # Main chat interface
│   ├── layout.tsx         # App layout
│   └── globals.css        # Global styles
├── public/                # Static assets
└── package.json
```

## What It Does

Streaming chat interface with real-time token-by-token response display. Shows performance metrics including prompt time, generation speed, and token count.

## Model

This app uses the dat1 predeployed gpt-oss-120b model at:
`https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat`
