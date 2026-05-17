# Migration Strategy

민감정보가 섞인 DB dump를 직접 운영으로 옮기고 싶지 않다면:

- 새 빈 DB를 만든 뒤
- 필요한 export 폴더만 다시 import 해서
- 공개성 콘텐츠만 재구성하는 방식이 더 안전하다

예:

- `notion-connected-2026-04-13T08-03-24-517Z` 만으로 blog DB 재구성
