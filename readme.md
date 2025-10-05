# SkyStack

SkyStack is a comprehensive solution for processing satellite data, featuring two main architectural components: a Node.js-based service for converting HDF5 files to COG format, and a more complex, on-the-fly processing pipeline orchestrated with AWS services using Docker-compose and LocalStack.

## Table of Contents

- [SkyStack](#skystack)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Usage](#usage)
    - [First Architecture (HDF5 to COG Converter)](#first-architecture-hdf5-to-cog-converter)
    - [On-the-Fly Processor](#on-the-fly-processor)
  - [Project Structure](#project-structure)
  - [Built With](#built-with)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)
  - [Acknowledgements](#acknowledgements)

## Getting Started

### Prerequisites

* Docker
* Docker-compose
* AWS CLI (for the on-the-fly processor)
* Postman (for triggering workflows in the on-the-fly processor)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/SkyStack.git](https://github.com/your-username/SkyStack.git)
    cd SkyStack
    ```

2.  **First Architecture (HDF5 to COG Converter):**
    * Navigate to the `Final 1st Architecture` directory.
    * Build the Docker image:
        ```bash
        docker build --no-cache -t hdf5 .
        ```

3.  **On-the-Fly Processor:**
    * Navigate to the `on-the-fly-processor` directory.
    * Start the services:
        ```bash
        docker-compose up --build -d
        ```

## Usage

### First Architecture (HDF5 to COG Converter)

To run the HDF5 to COG conversion, use the following command, ensuring you have an `input` and `output` directory in the `Final 1st Architecture` folder:

```bash
docker run --rm --entrypoint sh -v "$PWD/input:/app/input" -v "$PWD/output:/app/output" hdf5 -c "/app/hdf5_to_cog --outdir /app/output /app/input/*.h5"
```

### On-the-Fly Processor

1.  **Upload Satellite Data:**
    * Place your satellite data in the appropriate directory.
    * Execute the upload script:
        ```bash
        docker-compose exec aws-setup python /aws-init/upload_data.py /data/3RIMG_04SEP2024_1015_L1B_STD_V01R00/ 3RIMG_04SEP2024_1015_L1B_STD_V01R00/
        ```

2.  **Trigger the Workflow:**
    * Use Postman to send a request to the appropriate endpoint to trigger the processing workflow.

3.  **Verify the Job:**
    * Check the status of a job in DynamoDB:
        ```bash
        docker-compose exec aws-setup aws dynamodb get-item --table-name WorkflowJobs --key '{\"job_id\": {\"S\": \"<your-job-id>\"}}' --endpoint-url=http://localstack:4566 --no-cli-pager
        ```

4.  **View Execution History:**
    * To see the final output and the history of the Step Function execution, use the execution ARN from Postman:
        ```bash
        docker-compose exec aws-setup aws stepfunctions get-execution-history --execution-arn '<your-execution-arn>' --endpoint-url=http://localstack:4566 --no-cli-pager
        ```

## Project Structure

```
SkyStack/
├── Final 1st Architecture/      # HDF5 to COG converter
│   ├── converter/
│   ├── frontend/
│   ├── node_modules/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package-lock.json
│   ├── package.json
│   ├── readme.md
│   └── server.js
└── on-the-fly-processor/        # On-the-fly processing pipeline
    ├── aws-init/
    ├── processor_lambda/
    ├── src/
    │   ├── api/
    │   ├── common/
    │   ├── receiver_lambda/
    │   └── translator_lambda/
    ├── api.Dockerfile
    ├── docker-compose.yml
    ├── readme.md
    └── setup.Dockerfile
```

## Built With

* **Backend:** Node.js, Express, Python
* **Containerization:** Docker
* **Orchestration:** Docker-compose
* **AWS Services (LocalStack):**
    * S3
    * DynamoDB
    * Step Functions
    * Lambda
* **Frontend:** HTML, CSS, JavaScript
