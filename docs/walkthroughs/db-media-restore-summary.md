# DB Media Restore Summary

재마이그레이션보다 아래 전략이 우선이다.

1. 기존 source DB dump 복원
2. 기존 Docker media volume 내용을 새 host bind mount 경로로 복사
3. data-protection 도 host bind mount 경로로 복사

이 프로젝트는:

- DB에 파일 바이너리를 저장하지 않고
- `Assets.Path`, `Assets.PublicUrl`, `Blogs.CoverAssetId` 같은 참조만 저장한다
- 실제 파일은 `/app/media/...` 에 저장한다

즉 DB와 media 파일을 같이 맞추는 것이 핵심이다.
