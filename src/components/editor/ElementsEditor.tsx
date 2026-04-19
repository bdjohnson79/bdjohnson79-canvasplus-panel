import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, ColorPickerInput, Field, IconButton, Input, Select, Tooltip, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { CanvasElement, CanvasOptions, ColorConfig, ElementType, TextConfig } from '../../types';
import { v4 as uuidv4 } from '../../utils/uuid';

// ── Element type list ─────────────────────────────────────────────────────────

const ELEMENT_TYPES: Array<{ label: string; value: ElementType }> = [
  { label: 'Rectangle', value: 'rectangle' },
  { label: 'Ellipse', value: 'ellipse' },
  { label: 'Text', value: 'text' },
  { label: 'Icon', value: 'icon' },
  { label: 'Server', value: 'server' },
  { label: 'Cloud', value: 'cloud' },
  { label: 'Triangle', value: 'triangle' },
  { label: 'Parallelogram', value: 'parallelogram' },
];

// ── Default element factory ───────────────────────────────────────────────────

function defaultElement(type: ElementType, zIndex: number): CanvasElement {
  const base: CanvasElement = {
    id: uuidv4(),
    type,
    name: `${type}-${zIndex}`,
    x: 50,
    y: 50,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fixedColor(cfg: ColorConfig): string {
  return cfg.mode === 'fixed' ? cfg.value : '#ffffff';
}

function fixedText(cfg: TextConfig): string {
  return cfg.mode === 'fixed' ? cfg.value : '';
}

// ── Alignment buttons ─────────────────────────────────────────────────────────

interface AlignmentButtonsProps {
  el: CanvasElement;
  panelWidth: number;
  panelHeight: number;
  onUpdate: (partial: Partial<CanvasElement>) => void;
}

const ALIGNMENTS: Array<{ label: string; title: string; fn: (el: CanvasElement, pw: number, ph: number) => Partial<CanvasElement> }> = [
  { label: '⇤', title: 'Align left edge to panel left', fn: (el) => ({ x: 0 }) },
  { label: '↔', title: 'Center horizontally', fn: (el, pw) => ({ x: Math.round((pw - el.width) / 2) }) },
  { label: '⇥', title: 'Align right edge to panel right', fn: (el, pw) => ({ x: pw - el.width }) },
  { label: '⇡', title: 'Align top edge to panel top', fn: (el) => ({ y: 0 }) },
  { label: '↕', title: 'Center vertically', fn: (el, _pw, ph) => ({ y: Math.round((ph - el.height) / 2) }) },
  { label: '⇣', title: 'Align bottom edge to panel bottom', fn: (el, _pw, ph) => ({ y: ph - el.height }) },
];

const AlignmentButtons: React.FC<AlignmentButtonsProps> = ({ el, panelWidth, panelHeight, onUpdate }) => {
  const hasDims = panelWidth > 0 && panelHeight > 0;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {ALIGNMENTS.map(({ label, title, fn }) => (
        <Tooltip key={title} content={hasDims ? title : `${title} (open panel editor to enable)`}>
          <Button
            size="sm"
            variant="secondary"
            disabled={!hasDims}
            onClick={() => onUpdate(fn(el, panelWidth, panelHeight))}
            style={{ fontFamily: 'monospace', minWidth: 32 }}
          >
            {label}
          </Button>
        </Tooltip>
      ))}
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: GrafanaTheme2) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing(0.5)} 0;
    border-bottom: 1px solid ${theme.colors.border.weak};
    cursor: pointer;
  `,
  rowLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    flex: 1;
  `,
  actions: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
    align-items: center;
  `,
  section: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.secondary};
    margin: ${theme.spacing(1)} 0 ${theme.spacing(0.5)};
  `,
  twoCol: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
  `,
  addRow: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
    margin-top: ${theme.spacing(1)};
    align-items: flex-end;
  `,
  elementForm: css`
    padding: ${theme.spacing(1)};
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.radius.default};
    margin-top: ${theme.spacing(0.5)};
  `,
});

