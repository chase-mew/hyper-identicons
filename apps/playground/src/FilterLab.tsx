import { useMemo, useState } from 'react';
import { identiconUri } from 'hyper-identicons';
import type { CSSProperties } from 'react';

/**
 * A bench for trying unifying treatments over a fixed set of cats.
 *
 * The problem it exists to answer: a wallet picks its background, fur, garment,
 * eyes and hat independently, so any one identicon is a handful of unrelated hues
 * sitting next to each other, and a wall of them is worse. Miniature painters fix
 * exactly this with a wash — one translucent pass over a finished model that drags
 * every colour a little way towards a common one without hiding any of them.
 *
 * Every treatment here is applied per identicon rather than over the whole block,
 * because that is how it would ship. It costs more to render but it is the only
 * honest preview: a vignette or a scanline stretched over sixteen cats looks
 * nothing like sixteen cats that each carry their own.
 */

type Overlay = {
  /** Any CSS background — flat colour, gradient, or a repeating one for texture. */
  background: string;
  blend: CSSProperties['mixBlendMode'];
  opacity: number;
};

/**
 * One effect at some strength. Kept as a list of filter functions rather than a
 * finished string so two effects can be concatenated without either knowing about
 * the other.
 */
type Effect = { filters?: string[]; overlays?: Overlay[] };

const MINT = '#8AF0D2';
const VIGNETTE = 'radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(0,0,0,.55) 100%)';

const round = (value: number) => Number(value.toFixed(3));

/**
 * The building blocks, each written so that `k = 1` reproduces exactly what was on
 * screen when these were picked, and `k = 0` is a no-op. Everything interpolates
 * from the identity value rather than from zero — half of `saturate(0.6)` is 0.8,
 * not 0.3 — which is the only reading of "half strength" that composes.
 *
 * Bloom and chromatic aberration are the exceptions: they are SVG filters and have
 * no numeric dial from CSS, so each ships a second, gentler definition and the
 * dial picks between them.
 *
 * Deliberately not annotated `Record<string, ...>`: that widens the keys and the
 * strict index checks then treat every `FX.mint` as possibly undefined.
 */
const FX = {
  mint: (k = 1): Effect => ({ overlays: [{ background: MINT, blend: 'soft-light', opacity: round(0.55 * k) }] }),

  muted: (k = 1): Effect => ({ filters: [`saturate(${round(1 - 0.4 * k)})`] }),

  faded: (k = 1): Effect => ({
    filters: [`contrast(${round(1 - 0.18 * k)}) brightness(${round(1 + 0.1 * k)}) saturate(${round(1 - 0.22 * k)})`],
    overlays: [{ background: '#FFCC99', blend: 'soft-light', opacity: round(0.35 * k) }],
  }),

  cold: (k = 1): Effect => ({
    filters: [`saturate(${round(1 - 0.45 * k)}) hue-rotate(${round(-12 * k)}deg) brightness(${round(1 - 0.02 * k)})`],
    overlays: [{ background: '#4E7FA8', blend: 'soft-light', opacity: round(0.5 * k) }],
  }),

  sunset: (k = 1): Effect => ({
    overlays: [
      { background: 'linear-gradient(180deg, #FF9E5E 0%, transparent 55%)', blend: 'soft-light', opacity: round(0.75 * k) },
      { background: 'linear-gradient(0deg, #4B4FA8 0%, transparent 55%)', blend: 'soft-light', opacity: round(0.7 * k) },
    ],
  }),

  vignette: (k = 1): Effect => ({ overlays: [{ background: VIGNETTE, blend: 'multiply', opacity: round(k) }] }),

  bleach: (k = 1): Effect => ({
    filters: [`contrast(${round(1 + 0.3 * k)}) saturate(${round(1 - 0.3 * k)}) brightness(${round(1 + 0.06 * k)})`],
    overlays: [{ background: '#F2F7F5', blend: 'soft-light', opacity: round(0.5 * k) }],
  }),

  bloom: (k = 1): Effect => ({ filters: [k > 0.7 ? 'url(#fx-bloom)' : 'url(#fx-bloom-soft)'] }),

  chroma: (k = 1): Effect => ({ filters: [k > 0.7 ? 'url(#fx-chroma)' : 'url(#fx-chroma-soft)'] }),
};

