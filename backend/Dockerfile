FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install minimal C++ and graphical runtime libraries for ONNX, OpenCV headless, and PIL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download both FastEmbed and RapidOCR ONNX models during build so runtime never hangs or times out
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/all-MiniLM-L6-v2')"
RUN python -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()"

COPY . .

# Explicit single worker to avoid 512MB RAM overflow
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
