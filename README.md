# css-carousel

A carousel built on the CSS carousel primitives — `scroll-snap`, `::scroll-button()` and `::scroll-marker()`.
Zero JavaScript where the browser supports them. An optional script (measured under 8KB gzip) fills the
gap everywhere else with matching buttons, markers, keyboard navigation and `tablist` accessibility.

Works with React, Vue, Angular, Svelte or plain HTML. There is no framework wrapper to install,
because there is nothing framework-specific to wrap.

## Demo

```bash
git clone https://github.com/chanungdev/css-carousel.git && cd css-carousel
npm install
node scripts/serve.js   # http://localhost:5173/demo/index.html
```

The demo loads `src/` directly, so there is nothing to build. It shows the responsive item count,
fractional peek, loop, autoplay, thumbnail sync, the block axis, all five effect presets and the
marquee. A badge at the top reports which path the browser took — open the same page in Chrome and in
Safari to see the native and fallback paths side by side.

## Install

```bash
npm install css-carousel
```

```js
import 'css-carousel/carousel.css';
import 'css-carousel'; // optional — only needed for Firefox/Safari support and the JS API
```

The package is ESM-only (`"type": "module"`, no CommonJS build). `require('css-carousel')` fails —
use `import` or a dynamic `import()`.

## Markup

Two elements, always:

```html
<div data-carousel>
  <ul data-carousel-scroller>
    <li>…</li>
    <li>…</li>
  </ul>
</div>
```

## Configuration

Layout is CSS. Responsiveness is CSS. There is no JavaScript options object.

```css
.my-carousel {
  --carousel-items: 2.5;   /* fractional values create a peek */
  --carousel-gap: 1rem;
  --carousel-align: center;
}

@container (min-width: 40em) {
  .my-carousel { --carousel-items: 4; }
}
```

| Variable | Default | Purpose |
|---|---|---|
| `--carousel-items` | `1` | Items per view. Fractions allowed |
| `--carousel-gap` | `0px` | Gap between items (unit required) |
| `--carousel-align` | `start` | `scroll-snap-align` value |
| `--carousel-snap` | `mandatory` | Snap strictness |
| `--carousel-scrollbar` | `auto` | Set to `none` to hide the scrollbar |

Button, marker and thumbnail appearance is themed through `--carousel-button-*`, `--carousel-marker-*`
and `--carousel-thumb-*`. See `dist/carousel.css` (the file this package actually publishes — `src/carousel.css`
is not included in `files`) for the full list.

| Attribute | Where | Purpose |
|---|---|---|
| `data-carousel-axis` | root | `inline` (default) or `block` |
| `data-carousel-loop` | root | Infinite loop. Use `="manual"` when you pre-render exactly three sets yourself |
| `data-carousel-autoplay="4000"` | root | Auto-advance in ms. Pauses on hover, focus and visibility loss; stops permanently on user input (wheel/pointerdown) |
| `data-carousel-thumbs="#strip"` | root | Sync with a thumbnail carousel |
| `data-carousel-effect` | root | `fade`, `scale`, `coverflow`, `depth` or `curve` (needs `effects.css`, see below) |
| `data-carousel-label-prev` / `-next` | root | Accessible names for the fallback buttons. Default `Previous` / `Next` |
| `data-carousel-label` | a slide | Fallback-path only. Accessible name for that slide's marker. Default is the slide's 1-based position |

## JavaScript API

```js
const carousel = document.querySelector('[data-carousel]').carousel;
carousel.next();
carousel.goTo(3);

document.addEventListener('carousel:change', (e) => console.log(e.detail.index));
```

## Loop

`data-carousel-loop` clones your slides into three sets and recenters the scroll position on
`scrollend`, so the library owns the extra DOM nodes.

If a framework owns the slide list (React, Vue, Angular re-rendering from state), clones fight the
framework's reconciliation. Use `data-carousel-loop="manual"` instead and render exactly three copies
of your item list yourself — the library only recenters, it never clones. Only the middle set is real;
mark the first and third as duplicates with `aria-hidden="true"` and `inert`, the same way the library
marks its own auto-generated clones, so assistive tech and tab order only ever see one set:

```html
<div data-carousel data-carousel-loop="manual">
  <ul data-carousel-scroller>
    <!-- set 1 (복제) --><li aria-hidden="true" inert>1</li><li aria-hidden="true" inert>2</li><li aria-hidden="true" inert>3</li>
    <!-- set 2 (진짜) --><li>1</li><li>2</li><li>3</li>
    <!-- set 3 (복제) --><li aria-hidden="true" inert>1</li><li aria-hidden="true" inert>2</li><li aria-hidden="true" inert>3</li>
  </ul>
</div>
```

A slide count not divisible by three throws in manual mode.

## Effects

Five scroll-driven, decorative-only presets — `fade`, `scale`, `coverflow`, `depth`, `curve` — animate
slides as they enter and leave the viewport using `animation-timeline: view()`. They are pure CSS: 0
bytes of JavaScript, and the carousel works normally if the browser doesn't support scroll-driven
animations.