function combine(...effects: Effect[]): Effect {
  return {
    filters: effects.flatMap((effect) => effect.filters ?? []),
    overlays: effects.flatMap((effect) => effect.overlays ?? []),
  };
}

type Treatment = { id: string; name: string; note: string; effect: Effect };

/**
 * The ten that survived the first pass, keeping their original numbers so they can
 * still be named in conversation, followed by combinations.
 */
const TREATMENTS: Treatment[] = [
  { id: 'F01', name: 'Untouched', note: 'baseline, no treatment', effect: {} },
  { id: 'F02', name: 'Mint Wash', note: 'brand teal, soft-light — the miniature painter’s wash', effect: FX.mint() },
  { id: 'F04', name: 'Muted', note: 'desaturate only, no colour added', effect: FX.muted() },
  { id: 'F06', name: 'Faded Film', note: 'lifted blacks, low contrast, warm cast', effect: FX.faded() },
  { id: 'F08', name: 'Cold Steel', note: 'desaturated and pushed blue', effect: FX.cold() },
  { id: 'F09', name: 'Sunset', note: 'warm top, cool bottom — a split tone', effect: FX.sunset() },
  { id: 'F12', name: 'Vignette', note: 'no colour shift, just darkened corners', effect: FX.vignette() },
  { id: 'F16', name: 'Chromatic Soft', note: 'channels split a pixel apart, then bloomed together', effect: combine(FX.chroma(), FX.bloom()) },
  { id: 'F17', name: 'Bloom', note: 'light bleeds out of the bright areas', effect: FX.bloom() },
  { id: 'F25', name: 'Bleach', note: 'desaturated highlights, colour kept in the darks', effect: FX.bleach() },

  // Combinations. The pattern that works is one colour treatment plus one optical
  // one: they act on different things, so neither has to be dialled back much and
  // the result still reads as a single pass. Two colour treatments stacked at full
  // strength just fight, so those are the ones run at half.
  {
    id: 'C01',
    name: 'Mint + Vignette',
    note: 'the wash, plus corners pulled down to frame each cat',
    effect: combine(FX.mint(), FX.vignette(0.7)),
  },
  {
    id: 'C02',
    name: 'Mint + Bloom',
    note: 'wash and glow — softens the hard pixel edges',
    effect: combine(FX.mint(), FX.bloom()),
  },
  {
    id: 'C03',
    name: 'Muted + Mint',
    note: 'half of each: drop the saturation first, then tint what is left',
    effect: combine(FX.muted(0.5), FX.mint(0.5)),
  },
  {
    id: 'C04',
    name: 'Muted + Vignette',
    note: 'no hue shift at all, just less colour and darker edges',
    effect: combine(FX.muted(), FX.vignette(0.7)),
  },
  {
    id: 'C05',
    name: 'Faded + Vignette',
    note: 'the warm low-contrast pass with its corners brought back down',
    effect: combine(FX.faded(), FX.vignette(0.65)),
  },
  {
    id: 'C06',
    name: 'Cold + Bloom',
    note: 'blue cast with the highlights blown out',
    effect: combine(FX.cold(), FX.bloom()),
  },
  {
    id: 'C07',
    name: 'Sunset + Vignette',
    note: 'the split tone, contained',
    effect: combine(FX.sunset(), FX.vignette(0.7)),
  },
  {
    id: 'C08',
    name: 'Bleach + Chromatic',
    note: 'high contrast with the channels just off register',
    effect: combine(FX.bleach(), FX.chroma(0.5)),
  },
  {
    id: 'C09',
    name: 'Mint + Chromatic + Bloom',
    note: 'all three at part strength — F16 with the wash underneath',
    effect: combine(FX.mint(0.6), FX.chroma(0.5), FX.bloom(0.5)),
  },
  {
    id: 'C10',
    name: 'Muted + Faded',
    note: 'half of two tone curves, no optical effect at all',
    effect: combine(FX.muted(0.5), FX.faded(0.5)),
  },
  {
    id: 'C11',
    name: 'Cold + Mint',
    note: 'half of each — two washes pulling the same direction',
    effect: combine(FX.cold(0.5), FX.mint(0.5)),
  },
  {
    id: 'C12',
    name: 'Sunset + Bloom',
    note: 'gradient tone with the glow on top',
    effect: combine(FX.sunset(), FX.bloom()),
  },
  {
    id: 'C13',
    name: 'Bleach + Mint',
    note: 'half of each: bleach the hues out, put one back',
    effect: combine(FX.bleach(0.5), FX.mint(0.5)),
  },
  {
    id: 'C14',
    name: 'Muted + Chromatic + Vignette',
    note: 'thirds of three — the closest to a screen this gets',
    effect: combine(FX.muted(0.5), FX.chroma(0.5), FX.vignette(0.5)),
  },
  {
    id: 'C15',
    name: 'Faded + Bloom',
    note: 'the warm pass with light spilling out of it',
    effect: combine(FX.faded(), FX.bloom()),
  },
  {
    id: 'C16',
    name: 'Everything Quiet',
    note: 'a little of five: mute, warm, wash, glow, vignette',
    effect: combine(FX.muted(0.35), FX.faded(0.35), FX.mint(0.35), FX.bloom(0.5), FX.vignette(0.4)),
  },
];

