FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV PORT=10000

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend

EXPOSE 10000

CMD ["sh", "-c", "gunicorn --chdir backend --bind 0.0.0.0:${PORT} --workers 1 --threads 2 --timeout 180 app:app"]
