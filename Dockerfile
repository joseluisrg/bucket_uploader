FROM node:10

RUN mkdir -p /usr/src/bucket_uploader
WORKDIR /usr/src/bucket_uploader

COPY package.json .
RUN npm install --production
COPY . /usr/src/bucket_uploader

ENV NODE_ENV production
ENV PORT 3000
EXPOSE 3000

CMD [ "npm", "start" ] 