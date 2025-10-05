import boto3
import os
import time
import logging
import io
import zipfile
import json
import shutil
import tempfile
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_zip_from_prebuilt_layer(layer_path):
    """
    Zips the contents of the pre-built layer directory created by the Dockerfile.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        layer_zip_path = os.path.join(temp_dir, 'geospatial-layer.zip')
        shutil.make_archive(layer_zip_path.replace('.zip', ''), 'zip', layer_path)
        
        with open(layer_zip_path, 'rb') as f:
            return f.read()

def create_function_zip(source_dir, function_name):
    """
    Creates a zip archive for a Lambda function.
    """
    func_zip = io.BytesIO()
    with zipfile.ZipFile(func_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        dirs_to_zip = [
            os.path.join(source_dir, function_name),
            os.path.join(source_dir, 'common')
        ]
        for d in dirs_to_zip:
            if os.path.isdir(d):
                for root, _, filenames in os.walk(d):
                    for filename in filenames:
                        file_path = os.path.join(root, filename)
                        archive_name = os.path.relpath(file_path, source_dir)
                        info = zipfile.ZipInfo(archive_name)
                        info.external_attr = 0o755 << 16
                        with open(file_path, 'rb') as f:
                            zf.writestr(info, f.read())
    
    func_zip.seek(0)
    return func_zip.read()

def main():
    """Waits for LocalStack and creates all necessary AWS resources."""
    lambda_names = ["receiver_lambda", "translator_lambda", "processor_lambda"]
    sfn_state_machine_name = "OnTheFlyProcessorStateMachine"
    dynamodb_table_name = "WorkflowJobs"
    layer_name = "geospatial-dependencies"
    
    iam_role_arn = "arn:aws:iam::000000000000:role/lambda-role"
    sfn_role_arn = "arn:aws:iam::000000000000:role/stepfunctions-role"
    lambda_arns = { name: f"arn:aws:lambda:us-east-1:000000000000:function:{name}" for name in lambda_names }

    endpoint_url = "http://localstack:4566"
    s3_bucket_name = "insat-cog-processed"
    lambda_source_path = "/src/"
    prebuilt_layer_path = "/layer/python"

    logging.info("Waiting for LocalStack services to be ready...")
    time.sleep(15)

    try:
        lambda_client = boto3.client("lambda", endpoint_url=endpoint_url, region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test")
        s3_client = boto3.client("s3", endpoint_url=endpoint_url, region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test")
        iam_client = boto3.client("iam", endpoint_url=endpoint_url, region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test")
        sfn_client = boto3.client("stepfunctions", endpoint_url=endpoint_url, region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test")
        dynamodb_client = boto3.client("dynamodb", endpoint_url=endpoint_url, region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test")

        s3_client.create_bucket(Bucket=s3_bucket_name)
        iam_client.create_role(RoleName='lambda-role', AssumeRolePolicyDocument=json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]}))
        iam_client.create_role(RoleName='stepfunctions-role', AssumeRolePolicyDocument=json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "states.amazonaws.com"}, "Action": "sts:AssumeRole"}]}))
        dynamodb_client.create_table(TableName=dynamodb_table_name, KeySchema=[{'AttributeName': 'job_id', 'KeyType': 'HASH'}], AttributeDefinitions=[{'AttributeName': 'job_id', 'AttributeType': 'S'}], BillingMode='PAY_PER_REQUEST')

        logging.info("Zipping pre-built geospatial layer from /layer...")
        layer_zip_bytes = create_zip_from_prebuilt_layer(prebuilt_layer_path)
        
        logging.info(f"Publishing geospatial layer version ({len(layer_zip_bytes)} bytes)...")
        layer_response = lambda_client.publish_layer_version(
            LayerName=layer_name,
            Content={'ZipFile': layer_zip_bytes},
            CompatibleRuntimes=['python3.9']
        )
        layer_arn = layer_response['LayerVersionArn']
        logging.info(f"Successfully published layer with ARN: {layer_arn}")

        for name in lambda_names:
            function_zip_bytes = create_function_zip(lambda_source_path, name)
            layers_to_attach = [layer_arn] if name in ["translator_lambda", "processor_lambda"] else []
            lambda_client.create_function(
                FunctionName=name, Role=iam_role_arn, Runtime='python3.9', Handler=f"{name}.app.handler",
                Code={'ZipFile': function_zip_bytes}, Timeout=300, MemorySize=3008, Layers=layers_to_attach
            )
            logging.info(f"Lambda function '{name}' created.")

        state_machine_definition = {
            "StartAt": "TranslateDAG",
            "States": {
                "TranslateDAG": {
                    "Type": "Task",
                    "Resource": lambda_arns["translator_lambda"],
                    "Next": "ExecuteTilesInParallel"
                },
                "ExecuteTilesInParallel": {
                    "Type": "Map",
                    "InputPath": "$.tile_tasks",
                    "MaxConcurrency": 10,
                    "Iterator": {
                        "StartAt": "ProcessSingleTile",
                        "States": {
                            "ProcessSingleTile": {
                                "Type": "Task",
                                "Resource": lambda_arns["processor_lambda"],
                                "End": True
                            }
                        }
                    },
                    "End": True
                }
            }
        }
        
        sfn_client.create_state_machine(
            name=sfn_state_machine_name, 
            definition=json.dumps(state_machine_definition), 
            roleArn=sfn_role_arn
        )
        logging.info(f"Created Step Functions state machine: {sfn_state_machine_name}")
        logging.info("AWS resources initialized successfully! ✅")

    except Exception as e:
        logging.error(f"An error occurred during initialization: {e}", exc_info=True)

if __name__ == "__main__":
    main()