# Use Node v24 for the development environment
FROM node:24-alpine

# Set the working directory to the 'client' directory, as requested
WORKDIR /app/client

# 1. Copy package.json and install dependencies
# This is done first to leverage Docker layer caching
COPY client/package*.json ./
RUN npm install

# 2. Copy the entire client source code
COPY client/ ./

# Expose the standard React development port (often 3000)
# NOTE: Cloud Run expects the application to listen on the port specified by the PORT environment variable.
EXPOSE 3000

# ... other Dockerfile lines ...
CMD ["npm", "run", "dev", "--", "--port", "3000", "--host", "0.0.0.0"]
