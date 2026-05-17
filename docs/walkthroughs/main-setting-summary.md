# Main Setting Summary

운영 체크 순서:

1. `main` pull
2. `docker compose pull`
3. bootstrap HTTP 기동
4. ACME challenge 확인
5. certbot 발급
6. `prod.conf` 로 HTTPS 전환
7. DB/media 상태 확인
