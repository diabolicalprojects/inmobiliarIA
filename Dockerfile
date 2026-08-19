FROM node:20-alpine

# Install OS dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy application files
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_URL=https://agentesia.diabolicalservices.tech
ENV NEXTAUTH_URL=https://agentesia.diabolicalservices.tech
ENV AUTH_TRUST_HOST=true
RUN pnpm run build

# Start configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV AUTH_URL=https://agentesia.diabolicalservices.tech
ENV NEXTAUTH_URL=https://agentesia.diabolicalservices.tech
ENV AUTH_TRUST_HOST=true
EXPOSE 3000

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Run migrations, seed, and start Next.js
CMD ["./start.sh"]
