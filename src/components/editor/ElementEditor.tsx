import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Field, Input, Select, useStyles2, ColorPickerInput, Button } from '@grafana/ui';
import { css } from '@emotion/css';
import { CanvasElement, ColorConfig, TextConfig } from '../../types';

interface Props {
  element: CanvasElement;
  onChange: (partial: Partial<CanvasElement>) => void;
  onDelete: () => void;
}

const getStyles = (theme: GrafanaTheme2) => ({
  panel: css`
    position: absolute;
    top: 0;
    right: 0;
    width: 240px;
    height: 100%;
    overflow-y: auto;
    background: ${theme.colors.background.primary};
    border-left: 1px solid ${theme.colors.border.medium};
    padding: ${theme.spacing(1)};
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
  `,
  section: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.secondary};
    border-bottom: 1px solid ${theme.colors.border.weak};
    padding-bottom: ${theme.spacing(0.5)};
    margin-bottom: ${theme.spacing(0.5)};
  `,
  row: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
    align-items: flex-end;
  `,
});

function fixedColor(cfg: ColorConfig): string {
  return cfg.mode === 'fixed' ? cfg.value : '#ffffff';
}

function fixedText(cfg: TextConfig): string {
  return cfg.mode === 'fixed' ? cfg.value : '';
}

export const ElementEditor: React.FC<Props> = ({ element, onChange, onDelete }) => {
  const styles = useStyles2(getStyles);

  const updateBg = (color: string) =>
    onChange({ background: { ...element.background, color: { mode: 'fixed', value: color } } });

  const updateBorderColor = (color: string) =>
    onChange({ border: { ...element.border, color: { mode: 'fixed', value: color } } });

  const updateText = (value: string) => {
    if (!element.text) return;
    onChange({ text: { ...element.text, content: { mode: 'fixed', value } } });
  };

  const fontWeightOptions = [
    { label: 'Normal', value: 'normal' as const },
    { label: 'Bold', value: 'bold' as const },
  ];

  const fontStyleOptions = [
    { label: 'Normal', value: 'normal' as const },
    { label: 'Italic', value: 'italic' as const },
  ];

  const textAlignOptions = [
    { label: 'Left', value: 'left' as const },
    { label: 'Center', value: 'center' as const },
    { label: 'Right', value: 'right' as const },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.section}>Element: {element.name}</div>

      <Field label="Name">
        <Input value={element.name} onChange={(e) => onChange({ name: e.currentTarget.value })} />
      </Field>

      <div className={styles.section}>Position &amp; Size</div>
      <div className={styles.row}>
        <Field label="X">
          <Input
            type="number"
            value={element.x}
            width={7}
            onChange={(e) => onChange({ x: Number(e.currentTarget.value) })}
          />
        </Field>
        <Field label="Y">
          <Input
            type="number"
            value={element.y}
            width={7}
            onChange={(e) => onChange({ y: Number(e.currentTarget.value) })}
          />
        </Field>
      </div>
      <div className={styles.row}>
        <Field label="W">
          <Input
            type="number"
            value={element.width}
            width={7}
            onChange={(e) => onChange({ width: Number(e.currentTarget.value) })}
          />
        </Field>
        <Field label="H">
          <Input
            type="number"
            value={element.height}
            width={7}
            onChange={(e) => onChange({ height: Number(e.currentTarget.value) })}
          />
        </Field>
      </div>
      <Field label="Rotation (°)">
        <Input
          type="number"
          value={element.rotation}
          onChange={(e) => onChange({ rotation: Number(e.currentTarget.value) })}
        />
      </Field>

      <div className={styles.section}>Background</div>
      <Field label="Color">
        <ColorPickerInput
          value={fixedColor(element.background.color)}
          onChange={updateBg}
        />
      </Field>

      <div className={styles.section}>Border</div>
      <Field label="Width">
        <Input
          type="number"
          value={element.border.width}
          onChange={(e) => onChange({ border: { ...element.border, width: Number(e.currentTarget.value) } })}
        />
      </Field>
      <Field label="Radius">
        <Input
          type="number"
          value={element.border.radius}
          onChange={(e) => onChange({ border: { ...element.border, radius: Number(e.currentTarget.value) } })}
        />
      </Field>
      <Field label="Color">
        <ColorPickerInput
          value={fixedColor(element.border.color)}
          onChange={updateBorderColor}
        />
      </Field>

      {element.text && (
        <>
          <div className={styles.section}>Text</div>
          <Field label="Content">
            <Input value={fixedText(element.text.content)} onChange={(e) => updateText(e.currentTarget.value)} />
          </Field>
          <Field label="Size (px)">
            <Input
              type="number"
              value={element.text.size}
              onChange={(e) => onChange({ text: { ...element.text!, size: Number(e.currentTarget.value) } })}
            />
          </Field>
          <Field label="Align">
            <Select
              options={textAlignOptions}
              value={element.text.align}
              onChange={(v) => onChange({ text: { ...element.text!, align: v.value! } })}
            />
          </Field>
          <Field label="Weight">
            <Select
              options={fontWeightOptions}
              value={element.text.fontWeight}
              onChange={(v) => onChange({ text: { ...element.text!, fontWeight: v.value! } })}
            />
          </Field>
          <Field label="Style">
            <Select
              options={fontStyleOptions}
              value={element.text.fontStyle}
              onChange={(v) => onChange({ text: { ...element.text!, fontStyle: v.value! } })}
            />
          </Field>
          <Field label="Font Family">
            <Input
              value={element.text.fontFamily}
              onChange={(e) => onChange({ text: { ...element.text!, fontFamily: e.currentTarget.value } })}
            />
          </Field>
        </>
      )}

      {element.type === 'icon' && (
        <>
          <div className={styles.section}>Icon</div>
          <Field label="Icon name">
            <Input
              value={element.iconName || ''}
              onChange={(e) => onChange({ iconName: e.currentTarget.value })}
            />
          </Field>
        </>
      )}

      {element.type === 'server' && (
        <>
          <div className={styles.section}>Server</div>
          <Field label="Variant">
            <Select
              options={[
                { label: 'Single', value: 'single' as const },
                { label: 'Stack', value: 'stack' as const },
                { label: 'Database', value: 'database' as const },
                { label: 'Terminal', value: 'terminal' as const },
              ]}
              value={element.serverVariant || 'single'}
              onChange={(v) => onChange({ serverVariant: v.value! })}
            />
          </Field>
        </>
      )}

      <div className={styles.section}>Layer</div>
      <Field label="Z-Index">
        <Input
          type="number"
          value={element.zIndex}
          onChange={(e) => onChange({ zIndex: Number(e.currentTarget.value) })}
        />
      </Field>

      <Button variant="destructive" size="sm" onClick={onDelete}>
        Delete element
      </Button>
    </div>
  );
};
