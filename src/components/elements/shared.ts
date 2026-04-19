import { CSSProperties } from 'react';
import { CanvasElement } from '../../types';
import { ResolvedStyle } from '../hooks/useDataBinding';

export function elementWrapperStyle(element: CanvasElement): CSSProperties {
  return {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    zIndex: element.zIndex,
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
