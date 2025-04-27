FROM python:3.12-slim-bookworm AS base
WORKDIR /app/api

ENV POETRY_VERSION=2.0.1
RUN pip install --no-cache-dir poetry==${POETRY_VERSION} \
    -i https://mirrors.aliyun.com/pypi/simple/ \
    --trusted-host mirrors.aliyun.com

RUN echo "deb https://mirrors.aliyun.com/debian/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && echo "deb https://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list \
    && echo "deb https://mirrors.aliyun.com/debian/ bookworm-backports main contrib non-free non-free-firmware" >> /etc/apt/sources.list \
    && echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list \
    && rm -f /etc/apt/sources.list.d/*

ENV POETRY_CACHE_DIR=/tmp/poetry_cache
ENV POETRY_NO_INTERACTION=1
ENV POETRY_VIRTUALENVS_IN_PROJECT=true
ENV POETRY_VIRTUALENVS_CREATE=true
ENV POETRY_REQUESTS_TIMEOUT=60
ENV HTTP_TIMEOUT=600
ENV HTTPS_TIMEOUT=600
ENV POETRY_MAX_PARALLEL_DOWNLOADS=3

FROM base AS packages
WORKDIR /app/api

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ \
    && pip config set global.trusted-host mirrors.aliyun.com \
    && pip config set global.timeout 600
RUN poetry config repositories.aliyun https://mirrors.aliyun.com/pypi/simple/

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    nodejs \
    libgomp1 \
    python3-dev \
    libffi-dev \
    libgmp-dev \
    libmpfr-dev \
    libmpc-dev \
    expat \
    libldap-2.5-0 \
    perl \
    libsqlite3-0 \
    zlib1g \
    fonts-noto-cjk \
    libmagic1 \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock ./

RUN poetry install --no-root --no-cache -vvv

FROM base AS production
WORKDIR /app/api

ENV FLASK_APP=app.py
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://api:5001
ENV CONSOLE_WEB_URL=http://web:3000
ENV SERVICE_API_URL=http://api:5001
ENV APP_WEB_URL=http://web:3000
ENV TZ=UTC
ENV VIRTUAL_ENV=/app/api/.venv

COPY --from=packages ${VIRTUAL_ENV} ${VIRTUAL_ENV}

ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl nodejs libgomp1 \
    expat libldap-2.5-0 perl libsqlite3-0 zlib1g \
    fonts-noto-cjk \
    libmagic1 \
    libgmp10 \
    libmpfr6 \
    libmpc3 \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"

COPY . /app/api/

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

EXPOSE 5001
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]
