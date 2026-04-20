import { CSSProperties } from 'react';
import { CanvasElement } from '../../types';
import { ResolvedStyle } from '../hooks/useDataBinding';

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
