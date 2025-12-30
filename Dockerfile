FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json .

RUN npm install
RUN apk add --no-cache ffmpeg

COPY . .

COPY . /app

EXPOSE 3000

#CMD ["node", "server.js"]
RUN sh ./copyscript.sh