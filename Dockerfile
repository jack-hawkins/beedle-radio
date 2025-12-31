FROM node:18-alpine

WORKDIR /usr/src/app

COPY ./app/package.json .
RUN npm install


COPY ./app .
COPY ./playlist /usr/src/playlist
COPY ./music /usr/src/music
EXPOSE 3000

CMD ["node", "server.js"]