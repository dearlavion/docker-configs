#!/bin/bash

# Fetch the current public HTTPS ngrok URL
NGROK_URL=$(curl --silent http://localhost:4040/api/tunnels | \
  jq -r '.tunnels[] | select(.proto=="https") | .public_url')

if [ -z "$NGROK_URL" ]; then
  echo "❌ Could not get ngrok URL. Is ngrok running with API at localhost:4040?"
  exit 1
fi

echo "✅ Current ngrok URL: $NGROK_URL"

# Update .env file or Docker environment variable file
# Assuming you have a .env file with a line starting with NGROK=

if grep -q "^NGROK=" .env; then
  # Replace existing NGROK line
  sed -i.bak "s|^NGROK=.*|NGROK=$NGROK_URL|" .env
else
  # Append NGROK variable
  echo "NGROK=$NGROK_URL" >> .env
fi

echo "✅ Updated .env file with new NGROK URL"

# Restart Docker containers via docker-compose to pick up new env
docker-compose -f /full/path/to/docker-compose.yml down
docker-compose -f /full/path/to/docker-compose.yml up -d --build

echo "✅ Docker containers restarted"
