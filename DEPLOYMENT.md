# Production Deployment

이 프로젝트의 운영 배포는 `main`에서 GHCR로 올라간 이미지를 서버에서 pull해서 실행하는 방식이다. 서버에서는 source build를 하지 않는다.

## 1. 서버 준비

1. 운영 서버에 `main` runtime-only 트리를 checkout 한다.
2. `docker`, `docker compose`를 설치한다.
3. 운영 env 파일을 준비한다.

```bash
cp .env.prod.example .env.prod
```

4. `.env.prod`에서 다음을 실제 값으로 수정한다.
   - `FRONTEND_IMAGE`
   - `BACKEND_IMAGE`
   - `POSTGRES_PASSWORD`
   - `Auth__ClientId`
   - `Auth__ClientSecret`
   - `Auth__PublicOrigin`
   - `Auth__AdminEmails__0`
   - `CODEX_HOME_DIR` if backend Codex AI Fix should be enabled

## 2. GHCR 로그인

서버에서 GHCR pull 권한이 있는 토큰으로 로그인한다.

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

필요 권한:
- `read:packages`

## 3. 최초 로컬 bootstrap 기동

인증서가 아직 없을 때는 localhost 전용 bootstrap nginx로 먼저 올린다.
이 단계는 앱과 DB가 정상으로 뜨는지 로컬에서 확인하기 위한 단계다.
외부 공개 전에는 `NGINX_BIND_HOST=127.0.0.1`을 유지한다.

```bash
mkdir -p certbot/www certbot/conf/live/current
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db backend frontend nginx
```

기본값으로 `NGINX_DEFAULT_CONF=./nginx/prod-bootstrap.conf` 이므로 로컬에서 앱과 `/api/health`를 확인할 수 있다.
이 설정은 앱 프록시를 포함하므로 `NGINX_BIND_HOST=0.0.0.0`과 함께 사용하지 않는다.

## 4. Let’s Encrypt 인증서 발급

아래 예시는 단일 대표 도메인을 기준으로 한다.
인증서 발급 중에는 외부에 ACME challenge 경로만 열기 위해 nginx 설정을 `prod-acme-only.conf`로 바꾼다.

```bash
sed -i 's#^NGINX_BIND_HOST=.*#NGINX_BIND_HOST=0.0.0.0#' .env.prod
sed -i 's#^NGINX_DEFAULT_CONF=.*#NGINX_DEFAULT_CONF=./nginx/prod-acme-only.conf#' .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d nginx
```

이 상태에서는 `/.well-known/acme-challenge/*`만 응답하고 `/`, `/blog`, `/works`, `/api/*` 같은 앱 경로는 닫힌다.

```bash
docker run --rm \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d your-domain.com \
  --email you@example.com \
  --agree-tos \
  --no-eff-email
```

발급 뒤 nginx가 고정 경로를 보도록 symlink를 만든다.

```bash
mkdir -p certbot/conf/live/current
ln -sfn ../your-domain.com/fullchain.pem certbot/conf/live/current/fullchain.pem
ln -sfn ../your-domain.com/privkey.pem certbot/conf/live/current/privkey.pem
```

그 다음 `.env.prod`의 nginx config를 운영 SSL 설정으로 바꾼다.

```bash
sed -i 's#^NGINX_DEFAULT_CONF=.*#NGINX_DEFAULT_CONF=./nginx/prod.conf#' .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d nginx
```

## 5. 일반 배포

이후 운영 배포는 image pull만 수행한다.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

## 6. 인증서 갱신

갱신은 webroot 방식으로 수행한다.

```bash
docker run --rm \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  certbot/certbot renew \
  --webroot \
  -w /var/www/certbot
```

symlink는 `current -> your-domain.com` 구조를 유지하므로 갱신 후 그대로 유효하다. 갱신 뒤에는 nginx를 reload 한다.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec nginx nginx -s reload
```

## 7. 운영 주의사항

- `frontend`와 `backend`는 외부 포트를 열지 않는다.
- 외부 공개는 `nginx`만 `80/443`으로 처리한다.
- 운영 대표 origin은 하나로 고정한다. 현재 권장값은 apex인 `https://woonglab.com`이며 `www.woonglab.com`은 nginx에서 apex로 `301` canonical redirect 시킨다.
- `Auth__PublicOrigin`은 Google OIDC `redirect_uri`를 안정적으로 고정하기 위한 값이므로 실제 브라우저 대표 origin과 정확히 일치해야 한다.
- `data-protection-keys` volume을 삭제하면 로그인 세션과 antiforgery가 끊길 수 있다.
- `media-storage`와 `postgres-data`는 운영 데이터이므로 재배포 중 삭제하면 안 된다.
- Backend Codex AI Fix는 image 안에서 새로 로그인하지 않는다. 운영 서버 host의 인증된 Codex home을 bind mount 한다.
- `CODEX_HOME_DIR`는 반드시 절대경로로 명시하는 것을 권장한다. 예: `CODEX_HOME_DIR=/root/.codex` 또는 `CODEX_HOME_DIR=/home/deploy/.codex`.
- `CODEX_HOME_DIR` 안에는 `auth.json`이 있어야 한다. 없으면 backend는 Codex provider를 숨기거나 명시적인 unavailable/auth error를 반환한다.
- GHCR image pull 방식과 Codex bind mount는 충돌하지 않는다. image는 동일하고, 인증은 compose runtime volume으로 주입된다.
- CI/GitHub Actions 빌드와 일반 test는 Codex 인증을 요구하지 않는다. live Codex smoke는 인증된 `CODEX_HOME_DIR`가 있는 dev/staging 서버에서만 수행한다.