function randomAddress(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Defined once for the page and referenced by CSS `filter: url(#id)`.
 *
 * `color-interpolation-filters="sRGB"` on every one of them is not optional. SVG
 * filters work in linear RGB by default, which is correct for light and wrong for
 * anything trying to match a designer's expectation of a colour ramp — left alone
 * the bloom blows out and the channel split comes back the wrong brightness.
 */
function FilterDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {/* Split the channels, then screen them back together. */}
        <filter id="fx-chroma" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx="-1.5" dy="0" result="ro" />
          <feOffset in="SourceGraphic" dx="1.5" dy="0" result="bo" />
          <feColorMatrix in="ro" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rc" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gc" />
          <feColorMatrix in="bo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bc" />
          <feBlend in="rc" in2="gc" mode="screen" result="rg" />
          <feBlend in="rg" in2="bc" mode="screen" />
        </filter>

        <filter id="fx-chroma-soft" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx="-0.7" dy="0" result="ro" />
          <feOffset in="SourceGraphic" dx="0.7" dy="0" result="bo" />
          <feColorMatrix in="ro" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rc" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gc" />
          <feColorMatrix in="bo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bc" />
          <feBlend in="rc" in2="gc" mode="screen" result="rg" />
          <feBlend in="rg" in2="bc" mode="screen" />
        </filter>

        <filter id="fx-bloom" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feBlend in="SourceGraphic" in2="blur" mode="screen" />
        </filter>

        <filter id="fx-bloom-soft" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="blur" />
          <feBlend in="SourceGraphic" in2="blur" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}

const CELL = 76;

function Cat({ uri, effect }: { uri: string; effect: Effect }) {
  const filter = effect.filters?.length ? effect.filters.join(' ') : undefined;
  return (
    <span className="fx-cat" style={{ filter, width: CELL, height: CELL }}>
      <img src={uri} width={CELL} height={CELL} alt="" />
      {(effect.overlays ?? []).map((overlay, index) => (
        <span
          key={index}
          className="fx-ov"
          style={{ background: overlay.background, mixBlendMode: overlay.blend, opacity: overlay.opacity }}
        />
      ))}
    </span>
  );
}

export function FilterLab() {
  const [seed, setSeed] = useState(0);
  const addresses = useMemo(
    () => Array.from({ length: 16 }, () => randomAddress()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );
  const uris = useMemo(() => addresses.map((address) => identiconUri(address)), [addresses]);

  return (
    <div className="panel">
      <FilterDefs />

      <p className="hint">
        The same sixteen cats under every treatment, so the only thing changing between panels is the pass laid
        over the top. Each is applied per identicon rather than across the block, which is how it would actually
        ship. The F numbers are the survivors of the first pass and have not moved; the C numbers combine them.
      </p>

      <div className="row" style={{ marginTop: 0, marginBottom: 18 }}>
        <button onClick={() => setSeed((value) => value + 1)}>Randomise the sixteen</button>
        <span className="mono" style={{ color: 'var(--muted)' }}>{TREATMENTS.length} treatments</span>
      </div>

      <div className="fx-grid">
        {TREATMENTS.map((treatment) => (
          <figure className="fx-panel" key={treatment.id}>
            <div className="fx-cats">
              {uris.map((uri, index) => (
                <Cat key={index} uri={uri} effect={treatment.effect} />
              ))}
            </div>
            <figcaption>
              <strong>
                {treatment.id} · {treatment.name}
              </strong>
              <span>{treatment.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
