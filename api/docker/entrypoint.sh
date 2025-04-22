#!/bin/bash

set -e

# 定义 venv bin 路径
VENV_BIN="/app/api/.venv/bin"

if [[ "${MIGRATION_ENABLED}" == "true" ]]; then
  echo "Running migrations"
  # 使用绝对路径
  "$VENV_BIN/flask" upgrade-db
fi

if [[ "${MODE}" == "worker" ]]; then
  # ... (获取 CONCURRENCY_OPTION) ...
  # 使用绝对路径
  exec "$VENV_BIN/celery" -A app.celery worker -P ${CELERY_WORKER_CLASS:-gevent} $CONCURRENCY_OPTION --loglevel ${LOG_LEVEL:-INFO} \
    -Q ${CELERY_QUEUES:-dataset,mail,ops_trace,app_deletion}

elif [[ "${MODE}" == "beat" ]]; then
  # 使用绝对路径
  exec "$VENV_BIN/celery" -A app.celery beat --loglevel ${LOG_LEVEL:-INFO}
else
  if [[ "${DEBUG}" == "true" ]]; then
    # 使用绝对路径
    exec "$VENV_BIN/flask" run --host=${DIFY_BIND_ADDRESS:-0.0.0.0} --port=${DIFY_PORT:-5001} --debug
  else
    # 使用绝对路径
    exec "$VENV_BIN/gunicorn" \
      --bind "${DIFY_BIND_ADDRESS:-0.0.0.0}:${DIFY_PORT:-5001}" \
      --workers ${SERVER_WORKER_AMOUNT:-1} \
      --worker-class ${SERVER_WORKER_CLASS:-gevent} \
      --worker-connections ${SERVER_WORKER_CONNECTIONS:-10} \
      --timeout ${GUNICORN_TIMEOUT:-200} \
      "app_factory:create_app()"
  fi
fi