# Build context is this BackEnd/ folder (e.g. `docker build -t abladux BackEnd`),
# not the repo root — BackEnd/public already contains the pre-built frontend,
# so this image needs nothing from ../FrontEnd.
FROM node:22-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npx playwright install --with-deps chromium
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
