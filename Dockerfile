FROM node:18-alpine

# Установка Expo CLI глобально
RUN npm install -g expo-cli

WORKDIR /usr/src/app

# Установка зависимостей
COPY package*.json ./
RUN npm ci

# Копирование проекта
COPY . .

# Проброс портов
EXPOSE 8081 19000 19001 19002 19006

# Команда запуска с хостом 0.0.0.0
CMD ["npx", "expo", "start", "--host", "localhost", "--port", "8081"]