#!/bin/bash

# Deploy WebSocket API to AWS
echo "🚀 Deploying Karteando WebSocket API..."

# Install SAM CLI if not installed
if ! command -v sam &> /dev/null; then
    echo "Installing AWS SAM CLI..."
    pip install aws-sam-cli
fi

# Build the application
sam build

# Deploy (first time will prompt for configuration)
sam deploy --guided

echo "✅ Deployment complete!"
echo "🔗 Save the WebSocket URL from the output above"