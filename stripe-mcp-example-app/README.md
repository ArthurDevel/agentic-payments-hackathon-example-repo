# Stripe MCP Example App

Streaming chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model and Stripe MCP (Model Context Protocol) server. The AI agent can execute Stripe operations like retrieving balance, creating customers, managing products, and more through natural language conversations.

## Setup

1. Add your API keys to `.env`:
```
DAT1_API_KEY=your_dat1_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

**Note:** For Stripe MCP, we recommend using a [restricted API key](https://docs.stripe.com/keys#create-restricted-api-secret-key) to limit access to only the functionality your agent requires.

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
│   │   ├── chat-stream/   # Streaming chat endpoint with MCP tool execution
│   │   └── endpoint/      # Endpoint info endpoint
│   ├── page.tsx           # Main chat interface
│   ├── layout.tsx         # App layout
│   └── globals.css        # Global styles
├── lib/
│   └── mcp/
│       ├── stripe-mcp.ts  # Stripe MCP HTTP client
│       └── tools.ts        # Tool definitions and conversion
├── public/                # Static assets
└── package.json
```

## What It Does

Streaming chat interface with real-time token-by-token response display. Shows performance metrics including prompt time, generation speed, and token count.

## Model

This app uses the dat1 predeployed gpt-oss-120b model at:
`https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat`
