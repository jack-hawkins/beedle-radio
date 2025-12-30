FROM node:18-alpine

WORKDIR /usr/src/app/app

RUN apk add --no-cache ffmpeg

COPY ./app/package.json .

RUN npm install

WORKDIR /usr/src/app
COPY . .

EXPOSE 3000

#COPY copyscript.sh /copyscript.sh
#RUN chmod +x /copyscript.sh

#ENTRYPOINT ["/copyscript.sh"]
CMD ["node", "app/server.js"]