FROM node:20-slim

LABEL maintainer="Retold <https://github.com/stevenvelozo/retold>"
LABEL description="Retold Todo List Example -- API Server, Web Client, CLI, and Console TUI"

WORKDIR /app

# Copy the shared data model
COPY model/ model/

# --- Server ---
COPY server/package.json server/package.json
COPY server/server.cjs server/server.cjs
COPY server/database-initialization-service.cjs server/database-initialization-service.cjs
RUN mkdir -p server/data
RUN cd server && npm install --omit=dev

# --- Web Client ---
COPY web-client/package.json web-client/package.json
COPY web-client/generate-build-config.cjs web-client/generate-build-config.cjs
COPY web-client/.gulpfile-quackage.js web-client/.gulpfile-quackage.js
COPY web-client/source/ web-client/source/
COPY web-client/html/ web-client/html/
COPY web-client/css/ web-client/css/
RUN cd web-client && npm install
RUN cd web-client && npm run build

# --- CLI Client ---
COPY cli-client/package.json cli-client/package.json
COPY cli-client/source/ cli-client/source/
RUN cd cli-client && npm install --omit=dev

# --- Console Client ---
COPY console-client/package.json console-client/package.json
COPY console-client/console-client.cjs console-client/console-client.cjs
COPY console-client/views/ console-client/views/
RUN cd console-client && npm install --omit=dev

# --- Help message shown on interactive login ---
COPY docker-motd.sh /etc/profile.d/motd.sh

EXPOSE 8086

# Default: start the API server (serves the web client too)
CMD ["node", "server/server.cjs"]
