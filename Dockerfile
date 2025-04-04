FROM node:20-slim

WORKDIR /src

COPY package*.json ./

RUN npm install

RUN apt update && apt install -y libreoffice

COPY . .

EXPOSE 8080

CMD ["npm", "start"]