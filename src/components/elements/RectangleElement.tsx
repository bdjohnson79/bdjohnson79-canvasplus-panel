import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const RectangleElement: React.FC<ElementProps> = ({ element, resolved }) => {
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
        backgroundColor: resolved.bg,
        border: `${element.border.width}px solid ${resolved.borderColor}`,
        borderRadius: element.border.radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {element.text && <span style={textStyle(element, resolved)}>{resolved.text}</span>}
    </div>
  );
};
