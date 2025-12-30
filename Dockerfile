FROM node:18-alpine

WORKDIR /usr/src/app

COPY ./app/package.json .

RUN npm install
RUN apk add --no-cache ffmpeg

COPY . .
EXPOSE 3000

CMD ["node", "server.js"]