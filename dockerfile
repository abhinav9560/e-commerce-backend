
# FROM node:18-alpine

# # Set working directory
# WORKDIR /app

# # Install nodemon globally for auto-restart
# RUN npm install -g nodemon

# # Copy package files
# COPY package*.json ./

# # Install all dependencies (including dev dependencies)
# RUN npm install

# # Copy source code
# COPY . .

# # Expose port 5000
# EXPOSE 5000

# # Start with nodemon for hot reloading
# CMD ["npm", "run", "dev"]

FROM node:18-alpine
WORKDIR /app
RUN npm install -g nodemon
COPY package*.json ./
# Use legacy peer deps to resolve conflicts
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]