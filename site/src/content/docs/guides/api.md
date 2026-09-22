---
title: 명령형 API
description: 인스턴스, 메서드, 이벤트
sidebar:
  order: 9
---

auto-init이 붙이는 인스턴스가 표면의 전부다. 설정 객체는 없다 — 레이아웃은 CSS에서, 동작은
`data-*` 속성에서 온다.

```ts
import type { Carousel } from 'snapstrip';

// querySelector<HTMLElement>가 중요하다. carousel 속성은 HTMLElement에 선언돼 있고
// 그냥 querySelector는 Element를 반환한다.
const root = document.querySelector<HTMLElement>('[data-carousel]');
const carousel: Carousel | undefined = root?.carousel;

carousel?.next();
carousel?.goTo(3);
carousel?.goTo(3, 'instant'); // behavior는 선택. 기본은 smooth

document.addEventListener('carousel:change', (event) => {
  console.log(event.detail.index, event.detail.slideIndex);
});
```

| 멤버 | 타입 | 설명 |
|---|---|---|
| `root` / `scroller` | `HTMLElement` | 마크업 계약의 두 요소 |
| `axis` | `'inline' \| 'block'` | `data-carousel-axis`에서 |
| `isInline` | `boolean` | |
| `slides` | `HTMLElement[]` | 모든 자식. loop 복제본 포함 |
| `items` | `HTMLElement[]` | 논리 아이템 — loop일 때는 가운데 세트 |
| `index` | `number` | 한 세트 안에서의 논리 인덱스 |
| `slideIndex` | `number` | `slides` 기준 실제 인덱스 |
| `setSize` | `number \| null` | loop일 때 한 세트의 아이템 수, 아니면 `null` |
| `next` / `prev` | `(behavior?: ScrollBehavior) => void` | 양 끝에서 clamp. loop에서는 이어진다 |
| `goTo` | `(i: number, behavior?: ScrollBehavior) => void` | 논리 인덱스 |
| `scrollToSlide` | `(i: number, behavior?: ScrollBehavior) => void` | 실제 인덱스 |
| `refresh` | `() => void` | 슬라이드 목록이 바뀐 뒤 다시 관찰 |
| `destroy` / `onDestroy` | `() => void` / `(fn: () => void) => void` | |
| `Carousel.init` | `(root: HTMLElement) => Carousel` | 멱등 — 이미 있으면 기존 인스턴스를 반환 |
| `Carousel.initAll` | `(scope?: ParentNode) => void` | |

## 언제 직접 초기화하나

`data-carousel`이 붙은 요소는 자동으로 초기화되고, 나중에 DOM에 추가된 것도
`MutationObserver`가 잡는다. `Carousel.init()`을 직접 부를 일은 드물다 — 초기화 시점을
정확히 통제해야 할 때 정도다. 멱등이라 두 번 불러도 같은 인스턴스가 돌아온다.

`loop`·`autoplay`·폴백 컨트롤은 `init()` 시점에 배선된다. 속성만 나중에 바꿔서는 붙지
않으므로, 바꿀 때마다 `destroy()` 후 다시 `init()`한다.
