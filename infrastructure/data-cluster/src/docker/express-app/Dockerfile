FROM library/node:20
# Create app directory
WORKDIR /usr/src/express-app

# Install app and global dependencies
COPY package.json yarn.lock ./
RUN yarn install
RUN yarn global add ts-node

# Bundle app source
COPY . .

# Build the TypeScript code
RUN yarn build

# Expose the port
EXPOSE 4000

# Run the app
CMD [ "yarn", "prod" ]
