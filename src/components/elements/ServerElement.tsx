import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

const ServerSVG: React.FC<{ variant: string; statusColor: string; width: number; height: number }> = ({
  variant,
  statusColor,
  width,
  height,
}) => {
  const w = width;
  const h = height;

  if (variant === 'database') {
    return (
      <svg viewBox="0 0 100 100" width={w} height={h}>
        <ellipse cx="50" cy="20" rx="40" ry="12" fill="#555" stroke="#888" strokeWidth="2" />
        <rect x="10" y="20" width="80" height="60" fill="#444" stroke="#888" strokeWidth="2" />
        <ellipse cx="50" cy="80" rx="40" ry="12" fill="#555" stroke="#888" strokeWidth="2" />
        <ellipse cx="50" cy="45" rx="40" ry="12" fill="#555" stroke="#888" strokeWidth="2" />
        <circle cx="80" cy="20" r="5" fill={statusColor} />
      </svg>
    );
  }

  if (variant === 'stack') {
    return (
      <svg viewBox="0 0 100 100" width={w} height={h}>
        {[10, 35, 60].map((y, i) => (
          <g key={i}>
            <rect x="10" y={y} width="80" height="22" rx="3" fill="#444" stroke="#888" strokeWidth="2" />
            <circle cx="20" cy={y + 11} r="4" fill={i === 0 ? statusColor : '#666'} />
            <rect x="30" y={y + 8} width="40" height="6" rx="2" fill="#555" />
          </g>
        ))}
      </svg>
    );
  }

  if (variant === 'terminal') {
    return (
      <svg viewBox="0 0 100 100" width={w} height={h}>
        <rect x="5" y="5" width="90" height="90" rx="6" fill="#222" stroke="#555" strokeWidth="2" />
        <rect x="5" y="5" width="90" height="16" rx="6" fill="#333" />
        <text x="15" y="18" fill={statusColor} fontSize="10">
          ●
        </text>
        <text x="10" y="40" fill="#0f0" fontSize="9" fontFamily="monospace">
          {'> _'}
        </text>
      </svg>
    );
  }

  // default: single server
  return (
    <svg viewBox="0 0 100 100" width={w} height={h}>
      <rect x="10" y="20" width="80" height="60" rx="4" fill="#444" stroke="#888" strokeWidth="2" />
      <rect x="10" y="20" width="80" height="20" rx="4" fill="#555" />
      <circle cx="85" cy="30" r="5" fill={statusColor} />
      <rect x="20" y="50" width="60" height="6" rx="2" fill="#555" />
      <rect x="20" y="62" width="40" height="6" rx="2" fill="#555" />
    </svg>
  );
};

export const ServerElement: React.FC<ElementProps> = ({ element, resolved }) => {
  const variant = element.serverVariant || 'single';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: resolved.bg,
        border: element.border.width ? `${element.border.width}px solid ${resolved.borderColor}` : undefined,
        borderRadius: element.border.radius,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <ServerSVG
        variant={variant}
        statusColor={resolved.statusColor}
        width={element.width}
        height={element.text ? element.height - 24 : element.height}
      />
      {element.text && <span style={textStyle(element, resolved)}>{resolved.text}</span>}
    </div>
  );
};
