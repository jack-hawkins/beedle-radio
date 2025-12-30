FROM node:18-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg
RUN which ffmpeg && ffmpeg -version
COPY ./app/package.json .
RUN npm install


COPY ./app .
EXPOSE 3000

CMD ["node", "server.js"]