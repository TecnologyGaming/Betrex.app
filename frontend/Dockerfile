# ----- Frontend Dockerfile (multi-stage) -----
# Stage 1: build the React app
FROM node:20-alpine AS build
WORKDIR /app

# Build-time env (passed via --build-arg)
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Install deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build
COPY . .
RUN yarn build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
