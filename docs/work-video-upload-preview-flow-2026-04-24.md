# Work Video Upload And Timeline Preview Flow

## Purpose

이 문서는 현재 코드 기준으로:

1. Admin 프론트엔드에서 MP4를 업로드하면 어떤 순서로 `WorkVideo`가 등록되는지
2. public works 상세에서 progress 영역 hover 시 왜 preview 이미지가 보이는지
3. 그 preview가 어떤 프론트/백엔드 자산에 의존하는지

를 한 번에 설명한다.

기준 구현 파일:

- `src/components/admin/WorkEditor.tsx`
- `src/components/content/WorkVideoPlayer.tsx`
- `src/lib/api/works.ts`
- `backend/src/WoongBlog.Application/Modules/Content/Works/WorkVideos/StartWorkVideoHlsJobCommandHandler.cs`
- `backend/src/WoongBlog.Infrastructure/Modules/Content/Works/WorkVideos/FfmpegVideoTranscoder.cs`
- `backend/src/WoongBlog.Infrastructure/Modules/Content/Works/WorkVideos/WorkVideoHlsOutputPublisher.cs`
- `backend/src/WoongBlog.Infrastructure/Modules/Content/Works/Persistence/WorkQueryStore.cs`
- `backend/src/WoongBlog.Infrastructure/Modules/Content/Works/Persistence/WorkVideoQueryStore.cs`

## Big Picture

흐름은 크게 4단계다.

1. 프론트에서 MP4 파일을 선택한다.
2. 백엔드가 MP4를 받아 HLS와 preview 자산을 만든다.
3. 백엔드가 `WorkVideo` row를 저장하고 public URL을 DTO로 내려준다.
4. public player가 `timeline.vtt`와 sprite를 읽어서 hover 위치에 맞는 preview bubble을 띄운다.

요약하면:

`MP4 업로드 -> HLS 변환 -> sprite/VTT 생성 -> WorkVideo 저장 -> public detail 응답 -> WorkVideoPlayer가 VTT 파싱 -> hover 위치 시간 계산 -> sprite 일부를 잘라 bubble 표시`

## 1. Frontend Upload Flow

### 1-1. 기존 work를 편집하면서 바로 업로드하는 경로

Admin의 `WorkEditor`에서 파일 input은 `#work-video-upload`다.

MP4를 선택하면 `uploadHlsVideoForExistingWork(file)`가 호출된다.

여기서 프론트가 하는 일:

1. `videoUploadStatus`를 `uploading`으로 올린다.
2. `700ms` 후 `processing`으로 바꾸는 타이머를 건다.
3. `uploadHlsVideo(workId, file, expectedVersion)`를 호출한다.
4. 성공하면 `syncVideos(payload)`로 최신 `videos` 배열과 `videosVersion`을 반영한다.
5. 상태를 `complete`로 바꾸고 inline public view가 열려 있으면 새 데이터를 다시 보게 한다.

즉 프론트에서 보는 업로드 상태 문구:

- `업로드 중...`
- `처리 중...`
- `준비 완료`

는 byte-level 네트워크 progress가 아니라, UX 단계 표시다.

### 1-2. 새 work 생성 전에 staged video로 들고 있는 경로

새 work를 만들 때는 파일을 먼저 `stagedVideos`에 쌓아둘 수 있다.

이 경우 흐름은:

1. work 본문/메타데이터를 먼저 저장한다.
2. 새 work `id`가 생기면 `processStagedVideos(workId)`가 돈다.
3. staged file draft마다 `addStagedUploadedVideo(...)`가 호출된다.
4. `uploadMode === 'hls'`이면 결국 같은 `uploadHlsVideo(workId, file, expectedVersion)` 경로로 들어간다.

즉 “기존 글 편집 중 업로드”와 “새 글 만들면서 staged 상태로 업로드”는 프런트 시작점만 다르고, backend HLS job 호출로 수렴한다.

## 2. Backend Registration Flow

### 2-1. entrypoint

프론트가 호출하는 핵심 엔드포인트는 `/api/admin/works/{workId}/videos/hls-job`이고, 실제 handler는 `StartWorkVideoHlsJobCommandHandler`다.

이 handler가 하는 일:

1. work 존재 여부 확인
2. `VideosVersion` optimistic concurrency 확인
3. 업로드 파일 검증
4. storage backend 선택
5. `WorkVideoHlsJobPlan.Create(...)`로 storage key 계획 생성
6. temp workspace 생성
7. MP4 시그니처 검사
8. ffmpeg 기반 HLS/preview 생성
9. 생성된 파일들을 실제 storage에 publish
10. `WorkVideo` entity 저장

### 2-2. storage key 계획

`WorkVideoHlsJobPlan`은 업로드 전에 파일 경로 계획을 먼저 만든다.

대표적으로:

- `videos/<workId>/<videoId>/hls/master.m3u8`
- `videos/<workId>/<videoId>/hls/timeline.vtt`
- `videos/<workId>/<videoId>/hls/timeline-sprite.jpg`

