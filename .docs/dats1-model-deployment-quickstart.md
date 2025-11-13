# Getting Started
source: [https://docs.dat1.co/start/](https://docs.dat1.co/start/)

## Create an Account

You can create a new account by visiting [Dat1 console](https://console.dat1.co).

After your account is ready, you can generate your first API key on the [API keys management page](https://console.dat1.co/api-keys).

## Dat1 CLI

To deploy your first model, you need to install the Dat1 CLI. You can do this by running the following command:

```bash
pip install dat1-cli
```

Then initialize your Dat1 CLI with your API key by running the following command:

```bash
dat1 login
```

## Deploying Your First Model

You can find ready-to-deploy example models in our [examples repository](https://github.com/dat1-co/dat1-model-examples).

If you have any questions or need help deploying models, feel free to reach out at [tech@dat1.co](mailto:tech@dat1.co).

To initialize a new model project, run this in the root directory of your project:

```bash
dat1 init
```

This will create a `dat1.yaml` file in the root directory of your project. This file contains the configuration for your model:

```yaml
model_name: <your model name>
exclude:
- '**/.git/**'
- '**/.idea/**'
- '*.md'
- '*.jpg'
- .dat1.yaml
- .DS_Store
```

Exclude uses glob patterns to exclude files from being uploaded to the platform.

The platform expects a `handler.py` file in the root directory of your project that contains a FastAPI app with two endpoints: GET `/` for healthchecks and POST `/infer` for inference. An example handler is shown below:

```python
from fastapi import Request, FastAPI
from vllm import LLM, SamplingParams
import os

# Model initialization Code
# This code should be placed before the FastAPI app is initialized
llm = LLM(model=os.path.expanduser('./'), load_format="safetensors", enforce_eager=True)

app = FastAPI()

@app.get("/")
async def root():
    return "OK"

@app.post("/infer")
async def infer(request: Request):
    # Inference Code
    request = await request.json()
    prompts = request["prompt"]
    sampling_params = SamplingParams(temperature=0.8, top_p=0.95)
    outputs = llm.generate(prompts, sampling_params)
    return { "response" : outputs[0].outputs[0].text }
```

Once you have created the `dat1.yaml` file and the `handler.py` file, you can deploy your model by running the following command:

```bash
dat1 deploy
```

The CLI will print out the endpoint for your model after the deployment is complete.

## Streaming Responses with Server-Sent Events

To stream responses to the client, you can use Server-Sent Events (SSE).

To specify that the response should be streamed, you need to add `response_type: sse` to the model definition in the `dat1.yaml` file.

```yaml
model_name: chat_completion
response_type: sse
exclude:
- '**/.git/**'
- '**/.idea/**'
- '*.md'
- '*.jpg'
- .dat1.yaml
```

The handler code should be modified to return a generator that yields the responses:

```python
from fastapi import Request, FastAPI
from sse_starlette.sse import EventSourceResponse
import json

app = FastAPI()

@app.get("/")
async def root():
    return "OK"

async def response_generator():
    for i in range(10):
        yield json.dumps({"response": f"Response {i}"})

@app.post("/infer")
async def infer(request: Request):
    return EventSourceResponse(response_generator(), sep="\n")
```