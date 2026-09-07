---
title: Shipping this site with GitHub Actions, Docker Hub and one EC2 box
date: 2025-03-30
summary: The pipeline behind this portfolio — a multi-stage build that ends in nginx, an image pushed on every merge, and a deploy step that is really just a pull and a restart.
tags: ["GitHub Actions", "Docker", "Nginx"]
accent: yellow
---

This site is static. It could live on object storage behind a CDN and cost
nothing to run. I put it in a container on an EC2 instance instead, because I
wanted the deployment path itself to be something I had built rather than
something a platform did for me.

The whole pipeline is three moving parts: a Dockerfile that produces an image,
a workflow that builds and pushes it, and a box that pulls and restarts.

## The image ends in nginx, not Node

The version of this site that ran before shipped a mistake worth describing: its
Dockerfile ran the framework's development server as the production process. It
worked. It also meant the container carried a full Node toolchain, rebuilt
pages on the fly, and served everything through a server explicitly documented
as not for production.

A multi-stage build fixes that. The Node stage exists only long enough to
produce a directory of files:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

Copying `package*.json` and installing before copying the source is the one
ordering decision that matters. Dependencies change rarely and source changes
constantly, so keeping them in separate layers means an ordinary content commit
reuses the cached `npm ci` instead of re-running it.

The runtime stage has no Node, no `node_modules`, and no build tooling. It is
nginx and a directory of HTML.

## nginx configuration worth having

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;

  gzip on;
  gzip_types text/css application/javascript image/svg+xml application/rss+xml;

  # Hashed asset filenames — safe to cache for a year.
  location /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # HTML must revalidate, or a deploy is invisible to anyone with a warm cache.
  location / {
    try_files $uri $uri/ $uri.html =404;
    add_header Cache-Control "public, max-age=0, must-revalidate";
  }

  error_page 404 /404.html;
}
```

The two cache headers are doing the real work. Build tooling fingerprints asset
filenames, so those files can be cached effectively forever — a new build
produces new names. HTML keeps the same URL across deploys, so it has to
revalidate, otherwise visitors keep the previous version until their cache
expires on its own.

## The workflow

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            thesharqx/portfolio:latest
            thesharqx/portfolio:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /home/${{ secrets.USERNAME }}/portfolio
            docker compose pull
            docker compose up -d
            docker image prune -af
```

`cache-from` and `cache-to` with the GitHub Actions cache backend are the
difference between a ninety-second build and a fifteen-second one, because layer
caching does not otherwise survive between runs on ephemeral runners.

The deploy step is deliberately dull. It does not build anything, copy any
files, or run any migrations. It pulls an image that has already been built and
tested, and restarts. If the pull fails, the running container is untouched.

## What this does not do

Two honest gaps.

**There is a gap in availability.** `docker compose up -d` stops the old
container before the new one is listening. For a personal site measured in
seconds, that is fine. For anything with users, the shape you want is a second
container coming up healthy before the first goes away — which means either a
load balancer in front or a proxy that can drain connections.

**Rollback depends on discipline, not tooling.** Every image is tagged twice —
`latest`, which the host pulls, and the commit SHA, which nothing pulls
automatically. That makes recovery a one-liner:

```bash
IMAGE_TAG=<commit-sha> docker compose up -d
```

But the host will silently go back to `latest` on the next deploy, so a pinned
rollback is a temporary state someone has to remember to resolve. A real fix
would make the deployed tag explicit on the host rather than implied.

## Why bother

The deploy is a pull and a restart. Nothing about it is clever, and that is
mostly the point: the interesting decisions all moved earlier, into the
Dockerfile and the cache headers, where they get reviewed like anything else in
the repository.
