# Change to the project directory
cd "C:\Users\ASUS\vito-mcp"

# Ensure dependencies are installed
Write-Host "Checking for required dependencies..."
npm install

# Build the project with Windows-specific command
Write-Host "Building project with Windows build script..."
npm run build:windows

# Load environment variables from .env file
Write-Host "Loading environment variables from .env file..."
Get-Content .env | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
        Write-Host "Set environment variable: $key"
    }
}

# Run the server
Write-Host "Starting MCP server..."
node -r ./dist/register.js dist/src/index.js 