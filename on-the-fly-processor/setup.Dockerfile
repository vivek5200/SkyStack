# Stage 1: The Layer Builder
# This stage is dedicated to creating a clean installation of our dependencies.
FROM python:3.9-slim-bullseye AS layer-builder

# Install build-time dependencies needed for rasterio
RUN apt-get update && apt-get install -y libgdal-dev && rm -rf /var/lib/apt/lists/*

# Create the exact directory structure that the AWS Lambda runtime requires for layers
WORKDIR /layer
RUN mkdir -p python/lib/python3.9/site-packages

# Install rasterio and all its dependencies directly into the target directory
RUN pip install --target=./python/lib/python3.9/site-packages rasterio

# ---

# Stage 2: The Final Setup Image
# This is the container that will actually run. It starts from a clean base.
FROM python:3.9-slim-bullseye

# Install runtime dependencies needed for our setup script (curl, unzip, aws-cli)
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

# Install boto3, which our setup script needs to talk to LocalStack
RUN pip install boto3
# Install rasterio into the translator_lambda directory
RUN pip install rasterio==1.3.8 --target /aws-init/src/translator_lambda/
# --- This is the key step ---
# Copy the fully-built and correctly structured layer from the builder stage
COPY --from=layer-builder /layer /layer

# Copy our own source code and init scripts
COPY ./aws-init/ /aws-init/
COPY ./src/ /src/

# Set the working directory
WORKDIR /aws-init

# The command to run when the container starts
CMD ["sh", "-c", "python init_aws.py && echo '--- Setup complete. Container is now idle and ready for exec commands. ---' && tail -f /dev/null"]
