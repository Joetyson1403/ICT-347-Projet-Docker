# Étape 1 : Build (Installation des dépendances)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# Étape 2 : Production (Image finale réduite et sécurisée)
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package.json server.js ./

# Sécurité : exécution avec un utilisateur non-root
USER node
EXPOSE 3000
CMD ["node", "server.js"]