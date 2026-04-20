import React, { useMemo, useState } from 'react';
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import { Button, Field, IconButton, Input, Select, useStyles2 } from '@grafana/ui';
import { ColorConfigEditor } from './sharedEditors';
import { css } from '@emotion/css';
import { AnchorPoint, ArrowDirection, CanvasConnection, LineStyle } from '../../types';
import { v4 as uuidv4 } from '../../utils/uuid';

const ANCHOR_OPTIONS: Array<{ label: string; value: AnchorPoint }> = [
  { label: 'Top', value: 'n' },
  { label: 'Top-Right', value: 'ne' },
  { label: 'Right', value: 'e' },
  { label: 'Bottom-Right', value: 'se' },
  { label: 'Bottom', value: 's' },
  { label: 'Bottom-Left', value: 'sw' },
  { label: 'Left', value: 'w' },
  { label: 'Top-Left', value: 'nw' },
  { label: 'Center', value: 'c' },
];

const ARROW_OPTIONS: Array<{ label: string; value: ArrowDirection }> = [
  { label: 'None', value: 'none' },
  { label: 'Forward →', value: 'forward' },
  { label: 'Backward ←', value: 'backward' },
  { label: 'Both ↔', value: 'both' },
];

const LINE_STYLE_OPTIONS: Array<{ label: string; value: LineStyle }> = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
];

function defaultConnection(): CanvasConnection {
  return {
    id: uuidv4(),
    sourceId: '',
    targetId: '',
    sourceAnchor: 'e',
    targetAnchor: 'w',
    color: { mode: 'fixed', value: '#aaaaaa' },
    width: 2,
    lineStyle: 'solid',
    arrowDirection: 'forward',
    animated: false,
  };
}

const getStyles = (theme: GrafanaTheme2) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing(0.5)} 0;
    border-bottom: 1px solid ${theme.colors.border.weak};
    cursor: pointer;
  `,
  label: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    flex: 1;
  `,
  actions: css`
    display: flex;
    gap: ${theme.spacing(0.5)};
  `,
  form: css`
    padding: ${theme.spacing(1)};
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.radius.default};
    margin-top: ${theme.spacing(0.5)};
  `,
  section: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.secondary};
    margin: ${theme.spacing(1)} 0 ${theme.spacing(0.5)};
  `,
  addRow: css`
    margin-top: ${theme.spacing(1)};
  `,
});

export const ConnectionsEditor: React.FC<StandardEditorProps<CanvasConnection[]>> = ({ value, onChange, context }) => {
  const styles = useStyles2(getStyles);
  const connections = value ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const update = (id: string, partial: Partial<CanvasConnection>) => {
    onChange(connections.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  };

  const remove = (id: string) => {
    onChange(connections.filter((c) => c.id !== id));
    if (expandedId === id) {setExpandedId(null);}
  };

  const add = () => {
    onChange([...connections, defaultConnection()]);
  };

  return (
    <div>
      {connections.map((conn) => (
        <div key={conn.id}>
          <div className={styles.row} onClick={() => setExpandedId(expandedId === conn.id ? null : conn.id)}>
            <span className={styles.label}>
              {conn.sourceId || '(no source)'} → {conn.targetId || '(no target)'}
            </span>
            <div className={styles.actions}>
              <IconButton
                name="trash-alt"
                size="sm"
                tooltip="Delete connection"
                onClick={(e) => { e.stopPropagation(); remove(conn.id); }}
              />
              <IconButton
                name={expandedId === conn.id ? 'angle-up' : 'angle-down'}
                size="sm"
                tooltip={expandedId === conn.id ? 'Collapse' : 'Expand'}
              />
            </div>
          </div>

          {expandedId === conn.id && (
            <div className={styles.form}>
              <div className={styles.section}>Endpoints</div>
              <Field label="Source element ID">
                <Input value={conn.sourceId}
                  onChange={(e) => update(conn.id, { sourceId: e.currentTarget.value })} />
              </Field>
              <Field label="Source anchor">
                <Select options={ANCHOR_OPTIONS} value={conn.sourceAnchor}
                  onChange={(v) => update(conn.id, { sourceAnchor: v.value! })} />
              </Field>
              <Field label="Target element ID">
                <Input value={conn.targetId}
                  onChange={(e) => update(conn.id, { targetId: e.currentTarget.value })} />
              </Field>
              <Field label="Target anchor">
                <Select options={ANCHOR_OPTIONS} value={conn.targetAnchor}
                  onChange={(v) => update(conn.id, { targetAnchor: v.value! })} />
              </Field>

              <div className={styles.section}>Appearance</div>
              <ColorConfigEditor
                label="Color"
                value={conn.color}
                onChange={(c) => update(conn.id, { color: c })}
                fieldOptions={fieldOptions}
              />
              <Field label="Width">
                <Input type="number" value={conn.width}
                  onChange={(e) => update(conn.id, { width: Number(e.currentTarget.value) })} />
              </Field>
              <Field label="Line style">
                <Select options={LINE_STYLE_OPTIONS} value={conn.lineStyle}
                  onChange={(v) => update(conn.id, { lineStyle: v.value! })} />
              </Field>
              <Field label="Arrow direction">
                <Select options={ARROW_OPTIONS} value={conn.arrowDirection}
                  onChange={(v) => update(conn.id, { arrowDirection: v.value! })} />
              </Field>
              <Field label="Animated">
                <Select
                  options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]}
                  value={conn.animated}
                  onChange={(v) => update(conn.id, { animated: v.value! })}
                />
              </Field>
            </div>
          )}
        </div>
      ))}

      <div className={styles.addRow}>
        <Button size="sm" onClick={add}>Add connection</Button>
      </div>
    </div>
  );
};
