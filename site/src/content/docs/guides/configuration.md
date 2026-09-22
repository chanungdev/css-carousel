---
title: 설정
description: CSS 변수와 data 속성
sidebar:
  order: 2
---

레이아웃도 CSS, 반응형도 CSS다. JavaScript 설정 객체는 없다.

```css
.my-carousel {
  --carousel-items: 2.5;   /* 소수를 넣으면 peek이 된다 */
  --carousel-gap: 1rem;
  --carousel-align: center;
}

@container (min-width: 40em) {
  .my-carousel { --carousel-items: 4; }
}
```

## 레이아웃 변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--carousel-items` | `1` | 한 화면 아이템 수. 소수 허용 |
| `--carousel-gap` | `0px` | 아이템 간격 (단위 필수) |
| `--carousel-align` | `start` | `scroll-snap-align` 값 |
| `--carousel-snap` | `mandatory` | 스냅 강도 |
| `--carousel-scrollbar` | `auto` | `none`으로 스크롤바 숨김 |

버튼·마커·카운터·썸네일의 외형은 `--carousel-button-*`, `--carousel-marker-*`,
`--carousel-counter-*`, `--carousel-thumb-*`로 조정한다. 전체 목록은 `dist/carousel.css`에 있다.

## 동작 속성

| 속성 | 위치 | 용도 |
|---|---|---|
| `data-carousel-axis` | 루트 | `inline`(기본) 또는 `block` |
| `data-carousel-loop` | 루트 | 무한 loop. 3세트를 직접 렌더한다면 `="manual"` |
| `data-carousel-autoplay="4000"` | 루트 | ms 단위 자동 넘김 |
| `data-carousel-autoplay-resume="5000"` | 루트 | 영구 정지 대신 마지막 입력으로부터 그만큼 지나면 재시작 |
| `data-carousel-thumbs="#strip"` | 루트 | 썸네일 carousel과 연동 |
| `data-carousel-effect` | 루트 | `fade`, `scale`, `coverflow`, `depth`, `curve`, `reveal` |
| `data-carousel-counter` | 루트 | 모서리에 `n / total` 카운터 표시 |
| `data-carousel-label-prev` / `-next` | 루트 | 폴백 버튼의 접근 이름. 기본값 `Previous` / `Next` |
| `data-carousel-label` | 슬라이드 | 폴백 경로 전용. 해당 슬라이드 마커의 접근 이름 |

## `--carousel-items`가 소수를 받는 이유

`flex-basis`를 `calc((100% + gap) / items - gap)`으로 계산한다. `2.5`를 넣으면 두 장 반이
보이고, 반 장이 다음 내용이 있다는 신호가 된다. 별도의 peek 옵션이 없는 건 그래서다.

## 컨테이너 질의를 쓸 때

`container-type: inline-size`를 건 요소는 **자기 자신의 컨테이너가 될 수 없다.** 변수를
컨테이너 자신이 아니라 자손(스크롤러)에 선언해야 한다.

```css
.gallery {
  container-type: inline-size;
  --carousel-items: 1.2;
}

@container (min-width: 30rem) {
  .gallery [data-carousel-scroller] { --carousel-items: 2.5; }
}
```
