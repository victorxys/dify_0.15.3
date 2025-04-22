FROM node:20-alpine3.20 AS base
LABEL maintainer="takatost@gmail.com"
RUN apk add --no-cache tzdata

FROM base AS packages
WORKDIR /app/web
COPY package.json .
COPY pnpm-lock.yaml .
RUN corepack enable
RUN pnpm install --frozen-lockfile --registry https://registry.npmmirror.com/

FROM base AS builder
WORKDIR /app/web
COPY --from=packages /app/web/package.json /app/web/pnpm-lock.yaml ./
COPY --from=packages /app/web/node_modules ./node_modules
COPY . ./
RUN corepack enable
RUN pnpm run build

FROM base AS production
ENV NODE_ENV=production
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://api:5001
ENV APP_API_URL=http://api:5001
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
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
RUN chmod +x ./entrypoint.sh
RUN corepack enable && pnpm add -g pm2 \
    && pnpm cache clean \
    && mkdir -p /.pm2 \
    && chown -R ${USER}:${USER} /.pm2 /app/web ${PNPM_HOME}
ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}
USER ${USER_ID}
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]