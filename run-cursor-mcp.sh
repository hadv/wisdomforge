#!/bin/zsh
cd /Users/hadv/vito-mcp
source ~/.zshrc
nvm use --lts

# Let the app load environment variables from .env file
# No need to export variables here as dotenv will handle that
node dist/index.js 