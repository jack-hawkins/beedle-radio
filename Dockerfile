FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json .

RUN npm install
RUN apk add --no-cache ffmpeg

COPY . .

COPY . /app

EXPOSE 3000

RUN sh ./copyscript.sh
CMD ["node", "/app/server.js"]