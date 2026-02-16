FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=https://localhost:8443/api
ARG VITE_SOCKET_URL=https://localhost:8443

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_USE_MOCK_API=false

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production image – serve static files via NGINX
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
