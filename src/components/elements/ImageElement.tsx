import React from 'react';
import { ElementProps } from './index';

export const ImageElement: React.FC<ElementProps> = ({ element, resolved }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: resolved.bg,
      border: element.border.width ? `${element.border.width}px solid ${resolved.borderColor}` : undefined,
      borderRadius: element.border.radius,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}
  >
    {resolved.imageSrc && (
      <img
        src={resolved.imageSrc}
        style={{ width: '100%', height: '100%', objectFit: element.imageFit ?? 'contain', display: 'block' }}
        alt=""
      />
    )}
  </div>
);
