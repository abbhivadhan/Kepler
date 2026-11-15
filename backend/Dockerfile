FROM python:3.11-slim

# Install system dependencies for C-extensions (CSPICE) and network tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for Docker caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and scientific datasets (SPICE kernels & LOLA DEM)
COPY . .

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

# Start Kepler API with Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
