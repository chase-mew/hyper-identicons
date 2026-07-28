import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { identiconUri, isAddress } from 'hyper-identicons';
import { identiconUri as identiconUriMini } from 'hyper-identicons/mini';

export interface HyperIdenticonProps {
  address: string;
  /** Rendered size in CSS pixels. */
  size?: number;
  /**
   * `mini` paints background, body and headwear only. Use it in lists: the detail it
   * drops is invisible below roughly 32px, and its art never reaches the bundle.
   */
  detail?: 'full' | 'mini';
  /** Corner radius in canvas units (0-16). 16 is a circle. */
  radius?: number;
  /** Rendered instead of throwing when `address` is not a 20-byte hex address. */
  fallback?: React.ReactNode;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export function HyperIdenticon({
  address,
  size = 32,
  detail = 'full',
  radius,
  fallback = null,
  alt,
  className,
  style,
}: HyperIdenticonProps) {
  const src = useMemo(() => {
    if (!isAddress(address)) return null;
    const render = detail === 'mini' ? identiconUriMini : identiconUri;
    return render(address, { radius });
  }, [address, detail, radius]);

  if (src === null) return <>{fallback}</>;

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt ?? `Identicon for ${address}`}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
    />
  );
}
