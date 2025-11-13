# LLaMA 3.2 3B Chat Deployment

OpenAI-compatible chat API for LLaMA 3.2 3B model. Supports streaming and non-streaming responses.

## Setup

1. Download the model:

```bash
wget https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf -O model.gguf
```

2. Deploy:

```bash
cd dat1-deploy-custom-models/llama-chat
dat1 deploy
```

The CLI will output the endpoint you can use to invoke the model, for example:

```bash
✅  model deployed successfully, available at:
POST https://api.dat1.co/api/v1/inference/llama-chat/invoke-stream
```

## Usage in `dat1-example-app``
Add `DAT1_CHAT_ENDPOINT_OVERRIDE=https://api.dat1.co/api/v1/inference/llama-chat/invoke-stream` to `dat1-example-app/.env`

## General Usage

```bash
curl --request POST \
  --url https://api.dat1.co/api/v1/inference/llama-chat/invoke-stream \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: <your api key>' \
  --data '{
    "messages": [
      {"role": "user", "content": "Say this is a test!"}
    ],
    "temperature": 0.7,
    "stream": true,
    "max_tokens": 100
  }'
```

## Request Format

```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "stream": true,
  "max_tokens": 500
}
```
