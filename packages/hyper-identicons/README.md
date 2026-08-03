# hyper-identicons

Deterministic pixel-art identicons for HyperEVM addresses.

```ts
import { identicon, identiconUri } from 'hyper-identicons';

identicon(address);                              // SVG string
identiconUri(address, { size: 40, radius: 24 }); // data: URI
```

Import from `hyper-identicons/mini` for the reduced layer set, `hyper-identicons/core`
for algorithm primitives, and `hyper-identicons/art` for art data and trait metadata.

Full docs, the normative spec and the art pipeline live in the
[repository README](https://github.com/chase-mew/hyper-identicons#readme).

Code is MIT (`LICENSE`). Art is CC0 (`LICENSE-ART`).
