# snapstrip

A carousel built on the CSS carousel primitives — `scroll-snap`, `::scroll-button()` and `::scroll-marker()`.
Zero JavaScript where the browser supports them. An optional script (measured under 8KB gzip) fills the
gap everywhere else with matching buttons, markers, keyboard navigation and `tablist` accessibility.

Works with React, Vue, Angular, Svelte or plain HTML. There is no framework wrapper to install,
because there is nothing framework-specific to wrap.

## Demo

```bash
git clone https://github.com/chanungdev/snapstrip.git && cd snapstrip
pnpm install            # this repo uses pnpm; `corepack enable` picks up the pinned version
node scripts/serve.js   # http://localhost:5173/demo/index.html
```

The demo loads `src/` directly — the dev server transpiles TypeScript on the fly, so there is nothing
to build and no watch process to keep running. It shows the responsive item count,
fractional peek, loop, autoplay, thumbnail sync, the block axis, all six effect presets and the
marquee. A badge at the top reports which path the browser took — open the same page in Chrome and in
Safari to see the native and fallback paths side by side.

## Install

```bash
npm install snapstrip
```

```ts
import 'snapstrip/carousel.css';
import 'snapstrip/themes/basic.css'; // optional — a finished look, see Themes below
import 'snapstrip'; // optional — only for Firefox/Safari support and the imperative API
```

The package is ESM-only (`"type": "module"`, no CommonJS build). `require('snapstrip')` fails —
use `import` or a dynamic `import()`.

## TypeScript

The library is written in TypeScript and ships its own declarations — nothing to install from
DefinitelyTyped. Importing it also registers two global augmentations, so the DOM knows about the
carousel without any casting:

```ts
import { Carousel } from 'snapstrip';

const root = document.querySelector<HTMLElement>('[data-carousel]');

// auto-init attaches the instance; the property is typed as Carousel | undefined
root?.carousel?.goTo(2);

// the event's detail is typed, on an element or on document
document.addEventListener('carousel:change', (event) => {
  console.log(event.detail.index, event.detail.slideIndex);
});
```

Exported types: `Carousel`, `CarouselChangeDetail`, `CarouselAxis`, `ResolveCarousel`.

One friction point worth knowing before you hit it: CSS custom properties are not part of React's
`CSSProperties` or Vue's inline-style types, so setting `--carousel-items` inline needs a cast. The
framework snippets below show it. Setting the variables in a stylesheet instead avoids the cast
entirely, and is the better default anyway — that is where the responsive rules live.

The repo itself typechecks in two passes: `pnpm typecheck` for the sources, and `pnpm typecheck:dist`
which builds and then compiles `test/types/consumer.ts` against the emitted declarations. The second
one is what catches a public type that only breaks for people installing from npm.

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
| `data-carousel-autoplay-resume="5000"` | root | Resume that many ms after the last user input instead of stopping for good. Omit to keep the permanent stop |
| `data-carousel-thumbs="#strip"` | root | Sync with a thumbnail carousel |
| `data-carousel-effect` | root | `fade`, `scale`, `coverflow`, `depth`, `curve` or `reveal` (needs `effects.css`, see below) |
| `data-carousel-label-prev` / `-next` | root | Accessible names for the fallback buttons. Default `Previous` / `Next` |
| `data-carousel-label` | a slide | Fallback-path only. Accessible name for that slide's marker. Default is the slide's 1-based position |

## Themes

`carousel.css` is structure plus neutral defaults — it lays the carousel out and gives the buttons and
markers a shape, nothing more. A theme is a second stylesheet that turns that into a finished look.
One ships with the library:

```ts
import 'snapstrip/carousel.css';
import 'snapstrip/themes/basic.css'; // optional
```

`basic` does three things the defaults deliberately don't:

- **Lifts the markers out of flow**, overlaying them on the bottom of the media. This is also what puts
  the arrows on the vertical centre of the card: by default the marker row sits below the scroller, so
  the wrapper is taller than the media and the arrows — placed at 50% of the wrapper — land below the
  card's middle. With the markers overlaid, wrapper and media are the same box.
- **Makes the markers readable on real images** — white dots with a dark ring, rather than the default
  translucent black that disappears on dark media.
- **Hides disabled arrows entirely** instead of fading them, and adds hover and blur treatments.

Writing your own theme is the same exercise. Copy `dist/themes/basic.css`, change the variable block at
the top, and import yours instead. Two rules worth knowing before you do:

**Stay in the layer, or don't.** The library's stylesheets live in `@layer snapstrip`. A theme in the
same layer beats `carousel.css` by source order — import it second. Your application CSS, being
unlayered, beats both regardless, so you never have to fight the library with specificity.

**Never group a native pseudo-element with its fallback class.** These two look like they belong
together and cannot be:

```css
/* ✗ Firefox and Safari drop this whole rule — they don't know ::scroll-marker-group,
      and one unknown pseudo-element invalidates the entire selector list. */
[data-carousel] > [data-carousel-scroller]::scroll-marker-group,
[data-carousel] > .carousel-markers { position: absolute; }

/* ✓ Two rules. Each browser applies the one it understands. */
[data-carousel] > [data-carousel-scroller]::scroll-marker-group { position: absolute; }
[data-carousel] > .carousel-markers { position: absolute; }
```

`:is()` does not rescue this — it refuses pseudo-elements outright. This is why the library keeps every
button and marker rule as a twin pair reading the same custom properties: theme through the variables
and the duplication stays the library's problem, not yours.

