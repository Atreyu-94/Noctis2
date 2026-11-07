import type { Color } from './types.js';

/** Parse at the format boundary. Preserve authored spelling in native outputs. */
export function rgba(value: string): readonly [number, number, number, number] {
   if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
      throw new Error(`Invalid color: ${value}`);
   }
   let hex = value.slice(1);
   if (hex.length <= 4) hex = [...hex].map(c => c + c).join('');
   return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16), hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1];
}

/** Source-over in encoded sRGB, rounded once, for terminals without RGBA colors. */
export function composite(foreground: Color, background: Color): Color {
   const [r, g, b, alpha] = rgba(foreground);
   const [br, bg, bb, ba] = rgba(background);
   if (ba !== 1) throw new Error('Compositing requires an opaque background');
   const channels = [r * alpha + br * (1 - alpha), g * alpha + bg * (1 - alpha), b * alpha + bb * (1 - alpha)];
   return `#${channels.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}
