FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and add nodemon for development
RUN apk --no-cache add wget curl && npm install && npm install -g nodemon

# Copy source code
COPY . .

# For development we don't need to build since we're using ts-node
# RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Use nodemon for development to enable hot reloading
CMD ["nodemon", "--watch", ".", "--ext", "ts", "--exec", "ts-node", "app.ts"]
