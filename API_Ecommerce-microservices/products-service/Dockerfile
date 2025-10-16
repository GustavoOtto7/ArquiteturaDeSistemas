FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client based on schema
RUN npx prisma generate

EXPOSE 3001

# Wait for database, apply migrations, seed, then start
CMD ["sh", "-c", "echo 'Waiting for database...' && sleep 10 && echo 'Applying database schema...' && npx prisma db push && echo 'Seeding database...' && npm run prisma:seed && echo 'Starting server...' && npm start"]