운영 서버에서 확인:

```bash
test -f /root/.codex/auth.json && echo "Codex auth exists"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend sh -lc 'test -f /root/.codex/auth.json && echo "Codex auth mounted"'
```

`.env.prod` 예시:

```env
CODEX_HOME_DIR=/root/.codex
```

## 8. Downtime Note

현재 `docker compose up -d` 방식은 단일 `frontend`/`backend` 컨테이너를 교체하는 구조라 엄밀한 무중단 배포가 아니다. 컨테이너 recreate 동안 짧은 응답 공백이 생길 수 있다.

실제 무중단이 필요하면 배포 방식을 바꿔야 한다.

- blue-green: `frontend_blue/frontend_green`, `backend_blue/backend_green`처럼 두 벌을 띄운 뒤 nginx upstream만 전환
- rolling: 단일 host compose 대신 다중 replica + health-checked load balancer를 지원하는 오케스트레이터 사용
- 최소 타협안: 먼저 새 backend를 다른 service name으로 올리고 health 확인 후 nginx upstream 전환, 마지막에 구버전 정리

## Azure Backup and Restore

운영 백업은 Azure Blob Storage에 두 개의 아티팩트를 저장한다.

- `media.tar.gz`
- `postgres.dump`

백업 실행:

```bash
APP_ENV_FILE=.env.prod node scripts/azure-backup.mjs
```

먼저 출력만 확인하려면 `--dry-run`을 붙인다.

```bash
APP_ENV_FILE=.env.prod node scripts/azure-backup.mjs --dry-run
```

복원은 선택한 백업 ID와 `--confirm`을 동시에 요구한다.

```bash
APP_ENV_FILE=.env.prod node scripts/azure-restore.mjs --backup-id 20260418T000000Z --confirm
```

복원 전에는 앱과 백엔드를 중지하고 유지보수 창에서 실행하는 것을 권장한다. 복원은 media 디렉터리를 tar.gz로 덮고 PostgreSQL 덤프를 다시 적재한다.

cron 설치:

```bash
APP_ENV_FILE=.env.prod node scripts/install-azure-backup-cron.mjs
```

이 cron은 `CRON_TZ=Asia/Seoul`과 `0 7 * * *`를 사용한다. 설치 스크립트는 기존 crontab에서 같은 마커 블록을 갱신한다.

## Staging Deployment

`dev` CI 성공 후에는 staging용 GHCR 이미지가 별도 workflow로 publish된다.

예시 태그:

- `ghcr.io/<owner>/woong-blog-aspcore-nextjs-frontend:dev`
- `ghcr.io/<owner>/woong-blog-aspcore-nextjs-backend:dev`
- `ghcr.io/<owner>/woong-blog-aspcore-nextjs-frontend:dev-sha-<sha>`
- `ghcr.io/<owner>/woong-blog-aspcore-nextjs-backend:dev-sha-<sha>`

다른 폴더에서 staging 런타임을 올릴 때는 아래처럼 시작한다.

```bash
mkdir -p ~/woong-blog-staging
cd ~/woong-blog-staging
cp /path/to/repo/docker-compose.staging.yml .
cp /path/to/repo/.env.staging.example .env.staging
cp -r /path/to/repo/nginx ./nginx
mkdir -p certbot/www certbot/conf/live/current
```

`.env.staging`를 수정한 뒤 실행:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker compose --env-file .env.staging -f docker-compose.staging.yml pull
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
```

If staging should expose Codex AI Fix, also set `CODEX_HOME_DIR=/absolute/path/to/.codex`.
If `CODEX_HOME_DIR` is omitted or the mounted directory has no `auth.json`, staging should still boot, but Codex provider is not expected to be available.

로컬 홈서버에서 먼저 staging 검증을 하고, 그 다음에만 `main` promotion을 진행하는 흐름을 권장한다.
