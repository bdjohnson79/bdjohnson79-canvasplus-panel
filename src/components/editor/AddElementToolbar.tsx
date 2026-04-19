import React from 'react';
import { Button, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { ElementType, CanvasElement } from '../../types';
import { v4 as uuidv4 } from '../../utils/uuid';

const ELEMENT_TYPES: Array<{ type: ElementType; label: string }> = [
  { type: 'rectangle', label: 'Rect' },
  { type: 'ellipse', label: 'Ellipse' },
  { type: 'text', label: 'Text' },
  { type: 'icon', label: 'Icon' },
  { type: 'server', label: 'Server' },
  { type: 'cloud', label: 'Cloud' },
  { type: 'triangle', label: 'Triangle' },
  { type: 'parallelogram', label: 'Parallelogram' },
];

function defaultElement(type: ElementType, canvasWidth: number, canvasHeight: number, zIndex: number): CanvasElement {
  const base: CanvasElement = {
    id: uuidv4(),
    type,
    name: `${type}-${zIndex}`,
    x: Math.max(0, canvasWidth / 2 - 60),
    y: Math.max(0, canvasHeight / 2 - 30),
    width: 120,
    height: 60,
    rotation: 0,
    background: { color: { mode: 'fixed', value: '#3d71d9' } },
    border: { width: 1, color: { mode: 'fixed', value: '#555' }, radius: 4 },
    text: {
      content: { mode: 'fixed', value: type },
      size: 14,
      align: 'center',
      color: { mode: 'fixed', value: '#ffffff' },
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontFamily: 'Inter, sans-serif',
    },
    zIndex,
  };

  if (type === 'text') {
    base.background = { color: { mode: 'fixed', value: 'transparent' } };
    base.border = { width: 0, color: { mode: 'fixed', value: 'transparent' }, radius: 0 };
    if (base.text) {
      base.text.color = { mode: 'fixed', value: '#cccccc' };
    }
  }

  if (type === 'icon') {
    base.iconName = 'database';
    base.iconColor = { mode: 'fixed', value: '#ffffff' };
    base.width = 60;
    base.height = 60;
  }

  if (type === 'server') {
    base.serverVariant = 'single';
    base.statusColor = { mode: 'fixed', value: '#73bf69' };
    base.width = 80;
    base.height = 100;
  }

  return base;
}

interface Props {
  canvasWidth: number;
  canvasHeight: number;
  nextZIndex: number;
  onAdd: (element: CanvasElement) => void;
}

const getStyles = (theme: GrafanaTheme2) => ({
  toolbar: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing(0.5)};
    padding: ${theme.spacing(0.5)};
    background: ${theme.colors.background.secondary};
    border-bottom: 1px solid ${theme.colors.border.medium};
  `,
});

export const AddElementToolbar: React.FC<Props> = ({ canvasWidth, canvasHeight, nextZIndex, onAdd }) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.toolbar}>
      {ELEMENT_TYPES.map(({ type, label }) => (
        <Button
          key={type}
          size="sm"
          variant="secondary"
          onClick={() => onAdd(defaultElement(type, canvasWidth, canvasHeight, nextZIndex))}
        >
          + {label}
        </Button>
      ))}
    </div>
  );
};
