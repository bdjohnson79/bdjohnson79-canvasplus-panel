import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const CloudElement: React.FC<ElementProps> = ({ element, resolved }) => {
  const justify =
    element.text?.align === 'left'
      ? 'flex-start'
      : element.text?.align === 'right'
      ? 'flex-end'
      : 'center';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        boxSizing: 'border-box',
        // CSS cloud shape via clip-path
        clipPath:
          'polygon(25% 60%, 5% 60%, 5% 45%, 12% 30%, 25% 25%, 30% 10%, 50% 5%, 70% 10%, 80% 25%, 95% 30%, 95% 60%, 75% 60%, 75% 85%, 25% 85%)',
        backgroundColor: resolved.bg,
      }}
    >
      {element.text && <span style={textStyle(element, resolved)}>{resolved.text}</span>}
    </div>
  );
};
