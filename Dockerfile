FROM node:18-alpine

WORKDIR /usr/src/app

COPY ./app/package.json ./app

RUN npm install
RUN apk add --no-cache ffmpeg

COPY . .

EXPOSE 3000

#COPY copyscript.sh /copyscript.sh
#RUN chmod +x /copyscript.sh

#ENTRYPOINT ["/copyscript.sh"]
CMD ["node", "app/server.js"]