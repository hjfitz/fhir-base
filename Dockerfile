FROM node:11

WORKDIR /usr/src/app

# move source
COPY . .

# setup program
RUN yarn
RUN yarn build:dev

# let the application commnuicate with the outside world!

EXPOSE 5000