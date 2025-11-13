# BGE Reranker v2-m3 Deployment

Multilingual reranker model (BAAI/bge-reranker-v2-m3) for evaluating relevance between queries and passages. Supports 100+ languages.


## Deploy

```bash
cd dat1-deploy-custom-models/bge-reranker
dat1 deploy
```

The model will be downloaded automatically from HuggingFace during deployment.

The CLI will output the endpoint you can use to invoke the model, for example:

```bash
✅  model deployed successfully, available at: 
POST https://api.dat1.co/api/v1/inference/bge-reranker/invoke
```

## Usage

Rerank query-passage pairs by sending a POST request:

```bash
curl --request POST \
  --url https://api.dat1.co/api/v1/inference/bge-reranker/invoke \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: <your api key>' \
  --data '{
    "pairs": [
      ["what is a panda?", "The giant panda is a bear species endemic to China."],
      ["what is a panda?", "Pandas are a type of bamboo."]
    ],
    "normalize": true
  }'
```

## Request Format

```json
{
  "pairs": [
    ["query", "passage1"],
    ["query", "passage2"]
  ],
  "normalize": false
}
```

- `pairs`: List of [query, passage] pairs to score
- `normalize`: (optional) Set to `true` to normalize scores to 0-1 range

## Response Format

```json
{
  "scores": [0.85, 0.42]
}
```

Higher scores indicate greater relevance between query and passage.
