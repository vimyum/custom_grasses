FROM node:14-slim
WORKDIR /usr/src/app
COPY tsconfig.json package*.json ./
COPY src src

RUN ls
RUN ls src
RUN npm install
RUN npx tsc -p ./

EXPOSE 8080
CMD [ "node", "index.js" ]
