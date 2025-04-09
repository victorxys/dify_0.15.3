FROM langgenius/dify-web:0.15.2

WORKDIR /app/web

# Create a non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Change ownership of the working directory
RUN chown -R appuser:appgroup /app/web

# Switch to the non-root user
USER appuser

RUN yarn install

COPY ../web .

# Override entrypoint to run dev server
ENTRYPOINT []
CMD ["yarn", "dev"]
