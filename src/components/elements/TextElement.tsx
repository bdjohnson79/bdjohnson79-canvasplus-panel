import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const TextElement: React.FC<ElementProps> = ({ element, resolved }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          element.text?.align === 'left'
            ? 'flex-start'
            : element.text?.align === 'right'
            ? 'flex-end'
            : 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {element.text && <span style={textStyle(element, resolved)}>{resolved.text}</span>}
    </div>
  );
};
