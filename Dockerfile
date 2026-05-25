FROM node:24-alpine AS build

WORKDIR /app

ARG PUBLIC_SITE_ORIGIN
ARG PRIVATE_CONTENT_STRICT=0
ENV ASTRO_TELEMETRY_DISABLED=1
ENV PUBLIC_SITE_ORIGIN=${PUBLIC_SITE_ORIGIN}
ENV PRIVATE_CONTENT_STRICT=${PRIVATE_CONTENT_STRICT}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN if [ "$PRIVATE_CONTENT_STRICT" = "1" ]; then npm run build:deploy; else npm run build; fi

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
