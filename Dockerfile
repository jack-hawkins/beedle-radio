FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json .

RUN npm install
RUN apt install -y ffmpeg

COPY . .

COPY . /files

EXPOSE 3000

CMD ["node", "server.js"]