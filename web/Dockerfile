# base image
FROM node:20-alpine3.20 AS base
LABEL maintainer="takatost@gmail.com"

# if you located in China, you can use aliyun mirror to speed up
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

RUN apk add --no-cache tzdata


# install packages
FROM base AS packages

WORKDIR /app/web

COPY package.json .
COPY yarn.lock .

RUN corepack enable

# if you located in China, you can use taobao registry to speed up
# RUN yarn install --frozen-lockfile --registry https://registry.npmmirror.com/

# RUN pnpm install --frozen-lockfile --registry https://registry.npmmirror.com/
RUN pnpm install --registry https://registry.npmmirror.com/

# COPY .env .env

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

COPY docker/pm2.json ./pm2.json
COPY docker/entrypoint.sh ./entrypoint.sh


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

