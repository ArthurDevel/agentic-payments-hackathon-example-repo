"""
LLaMA Chat Model Handler for dat1 Platform

This handler provides an OpenAI-compatible chat API using llama.cpp server.
Supports streaming and non-streaming responses for any GGUF format model.

Responsibilities:
- Start llama.cpp server on initialization
- Provide health check endpoint
- Proxy chat completion requests to llama.cpp server
- Support both streaming (SSE) and non-streaming responses
"""

import os
import traceback
import sys
from pathlib import Path
import subprocess
import requests
from fastapi import Request, FastAPI, Response
from sse_starlette.sse import EventSourceResponse
import sseclient
from requests import Response as RequestsResponse

# ============================================================================
# CONSTANTS
# ============================================================================

ROOT_DIR = Path(__file__).parent
LLAMA_SERVER_PORT = 8080

# ============================================================================
# MODEL INITIALIZATION
# ============================================================================

# Start llama.cpp server
process = subprocess.Popen(
    [
        "/workspace/llama.cpp/build/bin/llama-server",
        "-m", str(ROOT_DIR / "model.gguf"),
        "--ctx-size", "128000",
        "-ngl", "999999",
        "--port", str(LLAMA_SERVER_PORT)
    ],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    universal_newlines=True
)

# Wait for the model to load
for line in process.stdout:
    print(line, end='')
    if "main: model loaded" in line:
        print("Model is loaded.")
        break

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI()

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root(response: Response):
    """
    Health check endpoint

    Params:
        response: FastAPI response object to set status code

    Returns:
        str: "OK" if llama.cpp server is healthy, error text otherwise
    """
    try:
        health_response = requests.get(f"http://localhost:{LLAMA_SERVER_PORT}/health")
        if health_response.status_code == 200:
            return "OK"
        else:
            response.status_code = 500
            return health_response.text
    except requests.exceptions.RequestException as e:
        response.status_code = 500
        return str(e)


@app.post("/infer")
async def infer(request: Request):
    """
    Chat completion inference endpoint (OpenAI-compatible)

    Expects JSON body with:
    - messages: array of message objects with role and content
    - temperature: (optional) sampling temperature
    - stream: (optional) boolean for streaming responses
    - max_tokens: (optional) maximum tokens to generate

    Params:
        request: FastAPI request object containing JSON body

    Returns:
        dict or EventSourceResponse: Chat completion response or SSE stream
    """
    body = await request.json()

    try:
        llama_response = requests.post(
            f"http://localhost:{LLAMA_SERVER_PORT}/v1/chat/completions",
            json=body,
            stream=body.get("stream", False)
        )

        if llama_response.status_code == 200:
            # Check if response is streaming
            if "text/event-stream" in llama_response.headers.get("Content-Type", ""):
                return EventSourceResponse(event_generator(llama_response), sep="\n")
            else:
                return llama_response.json()
        else:
            return llama_response.text

    except requests.exceptions.RequestException as e:
        return {"status": "ERROR", "message": str(e)}


@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for debugging

    Params:
        request: The request that caused the exception
        exc: The exception that was raised

    Returns:
        Response: Formatted traceback with 500 status code
    """
    exc_type, exc_value, exc_tb = sys.exc_info()
    formatted_traceback = "".join(
        traceback.format_exception(exc_type, exc_value, exc_tb)
    )
    return Response(content=formatted_traceback, media_type="text/plain", status_code=500)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def event_generator(response: RequestsResponse):
    """
    Generator for streaming SSE events from llama.cpp server

    Params:
        response: Requests response object with streaming content

    Returns:
        dict: Event dictionary with event type and data
    """
    client = sseclient.SSEClient(response)
    for event in client.events():
        yield {
            "event": event.event or "message",
            "data": event.data,
        }
