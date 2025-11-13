# OpenAI / gpt-oss-120b API Documentation
source: [https://dat1.co/console/collection/OpenAI__gpt-oss-120b](https://dat1.co/console/collection/OpenAI__gpt-oss-120b)

## Using OpenAI / gpt-oss-120b Programmatically

Below are ready-to-use code snippets showing how to call the OpenAI / gpt-oss-120b model programmatically. Choose your preferred language and copy the example to quickly integrate it into your workflow. Make sure to replace `"<Your API key>"` with your actual API key before running the request.

## cURL

```bash
curl --request POST \
  --url https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: <Your API Key>' \
  --data '{
	"messages": [
		{
			"role": "system",
			"content": "You are a helpful assistant designed to provide clear and concise responses."
		},
		{
			"role": "user",
			"content": "What is the capital of France?"
		}
	],
	"temperature": 0.7,
	"stream": true,
	"max_tokens": 500
}'
```

## Python

```python
import requests
import json

headers = {
    'X-API-Key': '<Your API key>',
    'Content-Type': 'application/json',
}

data = json.loads("""{
	"messages": [
		{
			"role": "system",
			"content": "You are a helpful assistant designed to provide clear and concise responses."
		},
		{
			"role": "user",
			"content": "What is the capital of France?"
		}
	],
	"temperature": 0.7,
	"stream": false,
	"max_tokens": 500
}""")

response = requests.post('https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat', headers=headers, json=data)
```

## JavaScript / TypeScript

```javascript
fetch('https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat', {
  method: 'POST',
  headers: {
    'X-API-Key': '<Your API key>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
	"messages": [
		{
			"role": "system",
			"content": "You are a helpful assistant designed to provide clear and concise responses."
		},
		{
			"role": "user",
			"content": "What is the capital of France?"
		}
	],
	"temperature": 0.7,
	"stream": false,
	"max_tokens": 500
})
});
```

## Example Response Body

```json
{
	"choices": [
		{
			"finish_reason": "stop",
			"index": 0,
			"message": {
				"role": "assistant",
				"content": "The capital of France is Paris."
			}
		}
	],
	"created": 1754303118,
	"model": "gpt-3.5-turbo",
	"system_fingerprint": "b5466-9ecf3e66",
	"object": "chat.completion",
	"usage": {
		"completion_tokens": 8,
		"prompt_tokens": 33,
		"total_tokens": 41
	},
	"id": "chatcmpl-a6oVnja9gLmx3o948hU46mWUD7sWjsPF",
	"timings": {
		"prompt_n": 1,
		"prompt_ms": 10.662,
		"prompt_per_token_ms": 10.662,
		"prompt_per_second": 93.79103357719,
		"predicted_n": 8,
		"predicted_ms": 60.236,
		"predicted_per_token_ms": 7.5295,
		"predicted_per_second": 132.81094362175443
	}
}
```

## API Parameters

### Request Parameters

- **messages** (array, required): Array of message objects with `role` and `content` fields
  - `role`: Can be "system", "user", or "assistant"
  - `content`: The message content as a string
- **temperature** (float, optional): Controls randomness in the output (0.0 to 1.0)
- **stream** (boolean, optional): Whether to stream the response
- **max_tokens** (integer, optional): Maximum number of tokens to generate

### Response Fields

- **choices**: Array of completion choices
- **created**: Unix timestamp of when the completion was created
- **model**: The model used for the completion
- **system_fingerprint**: Unique identifier for the system configuration
- **object**: Object type (chat.completion)
- **usage**: Token usage statistics
  - `completion_tokens`: Number of tokens in the completion
  - `prompt_tokens`: Number of tokens in the prompt
  - `total_tokens`: Total tokens used
- **id**: Unique identifier for the completion
- **timings**: Detailed timing information for the request