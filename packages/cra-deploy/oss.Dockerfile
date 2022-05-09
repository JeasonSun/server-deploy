FROM node:14-alpine as builder

ARG ACCESS_KEY_ID
ARG ACCESS_KEY_SECRET
ARG OSS_BUCKET

WORKDIR /code

ADD package.json yarn.lock /code/
RUN yarn

ADD . /code
RUN npm run build && npm run oss:qiniu

FROM nginx:alpine
ADD nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder code/build /usr/share/nginx/html
