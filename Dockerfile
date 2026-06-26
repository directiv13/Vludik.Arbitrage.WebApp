FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS builder
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
