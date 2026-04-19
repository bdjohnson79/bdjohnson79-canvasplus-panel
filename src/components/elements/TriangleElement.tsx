import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const TriangleElement: React.FC<ElementProps> = ({ element, resolved }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: resolved.bg,
      }}
    >
      {element.text && (
        <span
          style={{
            ...textStyle(element, resolved),
            marginTop: '40%',
          }}
        >
          {resolved.text}
        </span>
      )}
    </div>
  );
};
