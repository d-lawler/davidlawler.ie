# davidlawler.ie

[davidlawler.ie](https://davidlawler.ie).

Built with [Nuxt](https://nuxt.com), [GSAP](https://gsap.com) and SCSS.

## How the morph works

Most text transitions fade one block out and the next one in. This one treats
the copy as a sequence of words and works out what actually changed.

1. **Tokenise.** [`app/utils/morph.ts`](app/utils/morph.ts) splits each version
   of the copy into word tokens. Links are tokens too (`{rad}` and `{email}`
   placeholders in the source string), so they travel with the text.
2. **Diff.** `morph()` runs a longest-common-subsequence match between the
   current words and the next ones. Words found in both keep their id, so Vue
   keeps the same DOM node; everything else is marked `fresh` with a new id.
3. **Animate.** [`app/pages/index.vue`](app/pages/index.vue) then does three
   things on one GSAP timeline:
   - **Leaving words** are cloned into an absolutely positioned layer at the
     spot they stood, so the live paragraph can reflow underneath them while
     the clones animate out.
   - **Kept words** glide to their new positions with GSAP's
     [Flip](https://gsap.com/docs/v3/Plugins/Flip/) plugin.
   - **New words** each pick a random entrance (rise out of a blur, hinge up
     off the baseline, letters converging from a scatter, typing on…) and a
     random start time, so the paragraph assembles itself all over at once
     instead of sweeping left to right.

Words whose entrance animates individual letters are split into `.char` spans;
the letters are hidden from screen readers, which read the whole word instead.
With `prefers-reduced-motion`, the text swaps without animation.

## Running it

Needs Node 22 and pnpm.

```sh
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm lint
pnpm typecheck
```

## Fonts

The site is set in Neue Haas Display and Items, used under their own licences.
They are not in this repo and not covered by its MIT licence.

`pnpm build` and `pnpm generate` run `scripts/fetch-fonts.sh` first, which
copies them in from a private repo when a `FONTS_TOKEN` is set (as it is on
the host). Without it the site builds with fallback fonts. To use your own,
put `.woff2` files in `public/fonts/` with the names `app/assets/scss/_fonts.scss` expects.

## Licence

Code is [MIT](LICENSE). The fonts and the written copy are not covered.
