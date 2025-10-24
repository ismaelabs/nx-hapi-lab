FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN npx nx build api-products --prod

FROM node:20-alpine
WORKDIR /app
LABEL maintainer="Ismael Alves <cearaismael1997@gmail.com>"
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/apps/api-products/dist ./

RUN addgroup -S app && adduser -S -G app app 

USER app

EXPOSE 3000

CMD ["node", "main.js"]