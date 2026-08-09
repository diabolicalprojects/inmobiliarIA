FROM node:20-alpine

# Install OS dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package and prisma schema first!
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install dependencies (this will run postinstall successfully!)
RUN npm ci

# Copy application files
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Start configuration
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Run migrations, seed, and start Next.js
CMD ["./start.sh"]