이렇게 HLS manifest와 preview 자산이 같은 prefix 아래에 정리된다.

### 2-3. temp workspace

`WorkVideoHlsWorkspace.CreateAsync(...)`는 업로드된 파일을 temp 디렉터리로 복사한다.

형태는 대략:

- temp root: `/tmp/woong-blog-hls/<videoId>/`
- source file: `/tmp/woong-blog-hls/<videoId>/source.mp4`
- output dir: `/tmp/woong-blog-hls/<videoId>/hls/`

즉 backend는 업로드된 multipart file을 바로 최종 저장소에 쓰는 게 아니라, 먼저 로컬 temp workspace에서 가공한 뒤 publish한다.

## 3. HLS And Preview Asset Generation

### 3-1. HLS 생성

`FfmpegVideoTranscoder.SegmentHlsAsync(...)`는 먼저 HLS를 만든다.

주요 산출물:

- `master.m3u8`
- `segment_00000.ts`, `segment_00001.ts`, ...

이 단계가 끝나면 브라우저는 HLS manifest를 통해 실제 비디오를 재생할 수 있다.

### 3-2. preview sprite + VTT 생성

그 다음 같은 transcoder가 preview 자산을 만든다.

핵심은 두 파일이다.

1. `timeline-sprite.jpg`
2. `timeline.vtt`

#### sprite

sprite는 여러 시점의 프레임을 한 장의 큰 JPG에 타일 형태로 붙여 놓은 이미지다.

예를 들어 18초 영상이면:

- 0초 부근 프레임
- 5초 부근 프레임
- 10초 부근 프레임
- 15초 부근 프레임

같은 식으로 추출해서 한 장에 모은다.

#### VTT

`timeline.vtt`는 “어느 시간 구간이 sprite의 어느 좌표에 대응하는지”를 적는 인덱스 파일이다.

예시 개념:

```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
timeline-sprite.jpg#xywh=0,0,320,180

00:00:05.000 --> 00:00:10.000
timeline-sprite.jpg#xywh=320,0,320,180
```

즉 hover 시간이 7초면 “두 번째 cue를 써라”는 식으로 찾을 수 있다.

### 3-3. 짧은 영상이 왜 별도 처리가 필요한가

이번 수정 전에는 `fps=1/5` 기반 tile 로직만 써서 1초짜리 짧은 MP4는 ffmpeg가 성공처럼 끝나도 sprite 파일을 안 남기는 경우가 있었다.

그 결과:

- DB에는 `timeline.vtt` / `timeline-sprite.jpg` URL이 저장됨
- 실제 파일은 없음
- public detail에서는 preview URL이 보이는데 `404`

이 문제가 생겼다.

지금은:

- preview frame이 1개뿐인 경우 `single-frame` 경로로 JPG를 강제로 생성
- preview 파일이 실제로 존재할 때만 `TimelinePreviewVttStorageKey` / `TimelinePreviewSpriteStorageKey`를 저장

하도록 바뀌었다.

즉 이제는 “preview URL이 내려오는데 파일은 없음” 상태를 막는다.

## 4. Publish To Storage

`WorkVideoHlsOutputPublisher.PublishAsync(...)`는 temp `hls/` 디렉터리에 있는 파일들을 storage backend에 저장한다.

파일별 content type:

- `.m3u8` -> `application/vnd.apple.mpegurl`
- `.vtt` -> `text/vtt`
- `.jpg` -> `image/jpeg`
- `.ts` -> `video/mp2t`

local storage를 쓰는 경우 `LocalVideoStorageService.SaveDirectUploadAsync(...)`가 실제 파일을 `MediaRoot` 아래에 쓴다.

그래서 public URL은 결국 `/media/videos/...` 형태가 된다.

## 5. How WorkVideo Gets Returned To The Frontend

backend 저장이 끝나면 `WorkVideoQueryStore`와 `WorkQueryStore`가 public/admin DTO를 만든다.

이때 `ResolveTimelinePreviewUrl(...)`가:

- `TimelinePreviewVttStorageKey`
- `TimelinePreviewSpriteStorageKey`

를 실제 public URL로 바꿔준다.

예:

- `/media/videos/<workId>/<videoId>/hls/timeline.vtt`
- `/media/videos/<workId>/<videoId>/hls/timeline-sprite.jpg`

프런트의 `src/lib/api/works.ts`는 backend의 raw snake_case를 camelCase로 정규화한다.

즉 player 입장에서는 최종적으로:

- `video.playbackUrl`
- `video.timelinePreviewVttUrl`
- `video.timelinePreviewSpriteUrl`

세 값을 받으면 된다.

## 6. How The Public Player Shows Hover Preview

### 6-1. VTT load

`WorkVideoPlayer`는 uploaded/HLS 영상이면서 preview URL이 둘 다 있으면 `supportsTimelinePreview = true`가 된다.

그 다음:

