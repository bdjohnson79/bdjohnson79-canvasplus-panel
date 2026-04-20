import { CSSProperties } from 'react';
import { CanvasElement, PixelRect } from '../../types';
import { ResolvedStyle } from '../hooks/useDataBinding';

export function elementWrapperStyle(rect: PixelRect, rotation: number, zIndex: number): CSSProperties {
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    zIndex,
    boxSizing: 'border-box',
  };
}

export function textStyle(element: CanvasElement, resolved: ResolvedStyle): CSSProperties {
  if (!element.text) {
    return {};
  }
  const rawWeight = element.text.fontWeight as number | string;
  const fontWeight =
    typeof rawWeight === 'string'
      ? rawWeight === 'bold' ? 700 : (Number(rawWeight) || 400)
      : rawWeight;
  return {
    fontSize: element.text.size,
    fontWeight,
    fontStyle: element.text.fontStyle,
    fontFamily: 'Inter, sans-serif',
    color: resolved.textColor || undefined,
    textAlign: element.text.align,
    padding: '4px',
    wordBreak: 'break-word',
  };
}
