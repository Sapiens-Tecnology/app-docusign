FROM node:20-slim

WORKDIR /src

COPY package*.json ./

RUN npm install

RUN apt update && apt install -y libreoffice

# RUN apk add --no-cache libreoffice

COPY . .

EXPOSE 8080

CMD ["npm", "start"]