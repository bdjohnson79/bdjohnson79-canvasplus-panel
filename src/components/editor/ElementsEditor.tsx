import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import { CanvasElementSelectedEvent } from '../../events';
import { Button, Field, Icon, IconButton, IconName, Input, Select, TextArea, Tooltip, getAvailableIcons, useStyles2, useTheme2 } from '@grafana/ui';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { css } from '@emotion/css';
import {
  CanvasElement,
  CanvasOptions,
  ElementConstraint,
  ElementType,
  HorizontalConstraint,
  Placement,
  VerticalConstraint,
} from '../../types';
import { v4 as uuidv4 } from '../../utils/uuid';
import { ColorConfigEditor, TextConfigEditor } from './sharedEditors';

// ── Element type list ─────────────────────────────────────────────────────────

const ELEMENT_TYPES: Array<{ label: string; value: ElementType }> = [
  { label: 'Rectangle', value: 'rectangle' },
  { label: 'Ellipse', value: 'ellipse' },
  { label: 'Text', value: 'text' },
  { label: 'Icon', value: 'icon' },
  { label: 'Server', value: 'server' },
  { label: 'Cloud', value: 'cloud' },
  { label: 'Triangle', value: 'triangle' },
  { label: 'Block Arrow', value: 'block-arrow' },
  { label: 'Image', value: 'image' },
  { label: 'Metric Value', value: 'metric-value' },
];

