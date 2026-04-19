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
  return {
    fontSize: element.text.size,
    fontWeight: element.text.fontWeight,
    fontStyle: element.text.fontStyle,
    fontFamily: element.text.fontFamily || 'Inter, sans-serif',
    color: resolved.text !== '' ? resolved.text : undefined,
    textAlign: element.text.align,
    padding: '4px',
    wordBreak: 'break-word',
  };
}
