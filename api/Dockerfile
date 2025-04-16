# base image
FROM python:3.12-slim-bookworm AS base

WORKDIR /app/api

# Install Poetry
ENV POETRY_VERSION=2.0.1

# if you located in China, you can use aliyun mirror to speed up
# RUN pip install --no-cache-dir poetry==${POETRY_VERSION} -i https://mirrors.aliyun.com/pypi/simple/
# RUN pip install --no-cache-dir poetry==${POETRY_VERSION} 


RUN pip install --no-cache-dir poetry==${POETRY_VERSION} -i https://mirror.nju.edu.cn/pypi/web/simple/ --trusted-host mirror.nju.edu.cn



RUN cat <<EOF > /etc/apt/sources.list
# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
deb https://mirror.nju.edu.cn/debian/ bookworm main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm main contrib non-free non-free-firmware

deb https://mirror.nju.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware

deb https://mirror.nju.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware

# 以下安全更新软件源包含了官方源与镜像站配置，如有需要可自行修改注释切换
deb https://mirror.nju.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware

# deb https://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
# deb-src https://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF
# --- 确保安装了构建工具和 Python 开发头文件 ---
# 合并 RUN 指令以减少镜像层数
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \ 
    curl \            
    nodejs \          
    libgomp1 \        
    # --- 添加 python3-dev 或 python3.12-dev ---
    python3-dev \     
    libffi-dev \      
    # --- 添加其他可能需要的编译依赖 (根据具体包) ---
    # 例如：libssl-dev, pkg-config 等
 && apt-get clean && rm -rf /var/lib/apt/lists/* 
 





# Configure Poetry
ENV POETRY_CACHE_DIR=/tmp/poetry_cache
ENV POETRY_NO_INTERACTION=1
ENV POETRY_VIRTUALENVS_IN_PROJECT=true
ENV POETRY_VIRTUALENVS_CREATE=true
ENV POETRY_REQUESTS_TIMEOUT=30
# ENV POETRY_MAX_PARALLEL_DOWNLOADS=2
ENV HTTP_TIMEOUT=600
ENV HTTPS_TIMEOUT=600

FROM base AS packages
# 在这里添加代理环境变量设置
# ENV HTTP_PROXY="http://host.docker.internal:7890"
# ENV HTTPS_PROXY="http://host.docker.internal:7890"

# if you located in China, you can use aliyun mirror to speed up
# RUN sed -i 's@deb.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list.d/debian.sources

# # --- 在这里为 packages 阶段添加更换镜像源的命令 ---
# # 尝试替换 /etc/apt/sources.list.d/debian.sources (如果存在)
# RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || \
# # 或者尝试替换 /etc/apt/sources.list (如果上面文件不存在)
#     sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list || \
# # 如果两者都不存在或替换失败，打印一条消息（但继续执行）
#     echo "Could not replace debian sources in packages stage, using default."
# ---------------------------------------------
# RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
#     pip config set global.trusted-host mirrors.aliyun.com && \
RUN   pip config set global.timeout 600
# RUN poetry config repositories.aliyun https://mirrors.aliyun.com/pypi/simple/

RUN cat <<EOF > /etc/apt/sources.list
# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
deb https://mirror.nju.edu.cn/debian/ bookworm main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm main contrib non-free non-free-firmware

deb https://mirror.nju.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware

deb https://mirror.nju.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware

# 以下安全更新软件源包含了官方源与镜像站配置，如有需要可自行修改注释切换
deb https://mirror.nju.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware

# deb https://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
# deb-src https://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

# 检查并清空 sources.list.d 目录 (可选，但可以排除干扰)
RUN echo "Checking /etc/apt/sources.list.d/:" && \
    ls -l /etc/apt/sources.list.d/ && \
    rm -f /etc/apt/sources.list.d/*

RUN echo "Verifying sources.list content:" && cat /etc/apt/sources.list

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc g++ libc-dev libffi-dev libgmp-dev libmpfr-dev libmpc-dev

# Install Python dependencies

COPY api/pyproject.toml api/poetry.lock ./

# RUN poetry config repositories.aliyun https://mirrors.aliyun.com/pypi/simple/ 
# RUN poetry config repositories.tuna https://pypi.tuna.tsinghua.edu.cn/simple/

# RUN poetry config settings.repository tuna


# RUN poetry install --sync --no-cache --no-root



RUN poetry source add --priority=primary tuna https://mirror.nju.edu.cn/pypi/web/simple/
# 检查一下 Poetry 的源配置 (可选，用于调试)
RUN poetry source show

RUN poetry install --sync --no-cache --no-root -vvv


# production stage
FROM base AS production

ENV FLASK_APP=app.py
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://127.0.0.1:5001
ENV CONSOLE_WEB_URL=http://127.0.0.1:3000
ENV SERVICE_API_URL=http://127.0.0.1:5001
ENV APP_WEB_URL=http://127.0.0.1:3000

EXPOSE 5001

# set timezone
ENV TZ=UTC

WORKDIR /app/api

# 在这里添加代理环境变量设置
# ENV HTTP_PROXY="http://host.docker.internal:7890"
# ENV HTTPS_PROXY="http://host.docker.internal:7890"
# RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || \
#     sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list || \
#     echo "Could not replace debian sources, using default."
# 增加 pip 全局超时时间（例如 120 秒）
RUN pip config set global.timeout 600

RUN cat <<EOF > /etc/apt/sources.list
# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
deb https://mirror.nju.edu.cn/debian/ bookworm main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm main contrib non-free non-free-firmware

deb https://mirror.nju.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware

deb https://mirror.nju.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware

# 以下安全更新软件源包含了官方源与镜像站配置，如有需要可自行修改注释切换
deb https://mirror.nju.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware
# deb-src https://mirror.nju.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware

# deb https://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
# deb-src https://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

# 检查并清空 sources.list.d 目录 (可选，但可以排除干扰)
RUN echo "Checking /etc/apt/sources.list.d/:" && \
    ls -l /etc/apt/sources.list.d/ && \
    rm -f /etc/apt/sources.list.d/*

RUN echo "Verifying sources.list content:" && cat /etc/apt/sources.list

    
RUN \
    apt-get update \
    # Install dependencies
    && apt-get install -y --no-install-recommends \
        # basic environment
        curl nodejs libgmp-dev libmpfr-dev libmpc-dev \
        # For Security
        expat libldap-2.5-0 perl libsqlite3-0 zlib1g \
        # install a chinese font to support the use of tools like matplotlib
        fonts-noto-cjk \
        # install libmagic to support the use of python-magic guess MIMETYPE
        libmagic1 \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy Python environment and packages
ENV VIRTUAL_ENV=/app/api/.venv
COPY --from=packages ${VIRTUAL_ENV} ${VIRTUAL_ENV}
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

# Download nltk data
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"

# Copy source code
COPY ./api /app/api/

# Copy entrypoint
COPY api/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]
