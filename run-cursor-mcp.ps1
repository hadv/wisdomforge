# Change to the project directory
cd "C:\Users\ASUS\vito-mcp"

# Ensure dependencies are installed
Write-Host "Checking for required dependencies..."
npm install

# Build the project with Windows-specific command
Write-Host "Building project with Windows build script..."
npm run build:windows

# Run the server
Write-Host "Starting MCP server..."
node -r ./dist/register.js dist/src/index.js 