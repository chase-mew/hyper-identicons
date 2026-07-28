import { useMemo, useState } from 'react';
import {
  ART_DATA,
  COLORWAYS,
  LAYER_ORDER,
  MANIFEST,
  identiconTraits,
  identiconUri,
  isAddress,
  renderPixels,
  toDataUri,
  toSvg,
} from 'hyper-identicons';
import { identiconUri as identiconUriMini } from 'hyper-identicons/mini';
import type { DetailLevel, LayerChoice, LayerId } from 'hyper-identicons';

const DEFAULT_ART: Record<LayerId, string> = {
  background: 'plain',
  body: 'base',
  clothing: 'hoodie',
  mouth: 'neutral',
  eyes: 'round',
  accessory: 'none',
  headwear: 'none',
};

function randomAddress(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** Renders an explicit trait combination rather than one derived from an address. */
function previewUri(layer: LayerId, artId: string, colorwayId: string): string {
  const choices: LayerChoice[] = LAYER_ORDER.map((id) => {
    const wanted = id === layer ? artId : DEFAULT_ART[id];
    const chosen = id === layer ? COLORWAYS[id].find((colorway) => colorway.id === colorwayId) : undefined;
    // Dark garments on the default dark background are indistinguishable, so previews
    // of other layers sit on a light backdrop.
    const fallback = id === 'background' && layer !== 'background' ? COLORWAYS[id].find((c) => c.id === 'sand') : undefined;
    return {
      layer: id,
      art: MANIFEST[id].art.find((art) => art.id === wanted) ?? MANIFEST[id].art[0]!,
      colorway: chosen ?? fallback ?? COLORWAYS[id][0]!,
    };
  });
  return toDataUri(toSvg(renderPixels(choices, ART_DATA)));
}

/** Renders only the layers named, so the body can be seen without clothes or a face. */
function bareUri(
  art: Partial<Record<LayerId, string>>,
  furId: string,
  backdropId: string,
): string {
  const choices: LayerChoice[] = LAYER_ORDER.filter((layer) => art[layer] !== undefined).map((layer) => {
    const wanted = layer === 'body' ? furId : layer === 'background' ? backdropId : undefined;
    return {
      layer,
      art: MANIFEST[layer].art.find((entry) => entry.id === art[layer]) ?? MANIFEST[layer].art[0]!,
      colorway: COLORWAYS[layer].find((colorway) => colorway.id === wanted) ?? COLORWAYS[layer][0]!,
    };
  });
  return toDataUri(toSvg(renderPixels(choices, ART_DATA)));
}

const BODY: Partial<Record<LayerId, string>> = { background: 'plain', body: 'base' };
const BODY_WITH_FACE: Partial<Record<LayerId, string>> = { ...BODY, mouth: 'neutral', eyes: 'round' };

/** 48 canvas pixels at 9x, so the render is exact and nothing is resampled. */
const HERO = 48 * 9;

function BasePurrbit() {
  const [fur, setFur] = useState('snow');
  const [backdrop, setBackdrop] = useState('sand');
  const [face, setFace] = useState(true);

  const art = face ? BODY_WITH_FACE : BODY;
  const hero = bareUri(art, fur, backdrop);

  return (
    <div className="panel purrbit">
      <img className="hero" src={hero} width={HERO} height={HERO} alt="The base Purrbit" />

      <div className="controls">
        <p className="hint">
          Everything else is drawn on top of this. A three-quarter view: the near ear is full size with a dark
          inner, the far one is foreshortened, and the muzzle sits five columns right of the skull.
        </p>

        <div className="row" style={{ marginTop: 0 }}>
          <button aria-pressed={face} onClick={() => setFace(true)}>
            with face
          </button>
          <button aria-pressed={!face} onClick={() => setFace(false)}>
            body only
          </button>
        </div>

        <h4>Fur</h4>
        <div className="swatches">
          {COLORWAYS.body.map((colorway) => (
            <button
              key={colorway.id}
              className="swatch"
              aria-pressed={colorway.id === fur}
              title={colorway.name}
              onClick={() => setFur(colorway.id)}
            >
              <img src={bareUri(art, colorway.id, backdrop)} width={44} height={44} alt={colorway.name} />
            </button>
          ))}
        </div>

        <h4>Backdrop</h4>
        <div className="swatches">
          {COLORWAYS.background.map((colorway) => (
            <button
              key={colorway.id}
              className="swatch chip"
              aria-pressed={colorway.id === backdrop}
              title={colorway.name}
              onClick={() => setBackdrop(colorway.id)}
              style={{ background: colorway.colors.a }}
            />
          ))}
        </div>

        <h4>How it holds up small</h4>
        <div className="row" style={{ marginTop: 0, alignItems: 'flex-end' }}>
          {[16, 24, 32, 48, 64].map((size) => (
            <figure key={size} className="tiny">
              <img src={hero} width={size} height={size} alt="" />
              <figcaption>{size}px</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

function Inspector() {
  const [address, setAddress] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const valid = isAddress(address);
  const traits = useMemo(() => (valid ? identiconTraits(address) : []), [address, valid]);

  return (
    <div className="panel inspect">
      <img src={valid ? identiconUri(address) : undefined} width={176} height={176} alt="" />
      {valid && <img src={identiconUriMini(address)} width={176} height={176} alt="" />}

      <div className="fields">
        <input
          type="text"
          value={address}
          spellCheck={false}
          className={valid ? undefined : 'invalid'}
          onChange={(event) => setAddress(event.target.value.trim())}
        />
        <div className="row">
          <button onClick={() => setAddress(randomAddress())}>Random address</button>
          <span className="mono" style={{ color: valid ? 'var(--muted)' : '#e08a8a' }}>
            {valid ? 'full · mini' : 'not a 20-byte address'}
          </span>
        </div>

        {valid && (
          <table className="traits">
            <tbody>
              {traits.map((choice) => (
                <tr key={choice.layer}>
                  <td>{choice.layer}</td>
                  <td>
                    {choice.art.name} · {choice.colorway.name}
                  </td>
                  <td className="mono">
                    {(
                      (choice.art.weight / MANIFEST[choice.layer].art.reduce((sum, art) => sum + art.weight, 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ContactSheet() {
  const [size, setSize] = useState(24);
  const [detail, setDetail] = useState<DetailLevel>('full');
  const [seed, setSeed] = useState(0);

  const addresses = useMemo(
    () => Array.from({ length: 180 }, () => randomAddress()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );
  const render = detail === 'mini' ? identiconUriMini : identiconUri;

  return (
    <div className="panel">
      <p className="hint">
        The test that decides whether the trait system works: if you cannot tell these apart at 24px, the art is
        wrong, not the algorithm. Background, fur and headwear are drawn from the highest-entropy bits for exactly
        this reason.
      </p>
      <div className="row" style={{ marginTop: 0, marginBottom: 16 }}>
        <label htmlFor="size">Size {size}px</label>
        <input
          id="size"
          type="range"
          min={16}
          max={64}
          value={size}
          onChange={(event) => setSize(Number(event.target.value))}
        />
        <button aria-pressed={detail === 'full'} onClick={() => setDetail('full')}>
          full
        </button>
        <button aria-pressed={detail === 'mini'} onClick={() => setDetail('mini')}>
          mini
        </button>
        <button onClick={() => setSeed((value) => value + 1)}>Shuffle</button>
      </div>
      <div className="sheet">
        {addresses.map((address) => (
          <img key={address} src={render(address)} width={size} height={size} alt="" title={address} />
        ))}
      </div>
    </div>
  );
}

function Explorer() {
  return (
    <div className="panel explorer">
      <p className="hint" style={{ margin: 0 }}>
        Every asset, and every colourway it can resolve against. One body drawing plus {COLORWAYS.body.length} fur
        colourways is why the art set is {Object.values(ART_DATA).reduce((sum, layer) => sum + Object.keys(layer ?? {}).length, 0)}{' '}
        files and still yields billions of combinations.
      </p>
      {LAYER_ORDER.map((layer) => (
        <div className="layer" key={layer}>
          <h3>
            {layer}{' '}
            <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
              {MANIFEST[layer].art.length} × {COLORWAYS[layer].length} colourways
            </span>
          </h3>
          <div className="items">
            {MANIFEST[layer].art.map((art) => (
              <figure key={art.id}>
                <img src={previewUri(layer, art.id, COLORWAYS[layer][0]!.id)} width={72} height={72} alt="" />
                <figcaption>{art.name}</figcaption>
              </figure>
            ))}
          </div>
          <div className="items" style={{ marginTop: 10 }}>
            {COLORWAYS[layer].map((colorway) => (
              <figure key={colorway.id} style={{ width: 52 }}>
                <img
                  src={previewUri(layer, DEFAULT_ART[layer] === 'none' ? (MANIFEST[layer].art[1]?.id ?? 'none') : DEFAULT_ART[layer], colorway.id)}
                  width={48}
                  height={48}
                  alt=""
                />
                <figcaption>{colorway.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function App() {
  return (
    <div className="wrap">
      <header>
        <h1>
          Hyper <span>Identicons</span>
        </h1>
        <p>
          A deterministic pixel-art cat for every HyperEVM address. The same address always renders the same
          character, everywhere, with no network call and no account.
        </p>
        <div className="draft">
          Spec v1 is a draft. Output is not frozen — any address may render differently between releases until it is.
        </div>
      </header>

      <section>
        <h2>The base Purrbit</h2>
        <BasePurrbit />
      </section>

      <section>
        <h2>Inspect an address</h2>
        <Inspector />
      </section>

      <section>
        <h2>Legibility at list size</h2>
        <ContactSheet />
      </section>

      <section>
        <h2>Trait explorer</h2>
        <Explorer />
      </section>
    </div>
  );
}
