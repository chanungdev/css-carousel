---
title: 이펙트
description: 프리셋 3종과 scroll-driven animation
sidebar:
  order: 5
---

프리셋 3종이 `effects.css`에 들어 있다. 전부 scroll-driven animation이라 스크롤 위치에
직접 묶인다 — 타이머도, 스크롤 이벤트 핸들러도 없다.

```js
import 'snapstrip/effects.css';
```

```html
<div data-carousel data-carousel-effect="scale">
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

| 값 | 효과 |
|---|---|
| `fade` | 가장자리에서 흐려진다 |
| `scale` | 가장자리에서 작아진다 |
| `reveal` | 커튼이 걷히고 미디어가 패럴랙스로 따라온다 |

동작하는 모습은 [Samples](/snapstrip/samples/effects/)에 있다.

## 브라우저

scroll-driven animation은 Chromium과 WebKit에서 동작하고 **Firefox에는 없다.** 미지원
브라우저에서는 이펙트 없이 평범한 스냅 캐러셀이 된다 — 기능이 깨지는 게 아니라 장식이
빠지는 것이다.

`prefers-reduced-motion: reduce`에서는 자동으로 비활성화된다.

## reveal은 간격이 없어야 한다

`reveal`은 커튼이 카드 경계를 지나가는 효과라 `--carousel-gap`이 있으면 사이가 벌어져 보인다.
`--carousel-gap: 0`으로 두는 걸 전제로 만들었다. 블록 축에서는 비활성화된다.
