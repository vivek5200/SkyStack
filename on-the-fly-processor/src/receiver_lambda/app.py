import os
import json
import uuid
import boto3
from datetime import datetime

# The function is now correctly named 'handler'
def handler(event, context):
    """
    Lambda handler for receiving, validating, saving state, and starting a Step Functions workflow.
    """
    AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")
    STATE_MACHINE_ARN = "arn:aws:states:us-east-1:000000000000:stateMachine:OnTheFlyProcessorStateMachine"
    DYNAMODB_TABLE_NAME = "WorkflowJobs"

    try:
        print("Receiver Lambda invoked.")
        
        workflow_data = event
        dataset_id = workflow_data.get("dataset_id")

        if not dataset_id:
            return {"statusCode": 400, "body": json.dumps({"error": "dataset_id is a required field."})}

        # --- VALIDATION LOGIC ---
        s3_bucket_name = "insat-cog-processed"
        manifest_key = f"{dataset_id}/manifest.json"
        s3_client = boto3.client("s3", endpoint_url=AWS_ENDPOINT_URL)
        
        try:
            s3_client.head_object(Bucket=s3_bucket_name, Key=manifest_key)
            print("Validation successful.")
        except s3_client.exceptions.ClientError as e:
            if e.response['Error']['Code'] == '404':
                return {"statusCode": 404, "body": json.dumps({"error": f"Dataset not found: {dataset_id}"})}
            raise

        # --- SAVE INITIAL STATE TO DYNAMODB ---
        job_uuid = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        dynamodb_item = {
            'job_id': {'S': job_uuid},
            'dataset_id': {'S': dataset_id},
            'status': {'S': 'ACCEPTED'},
            'received_at': {'S': timestamp},
            'initial_dag': {'S': json.dumps(workflow_data)}
        }
        print(f"Saving initial state for job_id '{job_uuid}'...")
        dynamodb_client = boto3.client("dynamodb", endpoint_url=AWS_ENDPOINT_URL)
        dynamodb_client.put_item(TableName=DYNAMODB_TABLE_NAME, Item=dynamodb_item)
        print("...state saved successfully.")

        # --- WORKFLOW KICKOFF LOGIC ---
        sfn_client = boto3.client("stepfunctions", endpoint_url=AWS_ENDPOINT_URL)
        sfn_input = workflow_data
        sfn_input['job_id'] = job_uuid
        
        print(f"Starting Step Functions execution for job_id '{job_uuid}'...")
        response = sfn_client.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            name=job_uuid,
            input=json.dumps(sfn_input)
        )
        print(f"Step Functions execution started. ARN: {response['executionArn']}")

        response_body = {
            "message": "Workflow accepted, validated, and execution started.",
            "job_id": job_uuid,
            "executionArn": response['executionArn']
        }
        
        return {"statusCode": 200, "body": json.dumps(response_body)}

    except Exception as e:
        print(f"FATAL Error in Receiver: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "An internal server error occurred."})}
