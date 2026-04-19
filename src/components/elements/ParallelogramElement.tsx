import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const ParallelogramElement: React.FC<ElementProps> = ({ element, resolved }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
        backgroundColor: resolved.bg,
      }}
    >
      {element.text && <span style={textStyle(element, resolved)}>{resolved.text}</span>}
    </div>
  );
};
