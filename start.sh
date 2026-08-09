#!/bin/sh
echo "Starting deployment script..." > public/startup.log

echo "Running prisma db push..." >> public/startup.log
npx prisma db push --accept-data-loss >> public/startup.log 2>&1
if [ $? -ne 0 ]; then
  echo "Prisma db push failed!" >> public/startup.log
fi

echo "Running seed script..." >> public/startup.log
npx tsx prisma/seed.ts >> public/startup.log 2>&1
if [ $? -ne 0 ]; then
  echo "Seed script failed!" >> public/startup.log
fi

echo "Starting Next.js..." >> public/startup.log
HOSTNAME="0.0.0.0" npm run start >> public/startup.log 2>&1

echo "Next.js crashed with exit code $?. Serving logs on port 3000..." >> public/startup.log
npx serve -l tcp://0.0.0.0:3000 public
