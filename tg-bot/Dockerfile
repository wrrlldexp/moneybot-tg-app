FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

RUN adduser --disabled-password --gecos '' appuser

COPY . .
RUN chown -R appuser:appuser /app

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import bot.config" || exit 1

CMD ["python", "-m", "bot.main"]
