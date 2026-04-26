FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ARG REACT_APP_NOTIFICATION_POLL_MS=15000
ENV REACT_APP_NOTIFICATION_POLL_MS=$REACT_APP_NOTIFICATION_POLL_MS
ENV CI=false

RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
