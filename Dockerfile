# --- build ----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies change rarely, source changes constantly. Installing before
# copying the source keeps `npm ci` in a cached layer across content commits.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime --------------------------------------------------------
# No Node, no node_modules, no build tooling. Nginx and a directory of files.
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
