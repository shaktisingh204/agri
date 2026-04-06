FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json

RUN npm install

COPY . .

RUN npm --workspace @agri/api run build

EXPOSE 4000

CMD ["npm", "--workspace", "@agri/api", "run", "start:dev"]

