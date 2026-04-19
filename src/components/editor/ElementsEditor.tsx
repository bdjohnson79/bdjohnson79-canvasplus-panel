import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, ColorPickerInput, Field, IconButton, Input, Select, TextArea, Tooltip, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import {
  CanvasElement,
  CanvasOptions,
  ColorConfig,
  ElementConstraint,
  ElementType,
  HorizontalConstraint,
  Placement,
  TextConfig,
  VerticalConstraint,
} from '../../types';
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
  { label: 'Image', value: 'image' },
];

// ── Constraint options ────────────────────────────────────────────────────────

const H_CONSTRAINT_OPTIONS: Array<{ label: string; value: HorizontalConstraint }> = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Left & Right (stretch)', value: 'leftright' },
];

const V_CONSTRAINT_OPTIONS: Array<{ label: string; value: VerticalConstraint }> = [
  { label: 'Top', value: 'top' },
  { label: 'Center', value: 'center' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Top & Bottom (stretch)', value: 'topbottom' },
];

// ── Default element factory ───────────────────────────────────────────────────

function defaultPlacement(width = 120, height = 60): Placement {
  return { top: 50, left: 50, right: 0, bottom: 0, width, height, rotation: 0 };
}

const defaultConstraint: ElementConstraint = { horizontal: 'left', vertical: 'top' };

function defaultElement(type: ElementType, zIndex: number): CanvasElement {
  const base: CanvasElement = {
    id: uuidv4(),
    type,
    name: `${type}-${zIndex}`,
    placement: defaultPlacement(),
    constraint: { ...defaultConstraint },
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
    base.placement = defaultPlacement(60, 60);
  }
  if (type === 'server') {
    base.serverVariant = 'single';
    base.statusColor = { mode: 'fixed', value: '#73bf69' };
    base.placement = defaultPlacement(80, 100);
  }
  if (type === 'image') {
    base.imageSource = 'inline';
    base.imageFormat = 'png';
    base.imageFit = 'contain';
    base.background = { color: { mode: 'fixed', value: 'transparent' } };
    base.border = { width: 0, color: { mode: 'fixed', value: 'transparent' }, radius: 0 };
    base.text = undefined;
    base.placement = defaultPlacement(120, 80);
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

// ── Quick placement buttons ───────────────────────────────────────────────────

interface QuickPlacementProps {
  el: CanvasElement;
  onUpdate: (partial: Partial<CanvasElement>) => void;
}

const QUICK_H: Array<{
  label: string;
  title: string;
  constraint: HorizontalConstraint;
  placementReset: Partial<Placement>;
}> = [
  { label: '⇤', title: 'Align left (left constraint, offset = 0)', constraint: 'left',   placementReset: { left: 0 } },
  { label: '↔', title: 'Center horizontally (center constraint, offset = 0)', constraint: 'center', placementReset: { left: 0 } },
  { label: '⇥', title: 'Align right (right constraint, offset = 0)', constraint: 'right',  placementReset: { right: 0 } },
];

const QUICK_V: Array<{
  label: string;
  title: string;
  constraint: VerticalConstraint;
  placementReset: Partial<Placement>;
}> = [
  { label: '⇡', title: 'Align top (top constraint, offset = 0)', constraint: 'top',    placementReset: { top: 0 } },
  { label: '↕', title: 'Center vertically (center constraint, offset = 0)', constraint: 'center', placementReset: { top: 0 } },
  { label: '⇣', title: 'Align bottom (bottom constraint, offset = 0)', constraint: 'bottom', placementReset: { bottom: 0 } },
];

const QuickPlacement: React.FC<QuickPlacementProps> = ({ el, onUpdate }) => {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {QUICK_H.map(({ label, title, constraint, placementReset }) => (
        <Tooltip key={title} content={title}>
          <Button
            size="sm"
            variant={el.constraint.horizontal === constraint ? 'primary' : 'secondary'}
            onClick={() =>
              onUpdate({
                constraint: { ...el.constraint, horizontal: constraint },
                placement: { ...el.placement, ...placementReset },
              })
            }
            style={{ fontFamily: 'monospace', minWidth: 32 }}
          >
            {label}
          </Button>
        </Tooltip>
      ))}
      {QUICK_V.map(({ label, title, constraint, placementReset }) => (
        <Tooltip key={title} content={title}>
          <Button
            size="sm"
            variant={el.constraint.vertical === constraint ? 'primary' : 'secondary'}
            onClick={() =>
              onUpdate({
                constraint: { ...el.constraint, vertical: constraint },
                placement: { ...el.placement, ...placementReset },
              })
            }
            style={{ fontFamily: 'monospace', minWidth: 32 }}
          >
            {label}
          </Button>
        </Tooltip>
      ))}
    </div>
  );
};

// ── Position fields (label depends on constraint) ─────────────────────────────

interface PositionFieldsProps {
  el: CanvasElement;
  onUpdate: (partial: Partial<CanvasElement>) => void;
}

const PositionFields: React.FC<PositionFieldsProps> = ({ el, onUpdate }) => {
  const { constraint, placement } = el;

  const setPlacement = (partial: Partial<Placement>) =>
    onUpdate({ placement: { ...placement, ...partial } });

  const hLabel =
    constraint.horizontal === 'left' ? 'Left (px from left)'
    : constraint.horizontal === 'right' ? 'Right (px from right)'
    : constraint.horizontal === 'leftright' ? 'Left (px from left)'
    : 'H offset (from center)';

  const vLabel =
    constraint.vertical === 'top' ? 'Top (px from top)'
    : constraint.vertical === 'bottom' ? 'Bottom (px from bottom)'
    : constraint.vertical === 'topbottom' ? 'Top (px from top)'
    : 'V offset (from center)';

  const hValue =
    constraint.horizontal === 'right' ? placement.right : placement.left;

  const vValue =
    constraint.vertical === 'bottom' ? placement.bottom : placement.top;

  const onHChange = (v: number) =>
    constraint.horizontal === 'right'
      ? setPlacement({ right: v })
      : setPlacement({ left: v });

  const onVChange = (v: number) =>
    constraint.vertical === 'bottom'
      ? setPlacement({ bottom: v })
      : setPlacement({ top: v });

  return (
    <>
      <Field label={hLabel}>
        <Input type="number" value={hValue}
          onChange={(e) => onHChange(Number(e.currentTarget.value))} />
      </Field>
      <Field label={vLabel}>
        <Input type="number" value={vValue}
          onChange={(e) => onVChange(Number(e.currentTarget.value))} />
      </Field>
      {constraint.horizontal === 'leftright' && (
        <Field label="Right (px from right)">
          <Input type="number" value={placement.right}
            onChange={(e) => setPlacement({ right: Number(e.currentTarget.value) })} />
        </Field>
      )}
      {constraint.vertical === 'topbottom' && (
        <Field label="Bottom (px from bottom)">
          <Input type="number" value={placement.bottom}
            onChange={(e) => setPlacement({ bottom: Number(e.currentTarget.value) })} />
        </Field>
      )}
    </>
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
}) => {
  const styles = useStyles2(getStyles);
  const elements = value ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newType, setNewType] = useState<ElementType>('rectangle');

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
              <IconButton name="trash-alt" size="sm" tooltip="Delete element"
                onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} />
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
              <QuickPlacement el={el} onUpdate={(p) => updateElement(el.id, p)} />

              {/* ── Layout / Constraint ── */}
              <div className={styles.section}>Layout</div>
              <div className={styles.twoCol}>
                <Field label="Horizontal">
                  <Select
                    width={14}
                    options={H_CONSTRAINT_OPTIONS}
                    value={el.constraint.horizontal}
                    onChange={(v) =>
                      updateElement(el.id, { constraint: { ...el.constraint, horizontal: v.value! } })
                    }
                  />
                </Field>
                <Field label="Vertical">
                  <Select
                    width={14}
                    options={V_CONSTRAINT_OPTIONS}
                    value={el.constraint.vertical}
                    onChange={(v) =>
                      updateElement(el.id, { constraint: { ...el.constraint, vertical: v.value! } })
                    }
                  />
                </Field>
              </div>

              {/* ── Position offsets (labels match constraint) ── */}
              <PositionFields el={el} onUpdate={(p) => updateElement(el.id, p)} />

              {/* ── Size ── */}
              <div className={styles.section}>Size</div>
              <div className={styles.twoCol}>
                <Field label="Width">
                  <Input type="number" value={el.placement.width} width={8}
                    onChange={(e) =>
                      updateElement(el.id, { placement: { ...el.placement, width: Number(e.currentTarget.value) } })
                    }
                  />
                </Field>
                <Field label="Height">
                  <Input type="number" value={el.placement.height} width={8}
                    onChange={(e) =>
                      updateElement(el.id, { placement: { ...el.placement, height: Number(e.currentTarget.value) } })
                    }
                  />
                </Field>
              </div>
              <Field label="Rotation °">
                <Input type="number" value={el.placement.rotation}
                  onChange={(e) =>
                    updateElement(el.id, { placement: { ...el.placement, rotation: Number(e.currentTarget.value) } })
                  }
                />
              </Field>

              <div className={styles.twoCol}>
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
                  onChange={(c) =>
                    updateElement(el.id, { background: { ...el.background, color: { mode: 'fixed', value: c } } })
                  }
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
                  onChange={(c) =>
                    updateElement(el.id, { border: { ...el.border, color: { mode: 'fixed', value: c } } })
                  }
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
                        updateElement(el.id, {
                          text: { ...el.text!, content: { mode: 'fixed', value: e.currentTarget.value } },
                        })
                      }
                    />
                  </Field>
                  <div className={styles.twoCol}>
                    <Field label="Size px">
                      <Input type="number" value={el.text.size} width={8}
                        onChange={(e) =>
                          updateElement(el.id, { text: { ...el.text!, size: Number(e.currentTarget.value) } })
                        }
                      />
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
                      onChange={(e) =>
                        updateElement(el.id, { text: { ...el.text!, fontFamily: e.currentTarget.value } })
                      }
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

              {/* ── Icon ── */}
              {el.type === 'icon' && (
                <>
                  <div className={styles.section}>Icon</div>
                  <Field label="Icon name" description="Any @grafana/ui icon name">
                    <Input value={el.iconName ?? ''}
                      onChange={(e) => updateElement(el.id, { iconName: e.currentTarget.value })} />
                  </Field>
                </>
              )}

              {/* ── Server ── */}
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

              {/* ── Image ── */}
              {el.type === 'image' && (
                <>
                  <div className={styles.section}>Image</div>
                  <Field label="Source">
                    <Select
                      options={[
                        { label: 'Inline (paste data)', value: 'inline' as const },
                        { label: 'From query field', value: 'field' as const },
                      ]}
                      value={el.imageSource ?? 'inline'}
                      onChange={(v) => updateElement(el.id, { imageSource: v.value! })}
                    />
                  </Field>

                  {(el.imageSource ?? 'inline') === 'inline' && (
                    <>
                      <Field label="Format">
                        <Select
                          options={[
                            { label: 'SVG (text/xml)', value: 'svg+xml' as const },
                            { label: 'SVG (base64)', value: 'svg+xml;base64' as const },
                            { label: 'PNG (base64)', value: 'png' as const },
                            { label: 'JPEG (base64)', value: 'jpeg' as const },
                            { label: 'GIF (base64)', value: 'gif' as const },
                            { label: 'WebP (base64)', value: 'webp' as const },
                          ]}
                          value={el.imageFormat ?? 'png'}
                          onChange={(v) => updateElement(el.id, { imageFormat: v.value! })}
                        />
                      </Field>
                      <Field
                        label="Image data"
                        description={
                          (el.imageFormat ?? 'png') === 'svg+xml'
                            ? 'Paste SVG markup'
                            : 'Paste base64 encoded image data'
                        }
                      >
                        <TextArea
                          value={el.imageData ?? ''}
                          rows={4}
                          onChange={(e) => updateElement(el.id, { imageData: e.currentTarget.value })}
                        />
                      </Field>
                    </>
                  )}

                  {el.imageSource === 'field' && (
                    <>
                      <Field label="Format" description="MIME type when field value is raw base64 (not a data URL)">
                        <Select
                          options={[
                            { label: 'PNG', value: 'png' as const },
                            { label: 'JPEG', value: 'jpeg' as const },
                            { label: 'SVG (base64)', value: 'svg+xml;base64' as const },
                            { label: 'GIF', value: 'gif' as const },
                            { label: 'WebP', value: 'webp' as const },
                          ]}
                          value={el.imageFormat ?? 'png'}
                          onChange={(v) => updateElement(el.id, { imageFormat: v.value! })}
                        />
                      </Field>
                      <Field label="Field name" description="Query field containing base64 data or a data URL">
                        <Input
                          value={el.imageField ?? ''}
                          onChange={(e) => updateElement(el.id, { imageField: e.currentTarget.value })}
                        />
                      </Field>
                    </>
                  )}

                  <Field label="Fit">
                    <Select
                      options={[
                        { label: 'Contain', value: 'contain' as const },
                        { label: 'Cover', value: 'cover' as const },
                        { label: 'Fill', value: 'fill' as const },
                        { label: 'None', value: 'none' as const },
                      ]}
                      value={el.imageFit ?? 'contain'}
                      onChange={(v) => updateElement(el.id, { imageFit: v.value! })}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <div className={styles.addRow}>
        <Select options={ELEMENT_TYPES} value={newType}
          onChange={(v) => setNewType(v.value!)} width={16} />
        <Button size="sm" onClick={addElement}>Add element</Button>
      </div>
    </div>
  );
};
