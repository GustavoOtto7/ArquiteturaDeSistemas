FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
COPY rabbitmq-client.js .
COPY notificationHandler.js .
EXPOSE 3005
CMD ["node", "server.js"]
