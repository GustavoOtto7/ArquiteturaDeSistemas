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

# Wait for database, generate initial migration, deploy, seed, then start
CMD ["sh", "-c", "echo 'Waiting for database...' && sleep 10 && echo 'Generating initial migration...' && npx prisma migrate dev --name init --create-only && echo 'Applying migrations...' && npx prisma migrate deploy && echo 'Seeding database...' && npx prisma db seed && echo 'Starting server...' && npm start"]