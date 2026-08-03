# @hyper-identicons/react

React component for [hyper-identicons](https://www.npmjs.com/package/hyper-identicons).

```tsx
import { HyperIdenticon } from '@hyper-identicons/react';

<HyperIdenticon address={address} size={32} detail="mini" />;
```

`detail="mini"` paints background, body, eyes and headwear only — the detail that
survives a list-row size. Invalid addresses render `fallback` (default `null`)
instead of throwing.

Full docs live in the [repository README](https://github.com/chase-mew/hyper-identicons#readme).

MIT (`LICENSE`).
