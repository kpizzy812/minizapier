#!/bin/sh

echo "Waiting for database to be ready..."

# Wait for PostgreSQL to be ready by attempting schema push
MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma db push; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Failed to connect to database after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Database not ready yet, retry $RETRY_COUNT/$MAX_RETRIES..."
  sleep 2
done

echo "Database schema applied successfully!"

# Start the API
echo "Starting API server..."
exec node dist/src/main.js
