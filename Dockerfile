FROM node:20-alpine

# Install OS dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy application files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Start configuration
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run migrations, seed, and start Next.js
CMD npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts && npm run start
