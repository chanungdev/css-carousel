---
title: 카운터
description: data-carousel-counter로 n / total 표시하기
sidebar:
  order: 4
---

`data-carousel-counter`를 붙이면 `n / total` 배지가 나온다. CSS counter와 scroll-driven
animation만으로 만들어서 JavaScript도, 추가 스타일시트도 필요 없다 — `carousel.css` 안에 있고
요청하기 전까지는 꺼져 있다.

```html
<div data-carousel data-carousel-counter>
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

`--carousel-counter-inset`, `--carousel-counter-color`, `--carousel-counter-bg`로 모양을 바꾸거나,
`[data-carousel-counter] > [data-carousel-scroller]::after`를 덮어써서 위치를 옮긴다.
`progress` 테마가 바로 그렇게 해서 진행 바 끝에 앉힌다.

## 알아둘 것 세 가지

### 슬라이드가 완전히 들어온 순간에 센다

절반에서 세면 `--carousel-items`가 1보다 클 때 옆에 걸쳐 보이는 슬라이드까지 미리 세어,
앞 카드가 `04`인데 `5 / 6`이 된다.

### Firefox에서는 아무것도 안 나온다

`animation-timeline` 지원이 없으면 타임라인 없는 애니메이션이 곧바로 채워져 모든 슬라이드가
자기를 센다 — 첫 슬라이드에서 `5 / 5`가 나온다. 틀린 숫자가 없는 숫자보다 나쁘므로 전체를
`@supports (animation-timeline: view())` 안에 두었다.

### 루트가 아니라 스크롤러에 그린다

`container-type: inline-size`는 — 아이템 수를 반응형으로 만드는 권장 방법이다 —
`contain: style`을 함의한다. 그러면 슬라이드의 `counter-increment`가 루트에서 분리된 스코프로
갇혀 루트에 그린 카운터는 `0 / 0`을 읽는다. 리셋·증가·출력을 모두 스크롤러 안에 두면 한
스코프가 된다. 배지는 루트를 기준으로 absolute 배치되므로 스크롤러의 overflow에 잘리지도,
스크롤을 따라 움직이지도 않는다.

## 이펙트와 같이 쓸 때

카운터와 이펙트 프리셋은 둘 다 슬라이드를 애니메이션한다 — `animation-name`이라는 같은
자리다. `carousel.css`가 `effects.css`보다 먼저 로드되므로, 둘을 함께 살리는 규칙은 import
순서가 아니라 `data-carousel-counter` 게이트가 얹어주는 특이도에 기댄다. 쓰는 쪽에서 신경 쓸
것은 없다.
