<p align="center">
  <a href="README.md">English</a> | <b>한국어</b>
</p>

# snapstrip

CSS carousel primitive — `scroll-snap`, `::scroll-button()`, `::scroll-marker()` — 위에 만든 carousel.
브라우저가 이것들을 지원하면 **JavaScript가 0바이트**다. 지원하지 않는 곳에서는 선택적 스크립트(gzip 8KB 미만
실측)가 같은 버튼·마커·키보드 탐색·`tablist` 접근성을 채워 넣는다.

React, Vue, Angular, Svelte, 순수 HTML 어디서나 동작한다. 설치할 프레임워크 래퍼가 없다 —
프레임워크에 종속된 부분이 애초에 없기 때문이다.

## 문서

**[문서와 라이브 데모](https://chanungdev.github.io/snapstrip/)** — main에 푸시할 때마다 자동 배포된다.

로컬에서 띄우려면:

```bash
git clone https://github.com/chanungdev/snapstrip.git && cd snapstrip
pnpm install            # 이 저장소는 pnpm을 쓴다. `corepack enable`이 고정된 버전을 잡아준다
pnpm docs:dev           # http://localhost:4321/snapstrip/
```

사이트는 `site/` 아래의 Astro + Starlight 패키지이고 `src/`를 직접 불러오도록 배선돼 있다 — 개발
서버가 TypeScript를 즉석에서 변환하므로 빌드할 것도, 계속 띄워둘 감시 프로세스도 없다. 라이브러리를
고치면 문서에 바로 반영된다.

구성은 **Overview**, **Guides**, **Samples**, **Playground** 네 갈래다. 모든 데모는 문자열 하나에서
렌더링과 코드 블록이 함께 만들어지므로, 복사하는 코드가 곧 지금 돌고 있는 코드다.

## 설치

```bash
npm install snapstrip
```

```ts
import 'snapstrip/carousel.css';
import 'snapstrip/themes/basic.css'; // 선택 — 완성된 모양, 아래 테마 참고
import 'snapstrip'; // 선택 — Firefox/Safari 지원과 명령형 API에만 필요
```

이 패키지는 ESM 전용이다(`"type": "module"`, CommonJS 빌드 없음). `require('snapstrip')`은 실패한다 —
`import`나 동적 `import()`를 쓴다.

## TypeScript

라이브러리는 TypeScript로 작성됐고 선언 파일을 함께 배포한다 — DefinitelyTyped에서 따로 받을 게 없다.
import하면 전역 확장 두 개가 등록되므로 캐스트 없이 DOM이 carousel을 알아본다:

```ts
import { Carousel } from 'snapstrip';

const root = document.querySelector<HTMLElement>('[data-carousel]');

// auto-init이 인스턴스를 붙인다. 타입은 Carousel | undefined다
root?.carousel?.goTo(2);

// 이벤트의 detail에 타입이 붙는다. 요소에서 듣든 document에서 듣든 마찬가지다
document.addEventListener('carousel:change', (event) => {
  console.log(event.detail.index, event.detail.slideIndex);
});
```

export하는 타입: `Carousel`, `CarouselChangeDetail`, `CarouselAxis`, `ResolveCarousel`.

부딪히기 전에 알아두면 좋은 마찰 지점 하나 — CSS 커스텀 프로퍼티는 React의 `CSSProperties`나 Vue의 인라인
스타일 타입에 포함되지 않는다. 그래서 `--carousel-items`를 인라인으로 주려면 캐스트가 필요하다. 아래 프레임워크
예제에 그 형태가 있다. 변수를 스타일시트에 두면 캐스트가 아예 없어지고, 반응형 규칙이 어차피 거기 있어야 하므로
그쪽이 더 나은 기본값이다.

저장소 자체는 두 단계로 타입을 검사한다. `pnpm typecheck`은 소스를, `pnpm typecheck:dist`는 빌드한 뒤
생성된 선언 파일에 대고 `test/types/consumer.ts`를 컴파일한다. 두 번째가 **npm에서 설치한 사람에게만 깨지는**
공개 타입을 잡아낸다.

## 마크업

항상 두 요소다:

```html
<div data-carousel>
  <ul data-carousel-scroller>
    <li>…</li>
    <li>…</li>
  </ul>
</div>
```

## 설정

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

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--carousel-items` | `1` | 한 화면 아이템 수. 소수 허용 |
| `--carousel-gap` | `0px` | 아이템 간격 (단위 필수) |
| `--carousel-align` | `start` | `scroll-snap-align` 값 |
| `--carousel-snap` | `mandatory` | 스냅 강도 |
| `--carousel-scrollbar` | `none` | `auto`로 네이티브 스크롤바 표시 |
| `--carousel-page-block` | `20rem` | 페이지 모드에서 한 페이지의 높이. 줄 수가 여기서 정해진다 |

버튼·마커·썸네일의 외형은 `--carousel-button-*`, `--carousel-marker-*`, `--carousel-thumb-*`로 조정한다.
전체 목록은 `dist/carousel.css`를 참고한다 (패키지가 실제로 배포하는 파일. `src/carousel.css`는 `files`에
포함되지 않는다).

| 속성 | 위치 | 용도 |
|---|---|---|
| `data-carousel-axis` | 루트 | `inline`(기본) 또는 `block` |
| `data-carousel-loop` | 루트 | 무한 loop. 3세트를 직접 렌더한다면 `="manual"` |
| `data-carousel-autoplay="4000"` | 루트 | ms 단위 자동 넘김. hover·포커스·화면 밖에서 일시정지, 사용자 입력(wheel/pointerdown)에 영구 정지 |
| `data-carousel-autoplay-resume="5000"` | 루트 | 영구 정지 대신 마지막 입력으로부터 그만큼 지나면 재시작. 생략하면 영구 정지 유지 |
| `data-carousel-thumbs="#strip"` | 루트 | 썸네일 carousel과 연동 |
| `data-carousel-effect` | 루트 | `fade`, `scale`, `reveal` (`effects.css` 필요, 아래 참고) |
| `data-carousel-counter` | 루트 | 모서리에 `n / total` 카운터 표시. 아래 참고 |
| `data-carousel-pages` | 루트 | 평평한 목록을 한 장씩이 아니라 한 화면씩 넘긴다. 아래 참고 |
| `data-carousel-label-prev` / `-next` | 루트 | 폴백 버튼의 접근 이름. 기본값 `Previous` / `Next` |
| `data-carousel-label` | 슬라이드 | 폴백 경로 전용. 해당 슬라이드 마커의 접근 이름. 기본값은 1부터 세는 순번 |

## 테마

`carousel.css`는 구조와 중립적인 기본값이다 — 레이아웃을 잡고 버튼·마커에 모양을 줄 뿐 그 이상은 하지 않는다.
테마는 그 위에 올려 완성된 모양을 만드는 두 번째 스타일시트다. 하나가 함께 배포된다:

```ts
import 'snapstrip/carousel.css';
import 'snapstrip/themes/basic.css'; // 선택
// 또는: import 'snapstrip/themes/progress.css';
```

테마는 두 개가 함께 배포된다. `basic`은 완성된 모양이고, `progress`은 크롬을 걷어낸 구성이다.

### basic

`basic`은 기본값이 의도적으로 하지 않는 세 가지를 한다:

- **마커를 흐름에서 빼내** 미디어 아래쪽에 겹쳐 놓는다. 좌/우 화살표가 카드 세로 중앙에 오는 것도 이것
  덕분이다. 기본 상태에서는 마커 줄이 스크롤러 아래에 놓여 wrapper가 미디어보다 높아지고, wrapper의 50%에
  놓이는 화살표가 카드 중심보다 아래로 내려간다. 마커를 겹치면 wrapper와 미디어가 같은 박스가 된다.
- **실제 이미지 위에서도 마커가 읽히게** 한다 — 어두운 미디어에서 사라지는 기본값(반투명 검정) 대신
  어두운 테두리를 두른 흰 점을 쓴다.
- **비활성 화살표를 흐리게 두지 않고 완전히 숨기고**, hover와 blur 처리를 더한다.

### progress

`progress`은 화살표가 눈에 띄지 않기를 바라는, 스와이프 중심 레이아웃에 맞는다:

- **화살표는 hover에서만 나타난다.** 키보드 사용자를 위해 `:focus-within`도 조건에 넣었다.
  규칙 전체가 `@media (hover: hover)` 안에 있다 — 터치 기기에는 hover가 없고,
  보이지 않는데 탭은 되는 버튼은 그냥 보이는 버튼보다 나쁘기 때문이다.
- **마커는 점 대신 넓은 진행 트랙 하나다.** 트랙은 여백 끝에서 카운터 바로 앞까지 뻗고, 조각들이
  간격 없이 그 폭을 고르게 나눠 가진다. 현재 슬라이드까지가 채워지고, 스와이프하는 동안 끊기지 않고
  이어서 차오른다.

  "현재보다 앞의 마커"를 CSS로 고를 방법은 없다 — `:has()`에는 pseudo-element를 넣을 수 없고,
  `:target-current`는 슬라이드가 아니라 마커에 붙는다. 그래서 채움을 조각이 아니라 마커 *그룹*에
  두고, 이름 붙인 스크롤 타임라인으로 폭을 스크롤 진행률에 묶었다. 폴백 그룹은 스크롤러 밖에 있어서
  `timeline-scope`로 이름을 꺼내 준다. 키프레임은 0이 아니라 `--carousel-progress-min`에서 시작한다.
  첫 슬라이드에서 빈 트랙만 보이지 않게 하기 위해서다.

  트랙과 카운터는 같은 모서리에 붙은, 높이가 같은 한 줄(`--carousel-footer-block`)을 공유한다.
  세로 중앙이 맞는 건 그 때문이다. `--carousel-counter-reserve`는 트랙 끝에서 카운터 몫으로 비워
  두는 폭이다.

  Firefox에는 스크롤 타임라인이 없다. `@supports` 가드가 없으면 키프레임이 문서 타임라인에서 달려
  바가 100%에 멈춘 채로 있게 되므로, 그쪽에서는 현재 조각만 `background-position` transition으로
  채우는 방식으로 물러선다. `:dir(rtl)`에서는 양쪽 방향이 모두 뒤집힌다.
- **`n / total` 카운터를 트랙 끝에 앉힌다.** 같은 줄을 공유하게 해서 세로 중앙을 맞춘다. 카운터 자체는
  테마의 일부가 아니라 core의 opt-in이다 — `data-carousel-counter`를 붙여야 켜진다.
  [카운터](#카운터) 참고.

직접 테마를 만드는 것도 같은 작업이다. `dist/themes/basic.css`를 복사해 맨 위 변수 블록만 바꾸고 그걸
import하면 된다. 그 전에 알아둘 규칙 두 가지:

**레이어 안에 두거나, 아예 두지 않거나.** 라이브러리 스타일시트는 `@layer snapstrip` 안에 있다. 같은 레이어에
있는 테마는 소스 순서로 `carousel.css`를 이긴다 — 두 번째로 import하면 된다. 애플리케이션 CSS는 레이어가
없으므로 둘 다 무조건 이긴다. 명시도로 라이브러리와 싸울 일이 없다.

**네이티브 pseudo-element와 그 폴백 클래스를 한 선택자 목록으로 묶지 말 것.** 둘은 한 쌍처럼 보이지만
묶으면 안 된다:

```css
/* ✗ Firefox와 Safari는 이 규칙을 통째로 버린다 — ::scroll-marker-group을 모르고,
      알 수 없는 pseudo-element 하나가 선택자 목록 전체를 무효화한다. */
[data-carousel] > [data-carousel-scroller]::scroll-marker-group,
[data-carousel] > .carousel-markers { position: absolute; }

/* ✓ 규칙 두 개. 각 브라우저가 자기가 아는 쪽을 적용한다. */
[data-carousel] > [data-carousel-scroller]::scroll-marker-group { position: absolute; }
[data-carousel] > .carousel-markers { position: absolute; }
```

`:is()`로도 해결되지 않는다 — pseudo-element를 아예 받지 않는다. 라이브러리가 모든 버튼·마커 규칙을 같은
커스텀 프로퍼티를 읽는 쌍둥이로 유지하는 이유가 이것이다. 변수로 테마를 만들면 이 중복은 라이브러리의
문제로 남고 사용자에게 넘어오지 않는다.

## 명령형 API

auto-init이 붙이는 인스턴스가 표면의 전부다. 설정 객체는 없다 — 레이아웃은 CSS에서, 동작은 `data-*`
속성에서 온다.

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
| `next` / `prev` | `(behavior?: ScrollBehavior) => void` | 양 끝에서 clamp. loop에서는 복제본이 있어 이어진다 |
| `goTo` | `(i: number, behavior?: ScrollBehavior) => void` | 논리 인덱스 |
| `scrollToSlide` | `(i: number, behavior?: ScrollBehavior) => void` | 실제 인덱스 |
| `refresh` | `() => void` | 슬라이드 목록이 바뀐 뒤 다시 관찰 |
| `destroy` / `onDestroy` | `() => void` / `(fn: () => void) => void` | |
| `Carousel.init` | `(root: HTMLElement) => Carousel` | 멱등 — 이미 있으면 기존 인스턴스를 반환 |
| `Carousel.initAll` | `(scope?: ParentNode) => void` | |

## Loop

`data-carousel-loop`은 슬라이드를 3세트로 복제하고 `scrollend`에 스크롤 위치를 가운데로 되돌린다.
추가 DOM 노드는 라이브러리가 소유한다.

프레임워크가 슬라이드 목록을 소유한다면(React·Vue·Angular가 상태에서 다시 렌더하는 경우) 복제본이
reconciliation과 충돌한다. 그때는 `data-carousel-loop="manual"`을 쓰고 아이템 목록을 정확히 3벌 직접
렌더한다 — 라이브러리는 위치만 되돌리고 복제하지 않는다. 가운데 세트만 진짜이므로, 첫째와 셋째 세트에는
라이브러리가 자동 복제본에 붙이는 것과 같이 `aria-hidden="true"`와 `inert`를 표시한다. 그래야 보조기기와
탭 순서가 한 세트만 보게 된다:

```html
<div data-carousel data-carousel-loop="manual">
  <ul data-carousel-scroller>
    <!-- 1세트 (복제) --><li aria-hidden="true" inert>1</li><li aria-hidden="true" inert>2</li><li aria-hidden="true" inert>3</li>
    <!-- 2세트 (진짜) --><li>1</li><li>2</li><li>3</li>
    <!-- 3세트 (복제) --><li aria-hidden="true" inert>1</li><li aria-hidden="true" inert>2</li><li aria-hidden="true" inert>3</li>
  </ul>
</div>
```

manual 모드에서 슬라이드 수가 3의 배수가 아니면 예외를 던진다.

## Autoplay

`data-carousel-autoplay="<ms>"`는 일정 간격으로 넘긴다. 기본적으로 사용자에게 양보한다 — 포인터가 carousel
위에 있는 동안, 포커스가 안에 있는 동안, 화면 밖으로 스크롤된 동안 멈추고, `prefers-reduced-motion: reduce`
에서는 아예 시작하지 않는다.

사용자가 실제로 개입하면 — 휠 제스처, 포인터 누름, 화살표 버튼 — autoplay는 영구히 멈춘다. 이게 안전한
기본값이다. 읽는 사람이 만지고 있는 내용이 다시 저절로 움직이기 시작하면 안 된다.

읽는 대상이라기보다 장식에 가까운 carousel이라면 `data-carousel-autoplay-resume="<ms>"`가 그 영구 정지를
일시정지로 바꾼다. 입력이 들어올 때마다 카운트다운이 다시 시작되므로, 사용자가 그 시간만큼 조용히 있어야
다시 돈다:

```html
<div data-carousel data-carousel-autoplay="4000" data-carousel-autoplay-resume="8000">
```

재시작 지연은 autoplay 간격보다 넉넉히 길게 잡는다. 짧으면 읽는 사람과 주도권을 계속 다투는 carousel이 된다.

포커스는 의도적으로 두 가지로 나눠 다룬다. carousel 안 어디든 **키보드 포커스**가 있으면 그동안 autoplay는
멈춘다 — 키보드로 읽는 사람 밑에서 내용이 움직여서는 안 되고, 이건 재시작 설정과 무관하다. 하지만 화살표나
점을 **마우스로 클릭**하면 브라우저에 따라 그 컨트롤에 포커스가 남는데, 그것까지 "읽는 중"으로 보면 autoplay가
영영 재시작하지 않는다. 그래서 라이브러리 자신의 컨트롤에 한해서만 일시정지 판정이 일반 포커스가 아니라
`:focus-visible`을 따른다.

## 이펙트

scroll-driven 장식 프리셋 3종 — `fade`, `scale`, `reveal` — 이
`animation-timeline: view()`로 슬라이드가 뷰포트에 들어오고 나가는 동안 애니메이션한다. 순수 CSS이고
JavaScript는 0바이트다. 브라우저가 scroll-driven animation을 지원하지 않으면 이펙트만 빠진 채 carousel은
정상 동작한다.

`reveal`만 요소 두 개를 동시에 움직인다. 슬라이드 프레임이 커튼처럼 열리는(`clip-path`) 동안 그 안의
`img`·`video`·`picture`·`svg`가 반대 방향으로 이동해, 프레임만 지나가고 미디어는 제자리에 있는 것처럼
보인다. 미디어가 없는 슬라이드에서는 와이프만 남는다. `clip-path`의 inset과 `translate`는 물리 축이라,
`reveal`은 스크롤 방향과 어긋나게 와이프하느니 `data-carousel-axis="block"`에서 비활성화된다.

`reveal`은 `--carousel-items: 1`에 `--carousel-gap: 0`일 때 가장 잘 읽힌다. 커튼 은유가 전제하는 설정이다.
라이브러리가 강제하지는 않는다 — 간격이 있어도 동작하지만, 프레임 사이로 페이지 배경이 보여서 하나로 이어진
필름이 아니라 분리된 카드처럼 읽힌다.

이펙트는 `effects.css`에 있고 기본 레이아웃과 따로 import한다:

```ts
import 'snapstrip/carousel.css';
import 'snapstrip/effects.css';
```

```html
<div data-carousel data-carousel-effect="scale">
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

`prefers-reduced-motion: reduce`에서는 자동으로 비활성화된다.

## 카운터

`data-carousel-counter`를 붙이면 `n / total` 배지가 나온다. CSS counter와 scroll-driven animation만으로
만들어서 JavaScript도, 추가 스타일시트도 필요 없다 — `carousel.css` 안에 있고, 요청하기 전까지는 꺼져 있다.

```html
<div data-carousel data-carousel-counter>
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

`--carousel-counter-inset`, `--carousel-counter-color`, `--carousel-counter-bg`로 모양을 바꾸거나,
`[data-carousel-counter] > [data-carousel-scroller]::after`를 덮어써서 위치를 옮긴다. `progress` 테마가
바로 그렇게 해서 진행 바 끝에 앉힌다.

루트가 아니라 스크롤러를 겨냥하는 건 일부러다. `container-type: inline-size`는 — 아이템 수를 반응형으로
만드는 권장 방법이다 — `contain: style`을 함의하고, 그러면 슬라이드의 `counter-increment`가 루트에서
분리된 스코프로 갇혀 루트에 그린 카운터는 `0 / 0`을 읽는다. 리셋·증가·출력을 모두 스크롤러 안에 두면 한
스코프가 된다. 배지는 루트를 기준으로 absolute 배치되므로 스크롤러의 overflow에 잘리지도, 스크롤을 따라
움직이지도 않는다.

알아둘 것 두 가지.

**슬라이드가 스크롤포트에 완전히 들어온 순간에 센다.** 절반에서 세면 `--carousel-items`가 1보다 클 때
옆에 걸쳐 보이는 슬라이드까지 미리 세어, 앞 카드가 `04`인데 `5 / 6`이 된다.

**Firefox에서는 아무것도 안 나온다.** `animation-timeline` 지원이 없으면 타임라인 없는 애니메이션이 곧바로
채워져 모든 슬라이드가 자기를 센다 — 첫 슬라이드에서 `5 / 5`가 나온다. 틀린 숫자가 없는 숫자보다 나쁘므로
전체를 `@supports (animation-timeline: view())` 안에 두었다.

카운터와 이펙트 프리셋은 둘 다 슬라이드를 애니메이션한다 — `animation-name`이라는 같은 자리다.
`carousel.css`가 `effects.css`보다 먼저 로드되므로, 둘을 함께 살리는 규칙은 import 순서가 아니라
`[data-carousel-counter]` 게이트가 얹어주는 특이도에 기댄다.

## 페이지

`data-carousel-pages`를 붙이면 한 장씩이 아니라 한 화면씩 넘긴다. 마크업은 평평한 목록 그대로다 —
브라우저가 multicol로 나누므로 작성자가 목록을 끊을 필요가 없다.

```html
<div data-carousel data-carousel-pages class="grid">
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

```css
.grid {
  --carousel-items: 3;        /* 한 줄에 셋 */
  --carousel-gap: 0.75rem;
  --carousel-page-block: 20rem;
}
```

줄 수는 높이가 정한다. `--carousel-page-block`을 한 줄 높이로 나눈 만큼 들어간다. 한 줄에 셋,
두 줄이 들어가는 높이면 페이지당 여섯이다 — Swiper의 `grid` 배치를 grid 옵션 없이 얻는다.

스크롤은 페이지 경계에서만 멈춘다. 스냅 대상은 페이지 하나뿐이고 슬라이드 쪽 정렬은 꺼 둔다 —
안 그러면 드래그가 카드 경계에 멈춰 앞 페이지 끝과 다음 페이지 앞이 한 화면에 섞인다. `::column`이
없는 브라우저에는 스냅 대상 자체가 없으므로, 폴백 스크립트가 스크롤이 멈춘 뒤 가장 가까운 페이지로
맞춘다.

그 뒤로는 전부 슬라이드가 아니라 페이지를 따른다. 마커는 페이지마다 하나이고, 되는 브라우저에서는
`::column`에 브라우저가 만들며 폴백 스크립트도 같은 수를 만든다. `next()`·`prev()`·`goTo()`는 한
페이지씩 움직이고 `index`는 페이지 번호다. `pageCount`는 브라우저가 몇 페이지로 나눴는지를 레이아웃에서
되읽는 값이라 크기가 바뀌면 따라온다.

알아둘 한계 둘. 이 모드에서는 카운터를 내지 않는다 — CSS counter는 슬라이드가 올리는데 세어야 할 것은
페이지라 `1 / 2` 대신 `1 / 12`가 나온다. 그리고 아이템은 flex가 아니라 float다. 컬럼 안은 일반
흐름이라 가로로 늘어놓으려면 inline-level이거나 float여야 하는데, inline-level은 태그 사이 줄바꿈
공백이 한 줄에 한 자리를 먹는다.

## Marquee

marquee는 carousel이 아니다 — 스크롤 컨테이너도, 스와이프도, 스냅도, 버튼도, 마커도, JS도 없다.
`effects.css`에 같이 들어 있는 순수 CSS 띠다. 스크롤 컨테이너가 없으니 라이브러리가 대신 복제해줄 수도
없다. 아이템을 마크업에서 한 벌 직접 복제하고 사본에 `aria-hidden="true"`를 붙인다:

```ts
import 'snapstrip/effects.css';
```

```html
<div data-carousel-marquee>
  <ul data-carousel-marquee-track>
    <li>A</li><li>B</li><li>C</li>
    <li aria-hidden="true">A</li><li aria-hidden="true">B</li><li aria-hidden="true">C</li>
  </ul>
</div>
```

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--carousel-marquee-duration` | `20s` | 한 바퀴 도는 시간 |
| `--carousel-marquee-gap` | `1rem` | 아이템 간격 |

hover와 포커스에서, 그리고 `prefers-reduced-motion: reduce`에서 멈춘다.

## 프레임워크에서 쓰기

**React**

```tsx
import type { CSSProperties } from 'react';
import 'snapstrip/carousel.css';
import 'snapstrip';

interface Item {
  id: string;
  title: string;
}

// 커스텀 프로퍼티는 CSSProperties에 없어서 인라인 스타일 객체에는 캐스트가 필요하다.
const layout = { '--carousel-items': 2.5, '--carousel-gap': '1rem' } as CSSProperties;

export function Gallery({ items }: { items: Item[] }) {
  return (
    <div data-carousel style={layout}>
      <ul data-carousel-scroller>
        {items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Vue**

```vue
<script setup lang="ts">
import 'snapstrip/carousel.css';
import 'snapstrip';

defineProps<{ items: { id: string; title: string }[] }>();
</script>

<template>
  <div data-carousel :style="{ '--carousel-items': 2.5, '--carousel-gap': '1rem' }">
    <ul data-carousel-scroller>
      <li v-for="item in items" :key="item.id">{{ item.title }}</li>
    </ul>
  </div>
</template>
```

**Angular**

```ts
@Component({
  selector: 'app-gallery',
  template: `
    <div data-carousel [style]="{ '--carousel-items': 2.5, '--carousel-gap': '1rem' }">
      <ul data-carousel-scroller>
        <li *ngFor="let item of items">{{ item.title }}</li>
      </ul>
    </div>
  `,
})
export class GalleryComponent {
  items: { id: string; title: string }[] = [];
}
```

`snapstrip`은 진입 파일에서 한 번만 import한다. DOM에 새로 추가된 carousel은 자동으로 잡히고, 제거된 것은
리스너를 정리한다 — 이 부분은 테스트로 검증돼 있다. 다만 **이미 마운트된 carousel 안에서** 아이템 목록이
바뀌는 것은 자동이 아니다. DOM이 안정된 뒤 `carousel.refresh()`를 불러야 현재 인덱스 추적이 새 슬라이드를
인식한다. JS 폴백을 함께 쓰고 있다면, 폴백의 버튼·마커는 init 시점에 한 번 만들어지고 `refresh()`로는
다시 만들어지지 않는다는 점에 주의한다 — 이미 마운트된 폴백 carousel의 아이템 수를 바꾸지 말거나,
`carousel.destroy()` 후 `Carousel.init(root)`로 처음부터 다시 만든다.

## 브라우저 지원

`::scroll-button()`과 `::scroll-marker()`는 Chromium 135+에 들어 있다. 거기서는 브라우저가 직접 마커
그룹을 `tablist`로 노출하고 키보드 탐색을 처리한다 — 라이브러리는 DOM을 전혀 건드리지 않는다. 그 외
환경에서는 선택적 스크립트가 같은 `role="tablist"` / `role="tab"`과 ARIA 상태를 갖춘 버튼과 점을 만든다.
스와이프·스냅·관성은 모든 브라우저에서 네이티브 스크롤이다. Firefox와 Safari가 이 primitive를 출시할수록
코드 변경 없이 더 많은 사용자가 네이티브·무JS 경로로 옮겨간다.

## 알려진 한계

- RTL은 기본 설정(한 화면 한 장)에서 동작하며 `data-carousel-loop`도 포함한다. 테스트로 검증돼 있다.
  아래 항목들은 명시된 특정 조합에만 해당하고 RTL 전반에 해당하지 않는다.
- peek은 비율(`--carousel-items`의 소수부)이지 고정 픽셀이 아니다. 픽셀이 필요하면 아이템의 `flex-basis`를
  직접 덮어쓴다.
- 브레이크포인트마다 축을 바꾸려면 `flex-direction` / `scroll-snap-type`을 직접 덮어써야 한다 —
  `flex-direction`은 단일 커스텀 프로퍼티로 분기할 수 없다.
- 블록 축 carousel(`data-carousel-axis="block"`)은 스크롤러에 확정된 `block-size`가 필요하다.
  `flex-basis`의 `100%`가 flex 컨테이너의 주축 크기를 기준으로 풀리는데, 그 값이 기본적으로 auto이기 때문이다.
- `--carousel-snap: none`은 지원하지 않는다. `scroll-snap-type: none`을 직접 선언한다.
- 한 화면에 여러 아이템이 보일 때, 뒤쪽 아이템들은 스크롤 중간에 정렬 지점에 올 수 없다. 라이브러리는
  스크롤 양 끝에서 첫 아이템 또는 마지막 아이템으로 해석해 Chromium의 네이티브 동작과 맞춘다.
- 네이티브 `::scroll-marker`에는 현재 접근 이름을 줄 수 없다. `data-carousel-label`은 폴백 경로에서만
  읽는다. 네이티브 마커의 이름은 CSS `content`에서 오는데 기본값이 `''`라, Chromium은 이름 없는 tab을 노출한다.
- RTL + `--carousel-align: start`/`end` + 한 화면 여러 아이템이 겹치는 경우: JS의 인덱스 추적은 슬라이드의
  물리적 `getBoundingClientRect().left`를 읽는데 CSS `scroll-snap-align` 값은 논리적으로 유지된다. RTL에서
  둘이 어긋나므로 추적된 인덱스와 실제로 스냅된 아이템이 다를 수 있다.
- RTL marquee(`data-carousel-marquee`)는 키프레임에 적힌 물리 방향으로 흐르지, 논리(읽기 순서) 방향으로
  흐르지 않는다 — `dir="rtl"`에서는 반대로 움직인다.
- loop(`data-carousel-loop`) carousel에 `refresh()`를 부르면 `setSize`를 다시 계산하지도, 복제 세트를
  건드리지도 않는다. 슬라이드 수가 바뀌었다면 `carousel.destroy()` 후 `Carousel.init(root)`을 쓴다.

## 라이선스

MIT
