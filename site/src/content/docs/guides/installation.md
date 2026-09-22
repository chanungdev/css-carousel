---
title: 설치
description: snapstrip 설치와 import 순서
sidebar:
  order: 1
---

## npm

```bash
npm install snapstrip
```

```js
import 'snapstrip';                      // auto-init
import 'snapstrip/carousel.css';         // 필수
import 'snapstrip/effects.css';          // 선택 — 이펙트 프리셋
import 'snapstrip/themes/basic.css';     // 선택 — 테마
```

## import 순서

`carousel.css`가 먼저다. 테마는 그 뒤에 와야 기본값을 덮는다.

```js
import 'snapstrip/carousel.css';
import 'snapstrip/themes/basic.css';     // carousel.css보다 뒤
```

이펙트와 카운터는 순서를 신경 쓰지 않아도 된다. 둘이 슬라이드의 `animation-name`이라는
같은 자리를 쓰지만, 카운터 규칙이 게이트 속성으로 특이도를 확보해 두었기 때문이다.

## 레이어

라이브러리 스타일시트는 전부 `@layer snapstrip` 안에 있다. 레이어에 없는 CSS는 레이어에
있는 CSS를 항상 이기므로, 애플리케이션 CSS로 라이브러리를 덮을 때 특이도 싸움을 할 일이 없다.

Tailwind v4처럼 모든 것을 레이어에 넣는 도구와 같이 써도 마찬가지다 — 사용자 레이어가
`snapstrip` 뒤에 오게만 하면 된다.

## CDN

빌드 도구 없이 쓸 수도 있다.

```html
<link rel="stylesheet" href="https://unpkg.com/snapstrip/dist/carousel.css">
<script type="module" src="https://unpkg.com/snapstrip/dist/carousel.js"></script>
```
