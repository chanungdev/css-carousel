---
title: 테마
description: basic·progress 테마와 직접 만드는 법
sidebar:
  order: 3
---

`carousel.css`는 구조와 중립적인 기본값이다 — 레이아웃을 잡고 버튼·마커에 최소한의 모양을 줄
뿐이다. 테마는 그 위에 얹는 선택 스타일시트다.

```js
import 'snapstrip/carousel.css';
import 'snapstrip/themes/basic.css';     // 또는 themes/progress.css
```

## basic

이 문서 사이트의 모든 데모가 쓰는 테마다. 기본값이 의도적으로 하지 않는 세 가지를 한다.

- **마커를 흐름에서 뺀다.** 기본 상태에서는 마커 줄이 스크롤러 아래에 놓여 wrapper가
  미디어보다 높아지고, wrapper의 50%에 놓이는 화살표가 카드 중심보다 아래로 내려간다.
  마커를 겹쳐 놓으면 wrapper와 미디어가 같은 상자가 된다.
- **실제 이미지 위에서 마커가 보이게 한다.** 반투명 검정은 어두운 미디어에서 사라지므로,
  어두운 링을 두른 흰 점을 쓴다.
- **비활성 화살표를 흐리게 하는 대신 숨긴다.** hover·blur 처리도 함께 넣었다.

## progress

화살표가 눈에 띄지 않기를 바라는, 스와이프 중심 레이아웃에 맞는다.

- **화살표는 hover에서만 나타난다.** 키보드 사용자를 위해 `:focus-within`도 조건에 넣었다.
  규칙 전체가 `@media (hover: hover)` 안에 있다 — 터치 기기에는 hover가 없고, 보이지 않는데
  탭은 되는 버튼은 그냥 보이는 버튼보다 나쁘기 때문이다.
- **마커는 점 대신 넓은 진행 트랙 하나다.** 조각들이 간격 없이 트랙을 나눠 갖고, 현재
  슬라이드까지가 채워진다.
- **[카운터](/snapstrip/guides/counter/)를 트랙 끝에 앉힌다.** 카운터 자체는 테마가 아니라
  core의 opt-in이라 `data-carousel-counter`를 붙여야 켜진다.

## 직접 만들 때

`dist/themes/basic.css`를 복사해 맨 위 변수 블록만 바꾸고 그걸 import하면 된다. 그 전에 알아둘
규칙이 둘 있다.

### 레이어 안에 두거나, 아예 두지 않거나

라이브러리 스타일시트는 `@layer snapstrip`에 있다. 같은 레이어의 테마는 소스 순서로
`carousel.css`를 이기므로 **두 번째로 import**하면 된다. 애플리케이션 CSS는 레이어에 없으므로
어느 쪽이든 항상 이긴다 — 특이도 싸움을 할 일이 없다.

### 네이티브와 폴백을 한 선택자 목록에 섞지 않는다

모르는 pseudo-element가 하나 있으면 **선택자 목록 전체**가 무효가 된다. `:is()`로 묶는 것도
안 된다 — pseudo-element를 받지 않는다. 두 경로는 반드시 별도 규칙이어야 한다.

```css
/* 안 된다 — ::scroll-marker를 모르는 브라우저가 규칙 전체를 버려 폴백까지 죽는다 */
[data-carousel] > [data-carousel-scroller] > *::scroll-marker,
[data-carousel] > .carousel-markers > .carousel-marker {
  background: red;
}

/* 된다 — 같은 변수를 읽는 두 규칙 */
[data-carousel] > [data-carousel-scroller] > *::scroll-marker {
  background: var(--carousel-marker-color);
}

[data-carousel] > .carousel-markers > .carousel-marker {
  background: var(--carousel-marker-color);
}
```
