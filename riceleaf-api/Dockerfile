FROM python:3.11-slim

WORKDIR /app

# ลดปัญหา build ที่ต้องคอมไพล์อะไรเพิ่ม
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# ติดตั้ง torch/vision แบบ CPU wheel (ใช้ extra-index เพื่อให้ dependency อื่นยังมาจาก PyPI ปกติ)
RUN pip install --no-cache-dir -U pip \
 && pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY app ./app
COPY models ./models

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
