import React from 'react';
import { ElementProps } from './index';
import { textStyle } from './shared';

export const BlockArrowElement: React.FC<ElementProps> = ({ element, resolved }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      clipPath: 'polygon(0% 25%, 65% 25%, 65% 0%, 100% 50%, 65% 100%, 65% 75%, 0% 75%)',
      backgroundColor: resolved.bg,
    }}
  >
    {element.text && <span style={textStyle(element, resolved)}>{resolved.text}</span>}
  </div>
);
