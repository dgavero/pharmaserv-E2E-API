# Use official Playwright image (includes Node + browsers + deps)
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# Set working directory inside container
WORKDIR /app

# Copy only package files first (for caching dependencies)
COPY package*.json ./

# Install dependencies
RUN npm ci
COPY . .

# Default command (can be overridden)
CMD ["bash"]