---
title: 썸네일 연동
description: 두 캐러셀을 묶기
sidebar:
  order: 8
---

메인 캐러셀에 `data-carousel-thumbs`로 썸네일 캐러셀의 선택자를 준다.

```html
<div data-carousel data-carousel-thumbs="#strip" id="main">
  <ul data-carousel-scroller>…</ul>
</div>

<div data-carousel id="strip">
  <ul data-carousel-scroller>…</ul>
</div>
```

- 메인이 움직이면 해당 썸네일에 `.carousel-thumb-current`가 붙고, 필요하면 보이도록
  스크롤된다.
- 썸네일을 클릭하면 메인이 그 위치로 이동한다.

현재 썸네일의 외형은 `--carousel-thumb-current-opacity`(기본 `1`)와
`--carousel-thumb-opacity`(기본 `0.5`)로 조정한다.

## 개수가 다를 때

썸네일이 메인보다 적으면 마지막 썸네일에서 하이라이트가 clamp된다. 많으면 남는 썸네일은
선택되지 않는다. 양쪽 수를 맞추는 게 정상이지만, 어긋나도 깨지지는 않는다.