They live in `effects.css`, imported separately from the base layout:

```js
import 'css-carousel/carousel.css';
import 'css-carousel/effects.css';
```

```html
<div data-carousel data-carousel-effect="coverflow">
  <ul data-carousel-scroller>
    <li>…</li>
  </ul>
</div>
```

Effects are disabled automatically under `prefers-reduced-motion: reduce`.

## Marquee

A marquee is not a carousel — there's no scroll container, no swipe, no snap, no buttons, no markers,
no JS. It's a pure-CSS looping ticker that also ships in `effects.css`. Because there's no scroll
container, the library can't clone anything for you; duplicate your items in markup once, with
`aria-hidden="true"` on the copies:

```js
import 'css-carousel/effects.css';
```

```html
<div data-carousel-marquee>
  <ul data-carousel-marquee-track>
    <li>A</li><li>B</li><li>C</li>
    <li aria-hidden="true">A</li><li aria-hidden="true">B</li><li aria-hidden="true">C</li>
  </ul>
</div>
```

| Variable | Default | Purpose |
|---|---|---|
| `--carousel-marquee-duration` | `20s` | Time for one full loop |
| `--carousel-marquee-gap` | `1rem` | Gap between items |

The animation pauses on hover and focus, and under `prefers-reduced-motion: reduce`.

## Framework usage

**React**

```jsx
import 'css-carousel/carousel.css';
import 'css-carousel';

export function Gallery({ items }) {
  return (
    <div data-carousel style={{ '--carousel-items': 2.5, '--carousel-gap': '1rem' }}>
      <ul data-carousel-scroller>
        {items.map((item) => <li key={item.id}>{item.title}</li>)}
      </ul>
    </div>
  );
}
```

**Vue**

```vue
<script setup>
import 'css-carousel/carousel.css';
import 'css-carousel';
defineProps(['items']);
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
export class GalleryComponent {}
```

Import `css-carousel` once in your entry file. New carousels added to the DOM are picked up
automatically, and removed ones clean up their listeners — that part is tested. Changing the item
list *inside* an already-mounted carousel is not automatic: call `carousel.refresh()` after the DOM
settles so the current-index tracking picks up the new slides. If you're also using the JS fallback,
note that its buttons/markers are built once at init and don't currently rebuild on `refresh()` — avoid
changing item counts on an already-mounted fallback carousel, or call `carousel.destroy()` followed by
`Carousel.init(root)` to rebuild it from scratch.

## Browser support

`::scroll-button()` and `::scroll-marker()` ship in Chromium 135+. There, the browser itself exposes the
marker group as a `tablist` and handles keyboard navigation — the library never touches the DOM.
Everywhere else, the optional script builds equivalent buttons and dots with matching `role="tablist"` /
`role="tab"` and ARIA state. Swipe, snap and momentum are native scrolling in all browsers. As Firefox
and Safari ship the primitives, more of your users move onto the native, zero-JS path with no code change.

## Known limits

- RTL works in the default single-item-per-view configuration, including `data-carousel-loop`, which
  is covered by a test. The limits below apply to the specific combinations listed, not to RTL generally.
- Peek is proportional (a fraction of `--carousel-items`), not a fixed pixel amount. Override
  `flex-basis` on the items if you need pixels.
- Switching axis per breakpoint needs a manual `flex-direction` / `scroll-snap-type` override —
  `flex-direction` can't branch off a single custom property.
- A block-axis carousel (`data-carousel-axis="block"`) needs a definite `block-size` on the scroller.
  `flex-basis`'s `100%` resolves against the flex container's inner main size, which is otherwise auto.
- `--carousel-snap: none` is not supported. Declare `scroll-snap-type: none` directly instead.
- With several items per view, the trailing items can't become the aligned item mid-scroll. The library
  matches Chromium's native behavior by resolving to the first or last item at the scroll extremes.
- Native `::scroll-marker`s cannot currently be given an accessible name. `data-carousel-label` is read
  only by the fallback path; the native marker's name comes from CSS `content`, which defaults to `''`,
  so Chromium exposes unnamed tabs.
- RTL, `--carousel-align: start`/`end`, and several items per view together: the JS index tracking reads
  the slide's physical `getBoundingClientRect().left`, while the CSS `scroll-snap-align` value stays
  logical. The two disagree in RTL, so the tracked index and the actually-snapped item can differ.
- RTL marquees (`data-carousel-marquee`) scroll in the physical direction the keyframes were written in,
  not the logical (reading-order) direction — so a marquee under `dir="rtl"` moves the wrong way.
- `refresh()` on a looping (`data-carousel-loop`) carousel does not recompute `setSize` or touch the
  clone sets. If the slide count changes, call `carousel.destroy()` followed by `Carousel.init(root)`
  instead.

## License

MIT
