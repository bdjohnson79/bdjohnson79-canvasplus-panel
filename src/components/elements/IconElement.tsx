import React from 'react';
import { Icon } from '@grafana/ui';
import { ElementProps } from './index';

export const IconElement: React.FC<ElementProps> = ({ element, resolved }) => {
  const iconName = (element.iconName as any) || 'question-circle';
  const size = Math.min(element.width, element.height);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: resolved.bg,
        border: element.border.width ? `${element.border.width}px solid ${resolved.borderColor}` : undefined,
        borderRadius: element.border.radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        color: resolved.iconColor,
      }}
    >
      <Icon name={iconName} size={size > 48 ? 'xxxl' : size > 32 ? 'xxl' : size > 24 ? 'xl' : 'lg'} />
    </div>
  );
};
