FROM node:18-bullseye

# Install build tools for node-gyp
RUN apt-get update && apt-get install -y python3 make g++

WORKDIR /app

COPY package* ./

# Install npm@latest (optional)
RUN npm install -g npm@latest

RUN npm install -g node-gyp

# Install project dependencies
RUN npm install

# Rebuild native modules (including node-pty)
RUN npm rebuild node-pty

COPY . ./
RUN npm run build

# Expose port
EXPOSE 3002

# Start the app
CMD ["npm", "run", "start"]
