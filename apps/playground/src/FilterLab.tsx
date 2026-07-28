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
  opacity?: number;
};

type Treatment = {
  id: string;
  name: string;
  note: string;
  /** A CSS filter string, or a url(#id) pointing at one of the SVG filters below. */
  filter?: string;
  overlays?: Overlay[];
  /**
   * A second copy of the same identicon laid over the first under its own filter.
   * The only way to get a partial version of a filter that has no strength dial:
   * a duotone is all or nothing, but a duotone at 55% opacity over the untouched
   * cat keeps some of the original hue underneath it.
   */
  ghost?: { filter: string; opacity: number };
};

const MINT = '#8AF0D2';
const DEEP = '#0B1F2A';

const SCANLINE = 'repeating-linear-gradient(0deg, rgba(0,0,0,.42) 0 1px, transparent 1px 3px)';
const VIGNETTE = 'radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(0,0,0,.55) 100%)';

/**
 * Ordered roughly gentlest first, so scanning down the page goes from "you have to
 * look twice" to "obviously a treatment". Names are arbitrary handles for talking
 * about them; the numbers are what matter.
 */
const TREATMENTS: Treatment[] = [
  { id: 'F01', name: 'Untouched', note: 'baseline, no treatment' },

  {
    id: 'F02',
    name: 'Mint Wash',
    note: 'brand teal, soft-light — the miniature painter’s wash',
    overlays: [{ background: MINT, blend: 'soft-light', opacity: 0.55 }],
  },
  {
    id: 'F03',
    name: 'Deep Wash',
    note: 'navy multiply, pulls everything down and together',
    overlays: [{ background: DEEP, blend: 'multiply', opacity: 0.3 }],
  },
  {
    id: 'F04',
    name: 'Muted',
    note: 'desaturate only, no colour added',
    filter: 'saturate(0.6)',
  },
  {
    id: 'F05',
    name: 'Rich',
    note: 'the opposite — push saturation and contrast up',
    filter: 'saturate(1.55) contrast(1.08)',
  },
  {
    id: 'F06',
    name: 'Faded Film',
    note: 'lifted blacks, low contrast, warm cast',
    filter: 'contrast(0.82) brightness(1.1) saturate(0.78)',
    overlays: [{ background: '#FFCC99', blend: 'soft-light', opacity: 0.35 }],
  },
  {
    id: 'F07',
    name: 'Sepia',
    note: 'the blunt instrument, for reference',
    filter: 'sepia(0.6) saturate(1.2)',
  },
  {
    id: 'F08',
    name: 'Cold Steel',
    note: 'desaturated and pushed blue',
    filter: 'saturate(0.55) hue-rotate(-12deg) brightness(0.98)',
    overlays: [{ background: '#4E7FA8', blend: 'soft-light', opacity: 0.5 }],
  },
  {
    id: 'F09',
    name: 'Sunset',
    note: 'warm top, cool bottom — a split tone',
    overlays: [
      { background: 'linear-gradient(180deg, #FF9E5E 0%, transparent 55%)', blend: 'soft-light', opacity: 0.75 },
      { background: 'linear-gradient(0deg, #4B4FA8 0%, transparent 55%)', blend: 'soft-light', opacity: 0.7 },
    ],
  },
  {
    id: 'F10',
    name: 'Night',
    note: 'heavy indigo multiply with the contrast held up',
    filter: 'contrast(1.15)',
    overlays: [{ background: '#1B1B4A', blend: 'multiply', opacity: 0.42 }],
  },
  {
    id: 'F11',
    name: 'Frost',
    note: 'pale blue screen — lifts rather than darkens',
    overlays: [{ background: '#9FD8F0', blend: 'screen', opacity: 0.22 }],
  },
  {
    id: 'F12',
    name: 'Vignette',
    note: 'no colour shift, just darkened corners',
    overlays: [{ background: VIGNETTE, blend: 'multiply', opacity: 1 }],
  },
  {
    id: 'F13',
    name: 'Scanlines',
    note: 'one dark row in three',
    overlays: [{ background: SCANLINE, blend: 'multiply', opacity: 0.7 }],
  },
  {
    id: 'F14',
    name: 'CRT',
    note: 'scanlines, bloom and a vignette together',
    filter: 'url(#fx-bloom) saturate(1.2)',
    overlays: [
      { background: SCANLINE, blend: 'multiply', opacity: 0.6 },
      { background: VIGNETTE, blend: 'multiply', opacity: 0.8 },
    ],
  },
  {
    id: 'F15',
    name: 'Chromatic',
    note: 'red and blue channels split a pixel apart',
    filter: 'url(#fx-chroma)',
  },
  {
    id: 'F16',
    name: 'Chromatic Soft',
    note: 'the same split, plus bloom to melt it together',
    filter: 'url(#fx-chroma) url(#fx-bloom)',
  },
  {
    id: 'F17',
    name: 'Bloom',
    note: 'light bleeds out of the bright areas',
    filter: 'url(#fx-bloom)',
  },
  {
    id: 'F18',
    name: 'Grain',
    note: 'film noise laid over the flat colour',
    filter: 'url(#fx-grain)',
  },
  {
    id: 'F19',
    name: 'Posterize',
    note: 'every channel crushed to four steps',
    filter: 'url(#fx-posterize)',
  },
  {
    id: 'F20',
    name: 'Duotone Mint',
    note: 'the strongest unifier: two colours, nothing else',
    filter: 'url(#fx-duotone-mint)',
  },
  {
    id: 'F21',
    name: 'Duotone Warm',
    note: 'same idea, plum to amber',
    filter: 'url(#fx-duotone-warm)',
  },
  {
    id: 'F22',
    name: 'Tritone',
    note: 'three stops instead of two, so midtones survive',
    filter: 'url(#fx-tritone)',
  },
  {
    id: 'F23',
    name: 'Half Duotone',
    note: 'duotone at 55% over the untouched cat, so some hue survives',
    ghost: { filter: 'url(#fx-duotone-mint)', opacity: 0.55 },
  },
  {
    id: 'F24',
    name: 'Half Tritone',
    note: 'the same compromise over the three-stop map',
    ghost: { filter: 'url(#fx-tritone)', opacity: 0.6 },
  },
  {
    id: 'F25',
    name: 'Bleach',
    note: 'desaturated highlights, colour kept in the darks',
    filter: 'contrast(1.3) saturate(0.7) brightness(1.06)',
    overlays: [{ background: '#F2F7F5', blend: 'soft-light', opacity: 0.5 }],
  },
  {
    id: 'F26',
    name: 'Mint Wash Heavy',
    note: 'F02 pushed as far as it goes before the hues stop reading',
    filter: 'saturate(0.75)',
    overlays: [{ background: MINT, blend: 'soft-light', opacity: 1 }],
  },
  {
    id: 'F27',
    name: 'Ink Wash',
    note: 'grey first, then a single teal tint over the top',
    filter: 'grayscale(1) contrast(1.05)',
    overlays: [{ background: '#2FA98C', blend: 'multiply', opacity: 0.72 }],
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
 * the duotones come out washed and the posterize steps land in the wrong places.
 */
function FilterDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {/* Split the channels, then screen them back together. */}
        <filter id="fx-chroma" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx="-1.5" dy="0" result="ro" />
          <feOffset in="SourceGraphic" dx="1.5" dy="0" result="bo" />
          <feColorMatrix
            in="ro"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="rc"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="gc"
          />
          <feColorMatrix
            in="bo"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="bc"
          />
          <feBlend in="rc" in2="gc" mode="screen" result="rg" />
          <feBlend in="rg" in2="bc" mode="screen" />
        </filter>

        <filter id="fx-bloom" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feBlend in="SourceGraphic" in2="blur" mode="screen" />
        </filter>

        {/* Turbulence desaturated to grey, then added onto the source. */}
        <filter id="fx-grain" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="soft">
            <feFuncA type="linear" slope="0.55" intercept="0" />
          </feComponentTransfer>
          <feComposite in="soft" in2="SourceGraphic" operator="in" result="clipped" />
          <feBlend in="SourceGraphic" in2="clipped" mode="overlay" />
        </filter>

        <filter id="fx-posterize" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues="0 0.33 0.66 1" />
            <feFuncG type="discrete" tableValues="0 0.33 0.66 1" />
            <feFuncB type="discrete" tableValues="0 0.33 0.66 1" />
          </feComponentTransfer>
        </filter>

        {/* Grey first, then remap the ramp onto two endpoints. */}
        <filter id="fx-duotone-mint" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values=".33 .34 .33 0 0  .33 .34 .33 0 0  .33 .34 .33 0 0  0 0 0 1 0"
          />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.04 0.54" />
            <feFuncG type="table" tableValues="0.12 0.94" />
            <feFuncB type="table" tableValues="0.16 0.82" />
          </feComponentTransfer>
        </filter>

        <filter id="fx-duotone-warm" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values=".33 .34 .33 0 0  .33 .34 .33 0 0  .33 .34 .33 0 0  0 0 0 1 0"
          />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.16 1.0" />
            <feFuncG type="table" tableValues="0.06 0.78" />
            <feFuncB type="table" tableValues="0.22 0.42" />
          </feComponentTransfer>
        </filter>

        {/* Three stops, so the middle of the ramp keeps a hue of its own. */}
        <filter id="fx-tritone" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values=".33 .34 .33 0 0  .33 .34 .33 0 0  .33 .34 .33 0 0  0 0 0 1 0"
          />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.06 0.36 0.98" />
            <feFuncG type="table" tableValues="0.10 0.62 0.96" />
            <feFuncB type="table" tableValues="0.22 0.62 0.80" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

const CELL = 76;

function Cat({ uri, treatment }: { uri: string; treatment: Treatment }) {
  return (
    <span className="fx-cat" style={{ filter: treatment.filter, width: CELL, height: CELL }}>
      <img src={uri} width={CELL} height={CELL} alt="" />
      {treatment.ghost && (
        <img
          className="fx-ghost"
          src={uri}
          width={CELL}
          height={CELL}
          alt=""
          style={{ filter: treatment.ghost.filter, opacity: treatment.ghost.opacity }}
        />
      )}
      {(treatment.overlays ?? []).map((overlay, index) => (
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
        ship. Call them by number.
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
                <Cat key={index} uri={uri} treatment={treatment} />
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
