ARG NODE_IMAGE=docker.io/library/node:20-alpine
ARG NGINX_IMAGE=docker.io/library/nginx:1.27-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM ${NGINX_IMAGE} AS runner
COPY infra/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

