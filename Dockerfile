# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application code into the container
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port 3001
EXPOSE 3001

# Define the command to run your application
CMD [ "node", "dist/app.js" ]
