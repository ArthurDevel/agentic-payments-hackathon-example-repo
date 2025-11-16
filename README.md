# Dat1 Test Repo for Agentic Payments Hackathon

This repo is made to test out the capabilities of dat1 in preparation for the [Agentic Payments Hackathon in collaboration with Stripe](https://luma.com/f7gs82fe?tk=wx4evx).

## Quick Links
- [Quickstart guide for deploying custom models](./.docs/dat1-model-deployment-quickstart.md)
- [Predeployed gpt-oss-120b model documentation](./.docs/dat1-gptoss-120b.md)
- [OpenAI Agentic Commerce getting started guide](./.docs/openai-agenticcommerce-gettingstarted.md) - Overview of the Agentic Commerce Protocol for enabling purchases through AI agents like ChatGPT
- [Agentic Checkout specification](./.docs/openai-agenticcommerce-spec-agenticcheckout.md) - REST endpoints and webhooks for implementing checkout sessions in ChatGPT
- [Delegated Payment specification](./.docs/openai-agenticcommerce-spec-delegatedpayment.md) - Payment Service Provider integration for securely handling payment credentials with single-use tokens
- [Product Feed specification](./.docs/openai-agenticcommerce-spec-productfeed.md) - Schema for sharing structured product data with ChatGPT for search and discovery
- [Stripe Agentic Commerce documentation](./.docs/stripe-agenticcommerce-docs.md) - Guide for using Stripe's Shared Payment Tokens to process agentic commerce transactions

## Example Applications

Simple Next.js chat application demonstrating integration with the dat1 gpt-oss-120b model. See [dat1-example-app/README.md](./dat1-example-app/README.md) for details.

## Deploying custom models

See `dat1-deploy-custom-models`:
- `dat1-deploy-custom-models/bge-reranker`: downloads a reranker from Huggingface and uploads it to dat1, then provides an endpoint to use it (serverless)
- `dat1-deploy-custom-models/llama-chat`: first download LLaMA 3.2 3B locally, then upload it to dat1, then get an endpoint to use it

## Dat1 Examples Repo

Find Dat1's example repo at [https://github.com/dat1-co/dat1-model-examples](https://github.com/dat1-co/dat1-model-examples).