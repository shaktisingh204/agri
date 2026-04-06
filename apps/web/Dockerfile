FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install

COPY . .

RUN npm --workspace @agri/web run build

EXPOSE 3000

CMD ["npm", "--workspace", "@agri/web", "run", "start"]

