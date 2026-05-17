# Backend Testing

The backend is a Spring Boot 3 application built with Java 21 and the Maven wrapper. Run commands from the repository root unless noted.

## Maven Wrapper Commands

Run the full backend test suite:

```bash
./backend/mvnw -f backend/pom.xml test
```

Run verification, including integration-test phases when plugins are configured:

```bash
./backend/mvnw -f backend/pom.xml verify
```

Run tagged JUnit suites:

```bash
./backend/mvnw -f backend/pom.xml test -Dgroups=unit
./backend/mvnw -f backend/pom.xml test -Dgroups=component
./backend/mvnw -f backend/pom.xml verify -Dgroups=integration
```

The repository helper scripts wrap these commands:

```bash
./scripts/run-backend-tests.sh
./scripts/run-unit-tests.sh
./scripts/run-component-tests.sh
./scripts/run-integration-tests.sh
./scripts/run-architecture-tests.sh
```

## Testcontainers

Integration tests should use Spring Boot Testcontainers support and JUnit 5. Ensure Docker is running before executing tests that rely on containers:

```bash
docker ps
./backend/mvnw -f backend/pom.xml verify -Dgroups=integration
```

Use environment variables for secrets and connection settings. Do not add credentials to `application.properties`, `application.yml`, test resources, or scripts.

## Docker Runtime Checks

Build the backend image:

```bash
docker build -f backend/Dockerfile -t woong-blog-springboot-backend:local .
```

Validate the development compose configuration:

```bash
docker compose -f docker-compose.dev.yml config
```

Start the supported development stack:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Check backend health through the Spring Boot actuator endpoint when the application exposes it:

```bash
curl -fsS http://127.0.0.1:8080/api/health
```

Production-like compose files should keep secure-cookie and HTTPS-related flags enabled through environment variables, while development compose may disable them for local HTTP testing.
