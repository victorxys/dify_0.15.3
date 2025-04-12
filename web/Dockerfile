# base image
FROM node:20-alpine3.20 AS base
LABEL maintainer="takatost@gmail.com"

# --- BEGIN: Modify Alpine apk Source to Tsinghua ---
# Backup original repositories file and overwrite with Tsinghua mirror
RUN cp /etc/apk/repositories /etc/apk/repositories.bak && \
    echo "http://mirrors.tuna.tsinghua.edu.cn/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/main" > /etc/apk/repositories && \
    echo "http://mirrors.tuna.tsinghua.edu.cn/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/community" >> /etc/apk/repositories
# --- END: Modify Alpine apk Source ---

# Update apk cache and install tzdata using the new mirror
RUN apk update && apk add --no-cache tzdata


# install packages
FROM base AS packages

WORKDIR /app/web

# --- 修正 ---
# 从构建上下文的 web/ 子目录复制
COPY web/package.json .
COPY web/yarn.lock .


RUN corepack enable

# if you located in China, you can use taobao registry to speed up
# RUN yarn install --frozen-lockfile --registry https://registry.npmmirror.com/

# RUN pnpm install --frozen-lockfile --registry https://registry.npmmirror.com/
RUN pnpm install --registry https://registry.npmmirror.com/

# COPY .env .env



# --- 添加验证步骤 ---
RUN echo "--- Current directory: $(pwd) ---" && \
    echo "--- Listing contents of /app/web: ---" && \
    ls -la /app/web/ && \
    echo "--- Checking if /app/web/node_modules exists and is a directory: ---" && \
    if [ -d "/app/web/node_modules" ]; then \
      echo "/app/web/node_modules found. Listing partial contents:"; \
      ls -A /app/web/node_modules | head -n 10; \
    else \
      echo "/app/web/node_modules NOT found or is not a directory!"; \
      exit 1; \
    fi
# --- 验证结束 ---
# --- Optional: Reset registry if needed, though usually not necessary in build ---
# RUN yarn config delete registry

# build resources
FROM base AS builder
WORKDIR /app/web

COPY --from=packages /app/web/ .
COPY . .
RUN corepack enable
# RUN yarn build
RUN pnpm run build


# production stage
FROM base AS production

ENV NODE_ENV=production
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://127.0.0.1:5001
ENV APP_API_URL=http://127.0.0.1:5001
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1


# 定义 pnpm 全局安装路径
ENV PNPM_HOME="/pnpm" 
# 将该路径添加到系统 PATH
ENV PATH="${PNPM_HOME}:${PATH}" 

# 设置时区为 Asia/Shanghai (UTC+8)
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create the non-root user and set permissions
ARG USER_ID=1001
ARG GROUP_ID=1001
RUN addgroup -g ${GROUP_ID} vscode && \
    adduser -u ${USER_ID} -G vscode -s /bin/sh -D vscode
ENV USER=vscode



WORKDIR /app/web
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static

# --- 修正 ---
# 从构建上下文的 web/docker/ 子目录复制
COPY web/docker/pm2.json ./pm2.json
COPY web/docker/entrypoint.sh ./entrypoint.sh
# --- 修正结束 ---

# global runtime packages

# RUN yarn global add pm2 \
#     && yarn cache clean \
#     && mkdir /.pm2 \
#     && chown -R 1001:0 /.pm2 /app/web \
#     && chmod -R g=u /.pm2 /app/web



 RUN corepack enable && pnpm add -g pm2 \
    && pnpm cache clean \
    && mkdir -p /.pm2 \
    && chown -R ${USER}:${USER} /.pm2 /app/web ${PNPM_HOME}



ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

USER ${USER_ID}
EXPOSE 3000

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]

