FROM node:alpine

RUN apk add --update --no-cache bash make gcc g++ python git && \
  rm -rf /tmp/* /var/cache/apk/*

ENV HOME=/home/user

RUN mkdir -p $HOME/app

RUN adduser -D user

RUN chown -R user:user $HOME

USER user

WORKDIR $HOME/app/

USER user
