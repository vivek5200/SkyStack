FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY src/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all necessary source code
COPY src/api/main.py .
COPY src/common/ ./common

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]