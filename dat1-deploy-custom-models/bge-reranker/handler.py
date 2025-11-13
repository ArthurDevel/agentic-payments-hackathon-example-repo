"""
BGE Reranker v2-m3 Handler for dat1 Platform

This handler provides a reranking API for the BAAI/bge-reranker-v2-m3 model.
The reranker evaluates relevance between queries and passages, outputting similarity scores.

Responsibilities:
- Load the BGE reranker model on startup
- Provide health check endpoint
- Handle inference requests with query-passage pairs
- Return relevance scores (optionally normalized to 0-1 range)
"""

from fastapi import Request, FastAPI, Response
from FlagEmbedding import FlagReranker
import sys
import traceback

# ============================================================================
# MODEL INITIALIZATION
# ============================================================================

reranker = FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=True)

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI()

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """
    Health check endpoint

    Returns:
        str: "OK" if service is healthy
    """
    return "OK"


@app.post("/infer")
async def infer(request: Request):
    """
    Reranking inference endpoint

    Expects JSON body with:
    - pairs: list of [query, passage] pairs to score
    - normalize: (optional) boolean to normalize scores to 0-1 range

    Params:
        request: FastAPI request object containing JSON body

    Returns:
        dict: {"scores": [float, ...]} with relevance scores for each pair
    """
    body = await request.json()

    pairs = body.get("pairs", [])
    normalize = body.get("normalize", False)

    if not pairs:
        return {"status": "ERROR", "message": "No pairs provided"}

    # Compute scores for all pairs
    scores = reranker.compute_score(pairs, normalize=normalize)

    # Ensure scores is always a list
    if not isinstance(scores, list):
        scores = [scores]

    return {"scores": scores}


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
