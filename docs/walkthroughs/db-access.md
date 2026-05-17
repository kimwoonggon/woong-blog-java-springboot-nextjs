# DB Access

운영 PostgreSQL은 외부 인터넷에 직접 공개하지 않는 것이 기본이다.

가장 안전한 접근:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec db psql -U portfolio -d portfolio
```

GUI가 필요하면:

- 서버 localhost 에만 `127.0.0.1:5432:5432` 바인딩
- 내 PC에서 SSH tunnel
- VSCode / SQLTools 는 `127.0.0.1:15432` 로 연결

비추천:

```yaml
ports:
  - "5432:5432"
```