const FONT_WEIGHT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '100 — Thin', value: 100 },
  { label: '200 — Extra Light', value: 200 },
  { label: '300 — Light', value: 300 },
  { label: '400 — Regular', value: 400 },
  { label: '500 — Medium', value: 500 },
  { label: '600 — Semi Bold', value: 600 },
  { label: '700 — Bold', value: 700 },
  { label: '800 — Extra Bold', value: 800 },
  { label: '900 — Black', value: 900 },
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
      fontWeight: 400,
      fontStyle: 'normal',
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
  if (type === 'metric-value') {
    base.background = { color: { mode: 'fixed', value: 'transparent' } };
    base.border = { width: 0, color: { mode: 'fixed', value: 'transparent' }, radius: 0 };
    base.text = {
      content: { mode: 'fixed', value: '' },
      size: 12,
      align: 'center',
      color: { mode: 'fixed', value: '#aaaaaa' },
      fontWeight: 400,
      fontStyle: 'normal',
    };
    base.metricField = '';
    base.metricValueSize = 32;
    base.metricValueWeight = 700;
    base.metricValueStyle = 'normal';
    base.metricLabelPosition = 'bottom';
    base.metricValueColor = { mode: 'thresholds' };
    base.placement = defaultPlacement(160, 100);
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
  if (type === 'block-arrow') {
    base.placement = defaultPlacement(120, 60);
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

// ── Icon picker ───────────────────────────────────────────────────────────────

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
}

const IconPickerField: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const theme = useTheme2();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const allIcons = useMemo(() => getAvailableIcons(), []);
  const filtered = useMemo(
    () => (search ? allIcons.filter((n) => String(n).includes(search.toLowerCase())) : allIcons),
    [allIcons, search]
  );

  useEffect(() => {
    if (!open) { return; }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 8px',
          background: theme.colors.background.secondary,
          border: `1px solid ${theme.colors.border.medium}`,
          borderRadius: theme.shape.radius.default,
          cursor: 'pointer',
          color: theme.colors.text.primary,
          width: '100%',
          fontSize: theme.typography.bodySmall.fontSize,
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={value as IconName} />
        <span style={{ flex: 1, textAlign: 'left' }}>{value}</span>
        <Icon name={open ? 'angle-up' : 'angle-down'} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 9999,
            width: 300,
            background: theme.colors.background.primary,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: theme.shape.radius.default,
            boxShadow: theme.shadows.z3,
            top: '100%',
            left: 0,
            marginTop: 2,
          }}
        >
          <div style={{ padding: '8px 8px 4px' }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search icons…"
              prefix={<Icon name="search" />}
              autoFocus
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2,
              maxHeight: 260,
              overflowY: 'auto',
              padding: '4px 8px 8px',
            }}
          >
            {filtered.slice(0, 300).map((name) => (
              <div
                key={name}
                title={String(name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: name === value ? theme.colors.primary.transparent : 'transparent',
                  color: theme.colors.text.primary,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = theme.colors.action.hover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    name === value ? theme.colors.primary.transparent : 'transparent';
                }}
                onClick={() => { onChange(String(name)); setOpen(false); setSearch(''); }}
              >
                <Icon name={name as IconName} size="lg" />
              </div>
            ))}
          </div>
        </div>
      )}
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
  rowSelected: css`
    border-left: 2px solid ${theme.colors.primary.border};
    padding-left: ${theme.spacing(0.5)};
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
  dragIcon: css`
    cursor: grab;
    color: ${theme.colors.text.secondary};
    margin-right: ${theme.spacing(0.5)};
    flex-shrink: 0;
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

  useEffect(() => {
    const sub = context.eventBus?.subscribe(CanvasElementSelectedEvent, (event) => {
      setExpandedId(event.payload.elementId);
    });
    return () => sub?.unsubscribe();
  }, [context.eventBus]);

  const fieldOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ label: string; value: string }> = [];
    for (const frame of context.data ?? []) {
      for (const field of frame.fields) {
        if (!seen.has(field.name)) {
          seen.add(field.name);
          opts.push({ label: field.name, value: field.name });
        }
      }
    }
    return opts;
  }, [context.data]);

  const updateElement = (id: string, partial: Partial<CanvasElement>) =>
    onChange(elements.map((el) => (el.id === id ? { ...el, ...partial } : el)));

  const removeElement = (id: string) => {
    onChange(elements.filter((el) => el.id !== id));
    if (expandedId === id) {setExpandedId(null);}
  };

  const duplicateElement = (id: string) => {
    const source = elements.find((el) => el.id === id);
    if (!source) { return; }
    const zIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) + 1 : 1;
    const copy: CanvasElement = {
      ...source,
      id: uuidv4(),
      name: `${source.name}-copy`,
      zIndex,
      placement: { ...source.placement, top: source.placement.top + 5, left: source.placement.left + 5 },
    };
    onChange([...elements, copy]);
    context.eventBus?.publish(new CanvasElementSelectedEvent({ elementId: copy.id }));
  };

  const addElement = () => {
    const zIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) + 1 : 1;
    const newEl = defaultElement(newType, zIndex);
    onChange([...elements, newEl]);
    context.eventBus?.publish(new CanvasElementSelectedEvent({ elementId: newEl.id }));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) { return; }
    const reordered = [...elements];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const normalized = reordered.map((el, i) => ({ ...el, zIndex: reordered.length - i }));
    onChange(normalized);
  };

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="elements-list">
          {(droppableProvided) => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {elements.map((el, index) => (
                <Draggable key={el.id} draggableId={el.id} index={index}>
                  {(draggableProvided) => (
                    <div ref={draggableProvided.innerRef} {...draggableProvided.draggableProps}>
                      <div
                        className={`${styles.row}${expandedId === el.id ? ` ${styles.rowSelected}` : ''}`}
                        onClick={() => {
                          const next = expandedId === el.id ? null : el.id;
                          setExpandedId(next);
                          context.eventBus?.publish(new CanvasElementSelectedEvent({ elementId: next }));
                        }}
                      >
                        <span
                          className={styles.dragIcon}
                          {...draggableProvided.dragHandleProps}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="draggabledots" />
                        </span>
                        <span className={styles.rowLabel}>
                          {el.name} <em style={{ opacity: 0.6 }}>({el.type})</em>
                        </span>
                        <div className={styles.actions}>
                          <IconButton name="copy" size="sm" tooltip="Duplicate element"
                            onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }} />
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

                          {/* ── Background ── */}
                          <div className={styles.section}>Background</div>
                          <ColorConfigEditor
                            label="Color"
                            value={el.background.color}
                            onChange={(c) => updateElement(el.id, { background: { ...el.background, color: c } })}
                            fieldOptions={fieldOptions}
                          />

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
                          <ColorConfigEditor
                            label="Color"
                            value={el.border.color}
                            onChange={(c) => updateElement(el.id, { border: { ...el.border, color: c } })}
                            fieldOptions={fieldOptions}
                          />

                          {/* ── Text ── */}
                          {el.text && (
                            <>
                              <div className={styles.section}>Text</div>
                              <TextConfigEditor
                                label="Content"
                                value={el.text.content}
                                onChange={(c) => updateElement(el.id, { text: { ...el.text!, content: c } })}
                                fieldOptions={fieldOptions}
                              />
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
                                    width={14}
                                    options={FONT_WEIGHT_OPTIONS}
                                    value={
                                      typeof el.text.fontWeight === 'string'
                                        ? (el.text.fontWeight === 'bold' ? 700 : 400)
                                        : el.text.fontWeight
                                    }
                                    onChange={(v) => updateElement(el.id, { text: { ...el.text!, fontWeight: Number(v.value!) } })}
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
                              <ColorConfigEditor
                                label="Color"
                                value={el.text.color}
                                onChange={(c) => updateElement(el.id, { text: { ...el.text!, color: c } })}
                                fieldOptions={fieldOptions}
                              />
                            </>
                          )}

                          {/* ── Icon ── */}
                          {el.type === 'icon' && (
                            <>
                              <div className={styles.section}>Icon</div>
                              <Field label="Icon">
                                <IconPickerField
                                  value={el.iconName ?? 'question-circle'}
                                  onChange={(name) => updateElement(el.id, { iconName: name })}
                                />
                              </Field>
                              <ColorConfigEditor
                                label="Color"
                                value={el.iconColor ?? { mode: 'fixed', value: '#ffffff' }}
                                onChange={(c) => updateElement(el.id, { iconColor: c })}
                                fieldOptions={fieldOptions}
                              />
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
                              <ColorConfigEditor
                                label="Status color"
                                value={el.statusColor ?? { mode: 'fixed', value: '#73bf69' }}
                                onChange={(c) => updateElement(el.id, { statusColor: c })}
                                fieldOptions={fieldOptions}
                              />
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
                                    <Select
                                      options={fieldOptions}
                                      value={el.imageField ?? null}
                                      placeholder="Select field…"
                                      isClearable
                                      onChange={(v) => updateElement(el.id, { imageField: v?.value ?? '' })}
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

                          {/* ── Metric Value ── */}
                          {el.type === 'metric-value' && (
                            <>
                              <div className={styles.section}>Metric Value</div>
                              <Field label="Field name" description="Query field whose last value is displayed">
                                <Select
                                  options={fieldOptions}
                                  value={el.metricField ?? null}
                                  placeholder="Select field…"
                                  isClearable
                                  onChange={(v) => updateElement(el.id, { metricField: v?.value ?? '' })}
                                />
                              </Field>
                              <div className={styles.twoCol}>
                                <Field label="Value size px">
                                  <Input
                                    type="number"
                                    value={el.metricValueSize ?? 32}
                                    width={8}
                                    onChange={(e) => updateElement(el.id, { metricValueSize: Number(e.currentTarget.value) })}
                                  />
                                </Field>
                                <Field label="Label position">
                                  <Select
                                    width={10}
                                    options={[
                                      { label: 'Top', value: 'top' as const },
                                      { label: 'Bottom', value: 'bottom' as const },
                                    ]}
                                    value={el.metricLabelPosition ?? 'bottom'}
                                    onChange={(v) => updateElement(el.id, { metricLabelPosition: v.value! })}
                                  />
                                </Field>
                              </div>
                              <div className={styles.twoCol}>
                                <Field label="Value weight">
                                  <Select
                                    width={14}
                                    options={FONT_WEIGHT_OPTIONS}
                                    value={el.metricValueWeight ?? 700}
                                    onChange={(v) => updateElement(el.id, { metricValueWeight: Number(v.value!) })}
                                  />
                                </Field>
                                <Field label="Value style">
                                  <Select
                                    width={10}
                                    options={[
                                      { label: 'Normal', value: 'normal' as const },
                                      { label: 'Italic', value: 'italic' as const },
                                    ]}
                                    value={el.metricValueStyle ?? 'normal'}
                                    onChange={(v) => updateElement(el.id, { metricValueStyle: v.value! })}
                                  />
                                </Field>
                              </div>
                              <ColorConfigEditor
                                label="Value color"
                                value={el.metricValueColor ?? { mode: 'thresholds' }}
                                onChange={(c) => updateElement(el.id, { metricValueColor: c })}
                                fieldOptions={fieldOptions}
                              />
                            </>
                          )}

                          {/* ── Layout ── */}
                          <div className={styles.section}>Layout</div>
                          <QuickPlacement el={el} onUpdate={(p) => updateElement(el.id, p)} />

                          <div className={styles.twoCol} style={{ marginTop: 8 }}>
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

                          <PositionFields el={el} onUpdate={(p) => updateElement(el.id, p)} />

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
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className={styles.addRow}>
        <Select options={ELEMENT_TYPES} value={newType}
          onChange={(v) => setNewType(v.value!)} width={16} />
        <Button size="sm" onClick={addElement}>Add element</Button>
      </div>
    </div>
  );
};
