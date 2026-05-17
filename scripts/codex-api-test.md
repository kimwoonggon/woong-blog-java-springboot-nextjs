# codex-api-test.mjs

`codex` CLI를 서브프로세스로 실행해서 텍스트를 보내고, 마지막 응답만 출력하는 간단한 테스트 스크립트입니다.

## 파일

- 스크립트: `scripts/codex-api-test.mjs`

## 전제 조건

- `codex` CLI가 설치되어 있어야 합니다.
- `codex login` 이 되어 있어야 합니다.
- 별도의 `OPENAI_API_KEY` 는 필요 없습니다.

## 기본 사용법

```bash
node scripts/codex-api-test.mjs "간단한 Node.js 예제 짜줘"
```

## stdin으로 입력하기

```bash
echo "TypeScript로 debounce 함수 만들어줘" | node scripts/codex-api-test.mjs
```

## 이미지 첨부하기

이미지 1장과 함께 보낼 수 있습니다.

```bash
node scripts/codex-api-test.mjs --image ./sample.png "이 이미지 설명해줘"
```

여러 장도 반복해서 붙일 수 있습니다.

```bash
node scripts/codex-api-test.mjs --image ./a.png --image ./b.jpg "두 이미지 차이를 비교해줘"
```

프롬프트를 생략하면 기본으로 이미지 설명을 요청합니다.

```bash
node scripts/codex-api-test.mjs --image ./sample.png
```

## 모델 지정하기

환경변수로 기본 모델을 지정할 수 있습니다.

```bash
CODEX_MODEL=gpt-5.4 node scripts/codex-api-test.mjs "Reply with exactly: OK"
```

또는 실행 인자로 지정할 수도 있습니다.

```bash
node scripts/codex-api-test.mjs --model gpt-5.4 "React useEffect 예시 보여줘"
```

## 추론 강도 지정하기

실행 인자로 추론 강도를 지정할 수 있습니다.

```bash
node scripts/codex-api-test.mjs --reasoning low "Reply with exactly: OK"
```

환경변수로 기본 추론 강도를 지정할 수도 있습니다.

```bash
CODEX_REASONING_EFFORT=high node scripts/codex-api-test.mjs "복잡한 리팩터링 전략 설명해줘"
```

보통 아래 값들을 사용합니다.

- `low`
- `medium`
- `high`
- `xhigh`

## 지원하는 환경변수

- `CODEX_COMMAND`
  - 기본값: `codex`
  - 다른 실행 파일을 쓰고 싶을 때 사용합니다.
- `CODEX_MODEL`
  - 기본값: 없음
  - 지정하면 `codex exec -m <model>` 로 실행합니다.
- `CODEX_REASONING_EFFORT`
  - 기본값: 없음
  - 지정하면 `codex exec -c model_reasoning_effort=\"...\"` 로 실행합니다.
- `CODEX_WORKDIR`
  - 기본값: 현재 작업 디렉터리
  - Codex가 작업 루트로 사용할 디렉터리입니다.
- `CODEX_TIMEOUT_MS`
  - 기본값: `180000`
  - 요청 타임아웃입니다. 밀리초 단위입니다.

## 동작 방식

스크립트는 내부적으로 아래와 비슷한 형태로 `codex`를 실행합니다.

```bash
codex exec -i <image>... --skip-git-repo-check --ephemeral -C <workdir> -o <tmpfile> -
```

- 프롬프트는 인자 또는 `stdin`으로 전달합니다.
- 이미지는 `--image` 를 여러 번 써서 첨부할 수 있습니다.
- Codex의 마지막 응답 메시지를 임시 파일로 저장한 뒤 출력합니다.
- 세션 파일은 남기지 않도록 `--ephemeral` 을 사용합니다.

## 문제 해결

`codex: command not found`

- `codex` CLI가 설치되지 않았거나 PATH에 없습니다.
- `CODEX_COMMAND` 로 실행 파일 경로를 직접 지정할 수 있습니다.

`Request failed: ...`

- `codex login` 상태인지 확인합니다.
- 네트워크 연결 또는 Codex 인증 상태를 확인합니다.
- 너무 오래 걸리면 `CODEX_TIMEOUT_MS` 값을 늘려서 다시 실행합니다.

## 빠른 테스트

```bash
node scripts/codex-api-test.mjs "Reply with exactly: OK"
```

정상 동작하면 아래처럼 출력됩니다.

```text
OK
```
