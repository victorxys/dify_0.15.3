# base image
FROM node:20-alpine3.20 AS base
LABEL maintainer="takatost@gmail.com"

# --- BEGIN: Modify Alpine apk Source to Tsinghua ---
RUN cp /etc/apk/repositories /etc/apk/repositories.bak && \
    echo "http://mirrors.tuna.tsinghua.edu.cn/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/main" > /etc/apk/repositories && \
    echo "http://mirrors.tuna.tsinghua.edu.cn/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/community" >> /etc/apk/repositories
# --- END: Modify Alpine apk Source ---

RUN apk update && apk add --no-cache tzdata


# install packages stage
FROM base AS packages

WORKDIR /app/web

# 启用 corepack 来管理 pnpm
RUN corepack enable

# 复制依赖定义文件
# --- 修正: 假设你使用 pnpm，复制 pnpm-lock.yaml (如果存在) ---
COPY web/package.json .
# 如果你使用 pnpm lockfile, 取消下面一行的注释并注释掉 yarn.lock
COPY web/pnpm-lock.yaml .
# COPY web/yarn.lock . # 如果用 pnpm，注释掉这行

# 使用淘宝镜像安装依赖
# --frozen-lockfile 确保使用 lock 文件版本，如果 lock 文件存在且最新
RUN pnpm install --frozen-lockfile --registry https://registry.npmmirror.com/ || \
    (echo "Frozen lockfile failed, attempting install without frozen lockfile..." && \
     pnpm install --registry https://registry.npmmirror.com/) # 如果 frozen 失败，尝试普通 install

# --- 添加验证 node_modules 步骤 ---
RUN echo "--- Checking if /app/web/node_modules exists after pnpm install ---" && \
    if [ -d "/app/web/node_modules" ]; then \
      echo "/app/web/node_modules found."; \
    else \
      echo "/app/web/node_modules NOT found!"; \
      exit 1; \
    fi
# --- 验证结束 ---


# build resources stage
FROM base AS builder

WORKDIR /app/web

# 启用 corepack
RUN corepack enable

# 从 packages 阶段复制 node_modules 和 package.json
COPY --from=packages /app/web/node_modules ./node_modules
COPY --from=packages /app/web/package.json ./package.json
# 如果需要 lock 文件进行构建 (通常不需要，但以防万一)
# COPY --from=packages /app/web/pnpm-lock.yaml ./pnpm-lock.yaml

# --- 修正: 只复制 web 目录的源代码 ---
COPY web/ ./

# --- 添加验证源代码步骤 ---
RUN echo "--- Listing contents of /app/web before build ---" && \
    ls -la /app/web/ && \
    if [ -d "/app/web/app" ]; then \
       echo "/app/web/app directory found."; \
    elif [ -d "/app/web/pages" ]; then \
       echo "/app/web/pages directory found."; \
    else \
       echo "Neither /app/web/app nor /app/web/pages directory found!"; \
       exit 1; \
    fi
# --- 验证结束 ---

# 使用淘宝镜像运行构建
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm run build

# production stage
FROM base AS production

# 设置非 root 用户
ARG USER_ID=1001
ARG GROUP_ID=1001
RUN addgroup -g ${GROUP_ID} vscode && \
    adduser -u ${USER_ID} -G vscode -s /bin/sh -D vscode

# 设置必要的环境变量
ENV NODE_ENV=production
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=${CONSOLE_API_URL:-http://127.0.0.1:5001} 
ENV APP_API_URL=${APP_API_URL:-http://127.0.0.1:5001}       
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV USER=vscode 
ENV TZ=Asia/Shanghai

# 设置 pnpm 全局路径并添加到 PATH (在切换用户前完成)
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN mkdir -p ${PNPM_HOME} && chown -R ${USER_ID}:${GROUP_ID} ${PNPM_HOME}

# 安装必要的运行时系统包和设置时区 (切换用户前)
RUN apk update && apk add --no-cache tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app/web

# 从 builder 阶段复制构建产物
COPY --from=builder --chown=${USER_ID}:${GROUP_ID} /app/web/public ./public
COPY --from=builder --chown=${USER_ID}:${GROUP_ID} /app/web/.next/standalone ./
COPY --from=builder --chown=${USER_ID}:${GROUP_ID} /app/web/.next/static ./.next/static

# 从构建上下文复制 pm2 和入口脚本
COPY --chown=${USER_ID}:${GROUP_ID} web/docker/pm2.json ./pm2.json
COPY --chown=${USER_ID}:${GROUP_ID} web/docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# 全局安装 pm2 (需要 root 权限，或者调整 PNPM_HOME 权限)
# 切换回 root 安装全局包，然后再切回 vscode 用户可能更简单
USER root
RUN corepack enable && \
    pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm add -g pm2 && \
    pnpm cache clean && \
    mkdir -p /.pm2

# 确保运行时目录权限正确
RUN chown -R ${USER_ID}:${GROUP_ID} /app/web /.pm2

# 切换到非 root 用户运行
USER ${USER_ID}

# 暴露端口
EXPOSE 3000

# 设置 Commit SHA (如果需要)
ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

# 启动命令
ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]