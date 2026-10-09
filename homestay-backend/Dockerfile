FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads/rooms uploads/qr
EXPOSE 4000
CMD ["node", "src/server.js"]