## Imperative API

The instance auto-init attaches is the whole surface. There is no options object — layout comes from
CSS, behaviour from `data-*` attributes.

```ts
import type { Carousel } from 'snapstrip';

// querySelector<HTMLElement> matters: the `carousel` property is declared on HTMLElement,
// and plain querySelector returns Element.
const root = document.querySelector<HTMLElement>('[data-carousel]');
const carousel: Carousel | undefined = root?.carousel;

carousel?.next();
carousel?.goTo(3);
carousel?.goTo(3, 'instant'); // behavior is optional, defaults to smooth

document.addEventListener('carousel:change', (event) => {
  console.log(event.detail.index, event.detail.slideIndex);
});
```

| Member | Type | Notes |
|---|---|---|
| `root` / `scroller` | `HTMLElement` | The two elements of the markup contract |
| `axis` | `'inline' \| 'block'` | From `data-carousel-axis` |
| `isInline` | `boolean` | |
| `slides` | `HTMLElement[]` | Every child, loop clones included |
| `items` | `HTMLElement[]` | Logical items — the middle set when looping |
| `index` | `number` | Logical index within one set |
| `slideIndex` | `number` | Raw index into `slides` |
| `setSize` | `number \| null` | Items per set when looping, else `null` |
| `next` / `prev` | `(behavior?: ScrollBehavior) => void` | Clamps at the ends; looping wraps because the clones exist |
| `goTo` | `(i: number, behavior?: ScrollBehavior) => void` | Logical index |
| `scrollToSlide` | `(i: number, behavior?: ScrollBehavior) => void` | Raw index |
| `refresh` | `() => void` | Re-observe after the slide list changes |
| `destroy` / `onDestroy` | `() => void` / `(fn: () => void) => void` | |
| `Carousel.init` | `(root: HTMLElement) => Carousel` | Idempotent — returns the existing instance |
| `Carousel.initAll` | `(scope?: ParentNode) => void` | |

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
    <!-- set 1 (duplicate) --><li aria-hidden="true" inert>1</li><li aria-hidden="true" inert>2</li><li aria-hidden="true" inert>3</li>
    <!-- set 2 (the real one) --><li>1</li><li>2</li><li>3</li>
    <!-- set 3 (duplicate) --><li aria-hidden="true" inert>1</li><li aria-hidden="true" inert>2</li><li aria-hidden="true" inert>3</li>
  </ul>
</div>
```

A slide count not divisible by three throws in manual mode.

## Autoplay

`data-carousel-autoplay="<ms>"` advances on an interval. It yields to the user by default: it pauses
while the pointer is over the carousel, while focus is inside it, and while it is scrolled out of view,
and it never starts at all under `prefers-reduced-motion: reduce`.

Once the user actually takes over — a wheel gesture, a pointer press, an arrow button — autoplay stops
permanently. That is the safe default: content the reader is interacting with should not start moving
again under them.

When a carousel is decorative rather than something to read, `data-carousel-autoplay-resume="<ms>"`
turns that permanent stop into a pause. The countdown restarts on every further input, so it only
resumes after the reader has been idle for the full interval:

```html
<div data-carousel data-carousel-autoplay="4000" data-carousel-autoplay-resume="8000">
```

Pick a resume delay comfortably longer than the autoplay interval. A short one produces a carousel that
keeps wrestling the reader for control.

Focus is treated as two different things on purpose. Keyboard focus anywhere inside the carousel
pauses autoplay for as long as it stays there — someone reading with the keyboard should never have
content move under them, resume delay or not. But a mouse click on an arrow or a dot leaves focus on
that control in some browsers, and treating that as reading would mean autoplay never resumes. So for
the library's own controls only, the pause follows `:focus-visible` rather than plain focus.

## Effects

Six scroll-driven, decorative-only presets — `fade`, `scale`, `coverflow`, `depth`, `curve`, `reveal` —
animate slides as they enter and leave the viewport using `animation-timeline: view()`. They are pure
CSS: 0 bytes of JavaScript, and the carousel works normally if the browser doesn't support
scroll-driven animations.

`reveal` is the only one that animates two elements. The slide's frame opens like a curtain
(`clip-path`) while any `img`, `video`, `picture` or `svg` inside it shifts the opposite way, so the
media looks anchored while the frame slides over it. A slide with no media still gets the wipe. Because
`clip-path` insets and `translate` are physical, `reveal` is disabled on `data-carousel-axis="block"`
rather than wiping across the scroll direction.

`reveal` reads best at `--carousel-items: 1` with `--carousel-gap: 0`, which is what the curtain
metaphor assumes. The library does not force either — a gap still works, it just shows the page
background between frames, so the slides read as separate cards rather than one continuous strip.

They live in `effects.css`, imported separately from the base layout:

```ts
import 'snapstrip/carousel.css';
import 'snapstrip/effects.css';
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

| Variable | Default | Purpose |
|---|---|---|
| `--carousel-marquee-duration` | `20s` | Time for one full loop |
| `--carousel-marquee-gap` | `1rem` | Gap between items |

The animation pauses on hover and focus, and under `prefers-reduced-motion: reduce`.

## Framework usage

**React**

```tsx
import type { CSSProperties } from 'react';
import 'snapstrip/carousel.css';
import 'snapstrip';

interface Item {
  id: string;
  title: string;
}

// Custom properties aren't in CSSProperties, so an inline style object needs a cast.
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

Import `snapstrip` once in your entry file. New carousels added to the DOM are picked up
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
