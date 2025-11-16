# Agentic Payments Hackathon example repo

This repo contains examples and documentation for the [Agentic Payments Hackathon in collaboration with Stripe](https://luma.com/f7gs82fe?tk=wx4evx).

## Quick Links
- [Quickstart guide for deploying custom models](./.docs/dat1-model-deployment-quickstart.md)
- [Predeployed gpt-oss-120b model documentation](./.docs/dat1-gptoss-120b.md)
- [OpenAI Agentic Commerce getting started guide](./.docs/openai-agenticcommerce-gettingstarted.md) - Overview of the Agentic Commerce Protocol for enabling purchases through AI agents like ChatGPT
- [Agentic Checkout specification](./.docs/openai-agenticcommerce-spec-agenticcheckout.md) - REST endpoints and webhooks for implementing checkout sessions in ChatGPT
- [Delegated Payment specification](./.docs/openai-agenticcommerce-spec-delegatedpayment.md) - Payment Service Provider integration for securely handling payment credentials with single-use tokens
- [Product Feed specification](./.docs/openai-agenticcommerce-spec-productfeed.md) - Schema for sharing structured product data with ChatGPT for search and discovery
- [Stripe Agentic Commerce documentation](./.docs/stripe-agenticcommerce-docs.md) - Guide for using Stripe's Shared Payment Tokens to process agentic commerce transactions
- [Stripe Payment Intent API documentation](./.docs/stripe-paymentintentapi-docs.md) - Guide for using Stripe's Payment Intent API for handling payments.

## Example Applications

- Agentic Commerce Protocol (ACP) Example App: This application demonstrates an agentic checkout flow that is compliant with the ACP specification. An AI agent assists the user with purchasing a product, handling everything from product search to payment. See [stripe-acp-example-app/README.md](./stripe-acp-example-app/README.md) for details.
- Stripe MCP Example App: Streaming chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model and Stripe MCP (Model Context Protocol) server. The AI agent can execute Stripe operations like retrieving balance, creating customers, managing products, and more through natural language conversations. See [stripe-mcp-example-app/README.md](./stripe-mcp-example-app/README.md) for details.
- Dat1 Example Chat App: A simple chat interface demonstrating integration with the dat1 predeployed gpt-oss-120b model. Supports both streaming and non-streaming responses. See [dat1-example-app/README.md](./dat1-example-app/README.md) for details.


## Deploying custom models on Dat1

See `dat1-deploy-custom-models`:
- `dat1-deploy-custom-models/bge-reranker`: downloads a reranker from Huggingface and uploads it to dat1, then provides an endpoint to use it (serverless). See [dat1-deploy-custom-models/bge-reranker/README.md](dat1-deploy-custom-models/bge-reranker/README.md) for details.
- `dat1-deploy-custom-models/llama-chat`: first download LLaMA 3.2 3B locally, then upload it to dat1, then get an endpoint to use it. See [dat1-deploy-custom-models/llama-chat/README.md](dat1-deploy-custom-models/llama-chat/README.md) for details.

**note:** Find Dat1's example repo at [https://github.com/dat1-co/dat1-model-examples](https://github.com/dat1-co/dat1-model-examples).