FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace/backend

COPY backend/pom.xml ./
COPY backend/.mvn ./.mvn
COPY backend/mvnw ./mvnw
RUN chmod +x ./mvnw && ./mvnw -B dependency:go-offline

COPY backend/src ./src
RUN ./mvnw -B package -DskipTests

FROM eclipse-temurin:21-jre-jammy AS runtime

ENV CODEX_HOME=/root/.codex

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && curl -fsSL https://dl.k6.io/key.gpg | gpg --dearmor -o /etc/apt/keyrings/k6-archive-keyring.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" > /etc/apt/sources.list.d/k6.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
      ffmpeg \
      k6 \
      nodejs \
    && npm install -g @openai/codex \
    && npm cache clean --force \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /workspace/backend/target/*.jar /app/backend.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/backend.jar"]
