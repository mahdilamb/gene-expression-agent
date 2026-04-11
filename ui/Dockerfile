FROM node:22-alpine AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY vite.config.ts ./

EXPOSE 8501
CMD ["node_modules/.bin/vite", "preview", "--host"]
