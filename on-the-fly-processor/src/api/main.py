import os
import json
import boto3
from fastapi import FastAPI, HTTPException
from common.schemas import WorkflowRequest

app = FastAPI()

# Use environment variables to decide if we are running locally
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")

# Create a boto3 client to interact with AWS Lambda
lambda_client = boto3.client("lambda", endpoint_url=AWS_ENDPOINT_URL)
RECEIVER_LAMBDA_NAME = "receiver_lambda"

@app.get("/")
def read_root():
    return {"message": "On-the-fly processing API is running."}

@app.post("/workflows")
async def create_workflow(request: WorkflowRequest):
    """
    This endpoint accepts a workflow request and invokes the Receiver Lambda.
    """
    try:
        print(f"Invoking {RECEIVER_LAMBDA_NAME} with payload...")
        
        payload = json.dumps(request.dict())

        response = lambda_client.invoke(
            FunctionName=RECEIVER_LAMBDA_NAME,
            InvocationType='RequestResponse', # Synchronous invocation
            Payload=payload
        )
        
        # The response from the Lambda function's handler
        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        if response_payload.get("statusCode") != 200:
            raise HTTPException(
                status_code=response_payload.get("statusCode", 500),
                detail=response_payload.get("body", "Error in Receiver Lambda.")
            )

        return response_payload.get("body")

    except Exception as e:
        print(f"Error invoking Lambda: {e}")
        raise HTTPException(status_code=500, detail=str(e))