FROM node:18-slim

# Instala FFmpeg
RUN apt-get update \
 && apt-get install -y ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências
COPY package.json ./
RUN npm install

# Copia o restante do código
COPY . .

EXPOSE 8080

# Inicia o servidor
CMD ["node", "index.js"]
