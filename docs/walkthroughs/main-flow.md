# Main Flow

기본 운영 흐름:

1. 작업 브랜치에서 개발
2. 작업 브랜치를 `dev` 에 반영
3. `dev` 기준 검증 통과
4. `Promote Main Runtime` 워크플로우가 `release/main-promote` 브랜치를 자동 갱신
5. `release/main-promote -> main` PR 이 자동 생성되거나 기존 PR 이 재사용되고 auto-merge 가 설정됨
6. `main` 대상 runtime 검증이 PR 에서 통과하면 GitHub 가 `main` 으로 자동 merge
7. `main` 기준 runtime CI / GHCR publish / 운영 서버 pull-up

한 줄 요약:

```text
dev 통과 -> release/main-promote 자동 갱신/PR 생성 -> main 대상 검증 통과 시 auto-merge
```

주의:

- `dev` 성공만으로 `main` 에 직접 push 되지 않는다.
- 자동화 경로는 `promotion branch 준비 -> promotion PR -> main 대상 검증 -> auto-merge` 다.
- GitHub repository 의 auto-merge 허용과 branch rule 이 이 경로를 막지 않아야 한다.
- promotion workflow 는 repo secret `PROMOTION_TOKEN` 을 사용해야 downstream `pull_request` / CI 가 정상적으로 이어진다.
