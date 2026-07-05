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
# Public (browser-exposed) vars only — both are inlined into the client bundle at
# build time. Server-only vars (IDENTITY_SERVICE_URL, API_GATEWAY_URL, SESSION_SECRET,
# SESSION_COOKIE_NAME) are read at request time via process.env and must be supplied
# when the prod container is *run*, not at build time.
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# next.config.ts sets output:"standalone", so the build produces a self-contained
# .next/standalone/server.js — the BFF's Route Handlers, proxy.ts, and iron-session
# sessions all need a live Node.js process, which a static-file server (e.g. nginx)
# can't provide.
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
