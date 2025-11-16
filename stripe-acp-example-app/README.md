# dat1 Example Chat App

Simple chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model. Supports both streaming and non-streaming responses.

## Setup

1. Add your API keys to `.env`:
```bash
# Required: Stripe secret key for server-side payment processing
STRIPE_SECRET_KEY=sk_test_...

# Required: Stripe publishable key for client-side payment form
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Stripe network ID (defaults to 'default_merchant' if not set)
STRIPE_NETWORK_ID=your_network_id

# Required: dat1 API key for chat functionality
DAT1_API_KEY=your_dat1_key

# Optional: Base URL (defaults to http://localhost:3000)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

2. Install dependencies and run:
```bash
pnpm install
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dat1-example-app/
├── app/
│   ├── api/
│   │   ├── chat/          # Non-streaming chat endpoint
│   │   └── chat-stream/   # Streaming chat endpoint
│   ├── page.tsx           # Main chat interface
│   ├── layout.tsx         # App layout
│   └── globals.css        # Global styles
├── public/                # Static assets
└── package.json
```

## What It Does

Chat interface with two modes:
- **Streaming**: Real-time token-by-token response display
- **Non-Streaming**: Complete response returned at once

Both modes show performance metrics (prompt time, generation speed, token count).

## Use a custom deployed model

See `dat1-deploy-custom-models/llama-chat` for an example on how to deploy a custom LLM to dat1. Then use env var `DAT1_CHAT_ENDPOINT_OVERRIDE` to change the chat endpoint.