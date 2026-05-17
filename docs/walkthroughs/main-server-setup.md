# Main Server Setup

운영 기준 핵심:

- `main` 기준 코드 사용
- `docker compose --env-file .env.prod -f docker-compose.prod.yml pull`
- bootstrap nginx로 ACME challenge 대응
- certbot 발급 후 `prod.conf` 로 전환
- 실서비스는 443만 담당

서버에서 필요한 최소 흐름:

```bash
cp .env.prod.example .env.prod
vi .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
curl -i https://woonglab.com/api/health
```

현재 main image pull부터 preflight, Real Backend Test, evidence bundle, verifier까지 한 번에 수행할 때:

```bash
bash backend/reports/current-main-server-evidence-runbook-2026-05-11/server-current-main-preflight-load-evidence.sh
```

이 script는 checkout된 current `main` SHA와 pull된 GHCR digest를 evidence에 기록하고 즉시 verifier에 넘긴다.
특정 SHA/digest만 허용해야 할 때는 `EXPECTED_MAIN_SHA`, `EXPECTED_BACKEND_IMAGE_DIGEST`, `EXPECTED_FRONTEND_IMAGE_DIGEST`를 명시한다.
GHCR manifest 확인과 image pull은 임시 Docker config를 사용하므로, 서버에 남아 있는 오래된 GHCR credential 때문에 public image pull이 깨지는 문제를 피한다.

기동 후 production preflight:

```bash
BASE_URL=https://woonglab.com \
./scripts/prod-runtime-preflight.sh
```

Docker/SSH 없이 public origin만 먼저 확인할 때:

```bash
BASE_URL=https://woonglab.com \
WORK_READ_PATH=/api/public/works/<real-work-slug> \
STUDY_READ_PATH=/api/public/blogs/<real-study-slug> \
./scripts/prod-public-origin-preflight.sh
```

이 단계가 `iconUrl`, `contentJson`, `originalFileName`, `fileSize`, missing `X-Nginx-Request-Time` 등으로 실패하면 아직 최신 `main` runtime으로 볼 수 없으므로 Real Backend Test 결과를 해석하지 않는다.

실제 Work/Study read target을 지정한 Real Backend Test:

```bash
BASE_URL=https://woonglab.com \
WORK_READ_PATH=/api/public/works/<real-work-slug> \
STUDY_READ_PATH=/api/public/blogs/<real-study-slug> \
RATES="100 200 300 400" \
DURATION_SECONDS=30 \
MAX_VUS=500 \
PRE_ALLOCATED_VUS=100 \
./scripts/prod-real-load-steps.sh
```

preflight와 Real Backend Test 결과를 하나의 증거 묶음으로 만들 때:

```bash
PREFLIGHT_LOG=backend/reports/prod-runtime-preflight.log \
REAL_LOAD_DIR=backend/reports/prod-real-load-steps-<timestamp> \
MAIN_SHA="$(git rev-parse HEAD)" \
BACKEND_IMAGE_DIGEST=<pulled-backend-image-digest> \
FRONTEND_IMAGE_DIGEST=<pulled-frontend-image-digest> \
./scripts/prod-runtime-evidence-bundle.sh
```

반환받은 evidence 디렉터리나 `production-runtime-evidence.tar.gz`는 로컬에서 다시 검증한다:

```bash
EVIDENCE_DIR=backend/reports/production-runtime-evidence-<timestamp> \
EXPECTED_MAIN_SHA=<expected-main-sha> \
EXPECTED_BACKEND_IMAGE_DIGEST=<expected-backend-image-digest> \
EXPECTED_FRONTEND_IMAGE_DIGEST=<expected-frontend-image-digest> \
./scripts/prod-runtime-evidence-verify.sh
```

verifier가 실패하면 해당 Real Backend Test 결과로 다음 성능 slice를 고르지 않는다.

Real Backend Test 조건:

- list target은 `/api/public/works?page=1&pageSize=12`, `/api/public/blogs?page=1&pageSize=12`로 고정한다.
- `WORK_READ_PATH`, `STUDY_READ_PATH`는 실제 public detail API 경로를 넣는다.
- `seed`, `seeded`, `fixture` 경로는 script가 실패 처리한다.
- cache shortcut은 사용하지 않는다. k6 script가 요청마다 `__k6Vu`, `__k6Iter`를 붙여 동일 URL cache 착시를 피한다.

`main` runtime image 값은 `.env.prod.example`에 이미 실제 GHCR 경로로 들어 있다.
서버에서는 비밀값과 서버별 경로만 채우면 된다.

필수 확인 값:

```text
FRONTEND_IMAGE=ghcr.io/kimwoonggon/woong-blog-java-springboot-nextjs-runtime-frontend:main
BACKEND_IMAGE=ghcr.io/kimwoonggon/woong-blog-java-springboot-nextjs-runtime-backend:main
NEXT_PUBLIC_SITE_URL=https://woonglab.com
LoadTesting__BaseUrl=https://woonglab.com
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio
POSTGRES_PASSWORD=<server-secret>
APP_AUTH_ENABLED=true
APP_AUTH_ADMIN_EMAILS=<admin-email>
APP_AUTH_COOKIE_NAME=portfolio_auth
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=<google-client-id>
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=<google-client-secret>
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_SCOPE=openid,profile,email
```

권장 bind mount:

```text
POSTGRES_DATA_DIR=/srv/woong-blog/postgres
MEDIA_DATA_DIR=/srv/woong-blog/media
DATA_PROTECTION_DIR=/srv/woong-blog/data-protection
```
