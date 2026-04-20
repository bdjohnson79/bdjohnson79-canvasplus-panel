import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const MetricValueElement: React.FC<ElementProps> = ({ element, resolved }) => {
  const labelPosition = element.metricLabelPosition ?? 'bottom';
  const hasLabel = !!element.text;

  const valueStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: element.metricValueSize ?? 32,
    fontWeight: element.metricValueWeight ?? 700,
    fontStyle: element.metricValueStyle ?? 'normal',
    color: resolved.metricValueColor || undefined,
    lineHeight: 1.1,
    textAlign: 'center',
    padding: '2px 4px',
    wordBreak: 'break-word',
  };

  const labelEl = hasLabel && element.text ? (
    <span style={textStyle(element, resolved)}>{resolved.text}</span>
  ) : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {labelPosition === 'top' && labelEl}
      <span style={valueStyle}>{resolved.metricValue || '—'}</span>
      {labelPosition === 'bottom' && labelEl}
    </div>
  );
};
