FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p data
EXPOSE 4000
CMD ["sh", "-c", "npm run seed && node src/server.js"]
