# Agentic Commerce Protocol (ACP) Example App

This application demonstrates an agentic checkout flow that is compliant with the ACP specification. At a high level, the process is as follows:

-   **User Initiates Purchase**: The user asks the AI agent to buy a product.
-   **Agent Creates Checkout**: The agent finds the product in the product feed and calls the `/api/acp/checkout_sessions` endpoint to create a checkout session.
-   **User Provides Details**: The user provides a shipping address and selects a shipping option. The agent calls the `/api/acp/checkout_sessions/[id]` endpoint to update the session.
-   **User Pays & Creates Token**: The application displays a payment form where the user enters their details to create a **Shared Payment Token (SPT)** with Stripe (*see disclaimer below*).
-   **Agent Completes Checkout**: The SPT is sent to the agent, which then calls the `/api/acp/checkout_sessions/[id]/complete` endpoint with the SPT to finalize the order.

> **Disclaimer: Shared Payment Token vs. Payment Intent API**
>
> The official Agentic Commerce Protocol specification uses a **Shared Payment Token (SPT)** for handling payments. However, the SPT API is currently not yet publicly available.
>
> As a workaround, this example application has been adapted to use the standard Stripe **Payment Intent API**. The `payment_intent_id` is used in place of the SPT to complete the checkout flow. This allows the application to demonstrate the full agentic checkout process while accommodating the current availability of the SPT API.

## Setup

1. Add your API keys to `.env`:
```bash
# Required: Stripe secret key for server-side payment processing
STRIPE_SECRET_KEY=sk_test_...

# Required: Stripe publishable key for client-side payment form
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Required: dat1 API key for chat functionality
DAT1_API_KEY=your_dat1_key
```

2. Install dependencies and run:
```bash
pnpm install
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
stripe-acp-example-app/
├── app/
│   ├── api/
│   │   ├── acp/                 # ACP Spec endpoints (checkout, products)
│   │   ├── chat-stream/       # Streaming chat endpoint with tool-calling agent
│   │   ├── checkout-state/    # Endpoint to get latest checkout state
│   │   └── payment/           # Payment Intent creation endpoint
│   ├── components/
│   │   └── PaymentForm.tsx    # Stripe.js payment form
│   ├── page.tsx               # Main chat interface
│   └── ...
├── conversations/             # Conversation and checkout session storage (appears on first run)
│   ├── conversation-*.json
│   └── checkout_sessions.json
├── data/
│   └── products.json          # Product catalog
├── lib/
│   ├── checkout/
│   │   └── sessionStorage.ts  # Checkout session file storage utilities
│   ├── stripe/
│   │   └── client.ts          # Stripe client initialization
│   └── types/                 # TypeScript type definitions
└── ...
```

## What It Does

This application provides a chat interface that communicates with an AI agent capable of handling a shopping flow. It uses a streaming endpoint to provide real-time responses from the agent.

The agent can:
- Search a product catalog.
- Create and update a checkout session.
- Hand off to a client-side payment form to process payments.
- Complete the checkout to finalize an order.

## Language Model

This application is configured to use the `gpt-120-oss` model from dat1 for all its agentic capabilities. The model and API endpoint are set in `app/api/chat-stream/route.ts`.