1. `fetch(video.timelinePreviewVttUrl)`
2. `parseTimelinePreviewVtt(text)`
3. `previewCues` state에 저장

를 한다.

VTT parsing이 끝나면 `data-preview-ready="true"`가 된다.

이건 테스트에서도 “preview 자산이 준비된 상태”를 기다리는 신호로 쓴다.

### 6-2. 왜 native progress bar를 직접 안 쓰는가

브라우저 기본 `<video controls>`의 progress bar는 브라우저 내부 UI라서 React가 “지금 마우스가 바의 몇 퍼센트 지점에 있는지”를 직접 읽을 수 없다.

그래서 현재 구현은:

1. 비디오 프레임 내부에 custom controls overlay를 그림
2. 그 안에 `work-video-progress-overlay`라는 얇은 progress strip을 둠
3. hover 좌표는 이 overlay rect 기준으로 계산

한다.

즉 UX는 유튜브식이지만, 기술적으로는 native controls 위를 직접 읽는 게 아니라 custom overlay를 쓰는 구조다.

### 6-3. hover 시 실제 계산

`updatePreview(clientX, barElement)`는 다음 순서로 동작한다.

1. progress overlay의 bounding rect를 읽는다.
2. `clientX - rect.left`로 overlay 안에서의 x offset을 구한다.
3. `offsetX / rect.width`로 progress percent를 구한다.
4. `percent * duration`으로 target time을 만든다.
5. `resolvePreviewCue(previewCues, targetTime)`로 맞는 cue를 찾는다.
6. cue의 `x,y,width,height`를 써서 sprite에서 해당 영역만 background-position으로 잘라낸다.
7. bubble을 overlay 위쪽에 띄운다.

즉 preview bubble은 “시간 계산”은 progress overlay 기준으로 하고, “위치 배치”는 frame 기준으로 맞춘다.

### 6-4. click seek

같은 progress overlay는 click seek에도 쓴다.

`seekToClientX(clientX, barElement)`가 같은 방식으로 target time을 계산해서 `video.currentTime`을 옮긴다.

즉 같은 바가:

- click -> seek
- hover -> preview

두 역할을 같이 한다.

## 7. Why It Feels Similar To YouTube

사용자 눈에는:

1. 비디오 하단 progress 영역이 보이고
2. 다른 시간대에 마우스를 올리면
3. 그 위치 위에 작은 이미지 preview가 뜨며
4. 클릭하면 그 시점으로 이동

하기 때문에 유튜브와 비슷하게 느껴진다.

하지만 내부 원리는:

- YouTube native player 자체를 쓰는 게 아니라
- HLS + custom overlay + sprite/VTT

조합이다.

즉 “유튜브 같은 UX를 자체 구현”한 구조에 가깝다.

## 8. Current Constraints

현재 제약은 명확하다.

1. preview는 uploaded/HLS video에만 있다.
   - YouTube 영상은 외부 iframe이므로 이 preview 파이프라인을 쓰지 않는다.

2. preview 품질은 backend preview 밀도에 의존한다.
   - 현재 기본 interval은 `5초`
   - 더 촘촘하게 하려면 `WorkVideoHlsOptions`를 조정해야 한다.

3. 오래전에 저장된 영상 중 preview 파일 없이 URL만 남은 row는 자동 복구되지 않는다.
   - 재업로드 또는 재처리 배치가 필요하다.

4. recording spec은 stable `.webm` 산출물을 복사하므로 병렬 실행보다 단독 실행이 안전하다.

## 9. Practical Debug Checklist

preview가 안 뜰 때는 아래 순서로 보면 된다.

1. public detail JSON에 `timeline_preview_vtt_url`, `timeline_preview_sprite_url`가 있는가
2. 두 URL이 실제 `200`인가
3. `WorkVideoPlayer`의 `data-preview-ready`가 `true`가 되는가
4. hover 대상이 실제 `work-video-progress-overlay` 위인가
5. VTT cue가 비어 있지 않은가

이 다섯 개가 맞으면 hover preview는 떠야 한다.

## 10. Related Test Coverage

관련 테스트는 아래가 핵심이다.

- `src/test/work-video-player.test.tsx`
- `tests/public-work-videos.spec.ts`
- `tests/video-preview-recording-0424.spec.ts`
- `backend/tests/WoongBlog.Api.IntegrationTests/WorkVideoEndpointsTests.cs`
- `backend/tests/WoongBlog.Api.UnitTests/WorkVideoHlsJobPlanTests.cs`

특히:

- `PF-044`는 새 업로드 영상이 실제로 preview asset을 만든 뒤 public page에서 hover preview를 띄우는지 본다.
- `video-preview-recording-0424.spec.ts`는 실제 browser recording `.webm`까지 남긴다.

## Short Version

한 줄 요약하면:

`Admin에서 MP4 업로드 -> backend가 HLS + sprite/VTT 생성 -> WorkVideo row에 preview URL 저장 -> public player가 VTT를 읽어 hover 위치 시간에 맞는 sprite 조각을 bubble로 보여준다.`
