---
title: Loop
description: 무한 순환과 프레임워크에서의 manual 모드
sidebar:
  order: 6
---

`data-carousel-loop`를 붙이면 슬라이드를 앞뒤로 복제해 세 세트를 만들고, 경계를 넘을 때마다
스크롤 위치를 가운데로 되돌린다. 되돌림은 `behavior: 'instant'`라 사용자 눈에는 끊김이 없다.

```html
<div data-carousel data-carousel-loop>
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

복제본은 원본의 접근성 정보를 그대로 들고 오면 안 되므로, `aria-hidden`과 함께 `inert`를
붙인다. `aria-hidden`만 붙이면 스크린 리더에는 안 보이는데 Tab으로는 들어가지는 상태가 되어
WCAG 4.1.2를 어긴다. `id`도 떼어 낸다 — 문서에 같은 id가 셋이 되기 때문이다.

마커는 복제본에 만들지 않는다. 슬라이드가 6장이면 네이티브 경로든 폴백 경로든 마커는 6개다.

## 프레임워크에서 — `manual`

라이브러리가 DOM에 복제본을 끼워 넣으면 프레임워크의 재조정과 싸운다. React나 Vue가 목록을
다시 그릴 때 복제본이 사라지거나 중복된다.

그럴 때는 `data-carousel-loop="manual"`을 쓰고 **세 벌을 직접 렌더한다.**

```html
<div data-carousel data-carousel-loop="manual">
  <ul data-carousel-scroller>
    <!-- 앞 복제본 -->
    <li data-carousel-clone>…</li>
    <!-- 원본 -->
    <li>…</li>
    <!-- 뒤 복제본 -->
    <li data-carousel-clone>…</li>
  </ul>
</div>
```

라이브러리는 복제를 하지 않고 되돌림만 맡는다. 복제본에는 `data-carousel-clone`을 붙여야
마커 계산과 인덱스가 맞는다.

## 알려진 한계

`refresh()`는 loop 캐러셀의 `setSize`를 다시 계산하지 않고 복제본도 건드리지 않는다.
슬라이드 수가 바뀌었다면 `destroy()` 후 `Carousel.init()`으로 다시 만든다.
