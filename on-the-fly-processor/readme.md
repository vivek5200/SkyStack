# proper stepss
# Step 1: Start Your Services
docker-compose up --build -d

# Step 2: Upload Your Satellite Data

docker-compose exec aws-setup python /aws-init/upload_data.py /data/3RIMG_04SEP2024_1015_L1B_STD_V01R00/ 3RIMG_04SEP2024_1015_L1B_STD_V01R00/

# Step 3: Trigger the Workflow

GO TO POSTMAN FOR Triggering the workflow

# Step 4: Verify the Job Was Accepted

docker-compose exec aws-setup aws dynamodb get-item --table-name WorkflowJobs --key '{\"job_id\": {\"S\": \"5a37558c-da52-4e81-b43e-c041c20f6df8\"}}' --endpoint-url=http://localstack:4566 --no-cli-pager

# Step 5: See the Translator's Final Output

docker-compose exec aws-setup aws stepfunctions get-execution-history --execution-arn 'arn:aws:states:us-east-1:000000000000:execution:OnTheFlyProcessorStateMachine:5a37558c-da52-4e81-b43e-c041c20f6df8' --endpoint-url=http://localstack:4566 --no-cli-pager


docker-compose exec aws-setup aws stepfunctions get-execution-history --execution-arn 'arn:aws:states:us-east-1:000000000000:execution:OnTheFlyProcessorStateMachine:4c187f20-e5e6-4bd6-be36-519cb1d191f4' --endpoint-url=http://localstack:4566 --no-cli-pager




# To upload the files to the s3
docker-compose exec aws-setup python /aws-init/upload_data.py /data/3RIMG_04SEP2024_1015_L1B_STD_V01R00/ 3RIMG_04SEP2024_1015_L1B_STD_V01R00/

# To check Dynamo-db
docker-compose exec aws-setup aws dynamodb get-item --table-name WorkflowJobs --key '{"job_id": {"S": "4675ef5a-34c2-4a90-bf45-c4ef25e9427b\"}}' --endpoint-url=http://localstack:4566

docker-compose exec aws-setup aws dynamodb get-item --table-name WorkflowJobs --key '{\"job_id\": {\"S\": \"4675ef5a-34c2-4a90-bf45-c4ef25e9427b\"}}' --endpoint-url=http://localstack:4566 --no-cli-pager

# To See the Step Function History Just Put The requested ExecutionArn from Postman
  docker-compose exec aws-setup aws stepfunctions get-execution-history --execution-arn 'arn:aws:states:us-east-1:000000000000:execution:OnTheFlyProcessorStateMachine:4675ef5a-34c2-4a90-bf45-c4ef25e9427b' --endpoint-url=http://localstack:4566 --no-cli-pager


  #
  PS G:\Final Year Project\2nd Achritecture\on-the-fly-processor> docker-compose exec aws-setup aws stepfunctions get-execution-history --execution-arn 'arn:aws:states:us-east-1:000000000000:execution:OnTheFlyProcessorStateMachine:187aa934-1812-4557-8bf9-482f6e9d3c0e' --endpoint-url=http://localstack:4566 --query "events[?type=='TaskSucceeded'].taskSucceededEventDetails.output | [0]" --output text --no-cli-pager

docker-compose exec aws-setup aws stepfunctions get-execution-history --execution-arn 'arn:aws:states-us-east-1:000000000000:execution:OnTheFlyProcessorStateMachine:187aa934-1812-4557-8bf9-482f6e9d3c0e' --endpoint-url=http://localstack:4566 --query 'events[?type==`"TaskSucceeded"`].taskSucceededEventDetails.output | [0]' --output text --no-cli-pager