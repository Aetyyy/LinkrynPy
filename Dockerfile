FROM python:3.11-slim

# Install system dependencies: ffmpeg (audio), curl (health checks), ca-certificates
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Build frontend if dist folder doesn't exist
# (Recommended: build locally and commit web/dist)
# RUN cd web && npm ci && npm run build

CMD ["python", "main.py"]