// ── Main editor ───────────────────────────────────────────────────────────────

export const ElementsEditor: React.FC<StandardEditorProps<CanvasElement[], unknown, CanvasOptions>> = ({
  value,
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
  const elements = value ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newType, setNewType] = useState<ElementType>('rectangle');

  const panelWidth = context.options?._panelWidth ?? 0;
  const panelHeight = context.options?._panelHeight ?? 0;

  const updateElement = (id: string, partial: Partial<CanvasElement>) =>
    onChange(elements.map((el) => (el.id === id ? { ...el, ...partial } : el)));

  const removeElement = (id: string) => {
    onChange(elements.filter((el) => el.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addElement = () => {
    const zIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) + 1 : 1;
    onChange([...elements, defaultElement(newType, zIndex)]);
  };

  return (
    <div>
      {elements.map((el) => (
        <div key={el.id}>
          <div className={styles.row} onClick={() => setExpandedId(expandedId === el.id ? null : el.id)}>
            <span className={styles.rowLabel}>
              {el.name} <em style={{ opacity: 0.6 }}>({el.type})</em>
            </span>
            <div className={styles.actions}>
              <IconButton
                name="trash-alt"
                size="sm"
                tooltip="Delete element"
                onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
              />
              <IconButton
                name={expandedId === el.id ? 'angle-up' : 'angle-down'}
                size="sm"
                tooltip={expandedId === el.id ? 'Collapse' : 'Expand'}
              />
            </div>
          </div>

          {expandedId === el.id && (
            <div className={styles.elementForm}>
              <Field label="Name">
                <Input value={el.name} onChange={(e) => updateElement(el.id, { name: e.currentTarget.value })} />
              </Field>

              {/* ── Quick placement ── */}
              <div className={styles.section}>Quick placement</div>
              <AlignmentButtons
                el={el}
                panelWidth={panelWidth}
                panelHeight={panelHeight}
                onUpdate={(partial) => updateElement(el.id, partial)}
              />

              {/* ── Position & size ── */}
              <div className={styles.section}>Position &amp; Size</div>
              <div className={styles.twoCol}>
                <Field label="X">
                  <Input type="number" value={el.x} width={8}
                    onChange={(e) => updateElement(el.id, { x: Number(e.currentTarget.value) })} />
                </Field>
                <Field label="Y">
                  <Input type="number" value={el.y} width={8}
                    onChange={(e) => updateElement(el.id, { y: Number(e.currentTarget.value) })} />
                </Field>
              </div>
              <div className={styles.twoCol}>
                <Field label="Width">
                  <Input type="number" value={el.width} width={8}
                    onChange={(e) => updateElement(el.id, { width: Number(e.currentTarget.value) })} />
                </Field>
                <Field label="Height">
                  <Input type="number" value={el.height} width={8}
                    onChange={(e) => updateElement(el.id, { height: Number(e.currentTarget.value) })} />
                </Field>
              </div>
              <div className={styles.twoCol}>
                <Field label="Rotation °">
                  <Input type="number" value={el.rotation} width={8}
                    onChange={(e) => updateElement(el.id, { rotation: Number(e.currentTarget.value) })} />
                </Field>
                <Field label="Z-Index">
                  <Input type="number" value={el.zIndex} width={8}
                    onChange={(e) => updateElement(el.id, { zIndex: Number(e.currentTarget.value) })} />
                </Field>
              </div>

              {/* ── Background ── */}
              <div className={styles.section}>Background</div>
              <Field label="Color">
                <ColorPickerInput
                  value={fixedColor(el.background.color)}
                  onChange={(c) => updateElement(el.id, { background: { ...el.background, color: { mode: 'fixed', value: c } } })}
                />
              </Field>

              {/* ── Border ── */}
              <div className={styles.section}>Border</div>
              <div className={styles.twoCol}>
                <Field label="Width">
                  <Input type="number" value={el.border.width} width={8}
                    onChange={(e) => updateElement(el.id, { border: { ...el.border, width: Number(e.currentTarget.value) } })} />
                </Field>
                <Field label="Radius">
                  <Input type="number" value={el.border.radius} width={8}
                    onChange={(e) => updateElement(el.id, { border: { ...el.border, radius: Number(e.currentTarget.value) } })} />
                </Field>
              </div>
              <Field label="Color">
                <ColorPickerInput
                  value={fixedColor(el.border.color)}
                  onChange={(c) => updateElement(el.id, { border: { ...el.border, color: { mode: 'fixed', value: c } } })}
                />
              </Field>

              {/* ── Text ── */}
              {el.text && (
                <>
                  <div className={styles.section}>Text</div>
                  <Field label="Content">
                    <Input
                      value={fixedText(el.text.content)}
                      onChange={(e) =>
                        updateElement(el.id, { text: { ...el.text!, content: { mode: 'fixed', value: e.currentTarget.value } } })
                      }
                    />
                  </Field>
                  <div className={styles.twoCol}>
                    <Field label="Size px">
                      <Input type="number" value={el.text.size} width={8}
                        onChange={(e) => updateElement(el.id, { text: { ...el.text!, size: Number(e.currentTarget.value) } })} />
                    </Field>
                    <Field label="Align">
                      <Select
                        width={10}
                        options={[
                          { label: 'Left', value: 'left' as const },
                          { label: 'Center', value: 'center' as const },
                          { label: 'Right', value: 'right' as const },
                        ]}
                        value={el.text.align}
                        onChange={(v) => updateElement(el.id, { text: { ...el.text!, align: v.value! } })}
                      />
                    </Field>
                  </div>
                  <div className={styles.twoCol}>
                    <Field label="Weight">
                      <Select
                        width={10}
                        options={[
                          { label: 'Normal', value: 'normal' as const },
                          { label: 'Bold', value: 'bold' as const },
                        ]}
                        value={el.text.fontWeight}
                        onChange={(v) => updateElement(el.id, { text: { ...el.text!, fontWeight: v.value! } })}
                      />
                    </Field>
                    <Field label="Style">
                      <Select
                        width={10}
                        options={[
                          { label: 'Normal', value: 'normal' as const },
                          { label: 'Italic', value: 'italic' as const },
                        ]}
                        value={el.text.fontStyle}
                        onChange={(v) => updateElement(el.id, { text: { ...el.text!, fontStyle: v.value! } })}
                      />
                    </Field>
                  </div>
                  <Field label="Font family">
                    <Input
                      value={el.text.fontFamily}
                      onChange={(e) => updateElement(el.id, { text: { ...el.text!, fontFamily: e.currentTarget.value } })}
                    />
                  </Field>
                  <Field label="Text color">
                    <ColorPickerInput
                      value={fixedColor(el.text.color)}
                      onChange={(c) =>
                        updateElement(el.id, { text: { ...el.text!, color: { mode: 'fixed', value: c } } })
                      }
                    />
                  </Field>
                </>
              )}

              {/* ── Icon-specific ── */}
              {el.type === 'icon' && (
                <>
                  <div className={styles.section}>Icon</div>
                  <Field label="Icon name" description="Any @grafana/ui icon name">
                    <Input
                      value={el.iconName ?? ''}
                      onChange={(e) => updateElement(el.id, { iconName: e.currentTarget.value })}
                    />
                  </Field>
                </>
              )}

              {/* ── Server-specific ── */}
              {el.type === 'server' && (
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
                      value={el.serverVariant ?? 'single'}
                      onChange={(v) => updateElement(el.id, { serverVariant: v.value! })}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <div className={styles.addRow}>
        <Select
          options={ELEMENT_TYPES}
          value={newType}
          onChange={(v) => setNewType(v.value!)}
          width={16}
        />
        <Button size="sm" onClick={addElement}>Add element</Button>
      </div>
    </div>
  );
};
