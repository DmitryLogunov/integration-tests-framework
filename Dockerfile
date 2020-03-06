FROM cgdlp.azurecr.io/base-images/node-kafka

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

RUN apk --no-cache add ca-certificates wget
RUN wget --quiet --output-document=/etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub
RUN mkdir ~/distrs && mkdir ~/distrs/kafkacat
RUN (cd ~/distrs/kafkacat &&  wget https://github.com/sgerrand/alpine-pkg-kafkacat/releases/download/1.3.1-r0/kafkacat-1.3.1-r0.apk)
RUN apk update && apk add --no-cache ~/distrs/kafkacat/kafkacat-1.3.1-r0.apk

CMD ["node", "./server.js"]
