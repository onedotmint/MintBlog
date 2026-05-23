FROM node:22-alpine AS build

WORKDIR /app

ARG PUBLIC_SITE_ORIGIN
ENV ASTRO_TELEMETRY_DISABLED=1
ENV PUBLIC_SITE_ORIGIN=${PUBLIC_SITE_ORIGIN}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
