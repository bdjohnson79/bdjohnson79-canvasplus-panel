import React from 'react';
import { Icon, IconName } from '@grafana/ui';
import { ElementProps } from './index';

export const IconElement: React.FC<ElementProps> = ({ element, resolved, rect }) => {
  const iconName = (element.iconName as IconName) || 'question-circle';
  const size = Math.min(rect.width, rect.height);

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
