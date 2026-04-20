import React from 'react';
import { ColorPicker, Field, Input, Select } from '@grafana/ui';
import { ColorConfig, TextConfig } from '../../types';

export type FieldOptions = Array<{ label: string; value: string }>;

export const COLOR_MODE_OPTIONS = [
  { label: 'Fixed', value: 'fixed' as const },
  { label: 'Field', value: 'field' as const },
  { label: 'Thresholds', value: 'thresholds' as const },
];

export const TEXT_MODE_OPTIONS = [
  { label: 'Fixed', value: 'fixed' as const },
  { label: 'Field', value: 'field' as const },
];

interface ColorConfigEditorProps {
  label: string;
  value: ColorConfig;
  onChange: (cfg: ColorConfig) => void;
  fieldOptions: FieldOptions;
}

export const ColorConfigEditor: React.FC<ColorConfigEditorProps> = ({ label, value, onChange, fieldOptions }) => (
  <Field label={label}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Select
        width={16}
        options={COLOR_MODE_OPTIONS}
        value={value.mode}
        onChange={(v) => {
          if (v.value === 'fixed') { onChange({ mode: 'fixed', value: '#ffffff' }); }
          else if (v.value === 'field') { onChange({ mode: 'field', field: fieldOptions[0]?.value ?? '' }); }
          else { onChange({ mode: 'thresholds' }); }
        }}
      />
      {value.mode === 'fixed' && (
        <ColorPicker
          color={value.value}
          onChange={(c) => onChange({ mode: 'fixed', value: c })}
        >
          {({ ref, showColorPicker }) => (
            <div
              ref={ref}
              onClick={showColorPicker}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: value.value,
                cursor: 'pointer',
                border: '1px solid rgba(128,128,128,0.4)',
                flexShrink: 0,
              }}
            />
          )}
        </ColorPicker>
      )}
      {value.mode === 'field' && (
        <Select
          options={fieldOptions}
          value={(value as Extract<ColorConfig, { mode: 'field' }>).field || null}
          placeholder="Select field…"
          isClearable
          onChange={(v) => onChange({ mode: 'field', field: v?.value ?? '' })}
        />
      )}
    </div>
  </Field>
);

interface TextConfigEditorProps {
  label: string;
  value: TextConfig;
  onChange: (cfg: TextConfig) => void;
  fieldOptions: FieldOptions;
}

export const TextConfigEditor: React.FC<TextConfigEditorProps> = ({ label, value, onChange, fieldOptions }) => (
  <Field label={label}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Select
        width={16}
        options={TEXT_MODE_OPTIONS}
        value={value.mode}
        onChange={(v) => {
          if (v.value === 'fixed') { onChange({ mode: 'fixed', value: '' }); }
          else { onChange({ mode: 'field', field: fieldOptions[0]?.value ?? '' }); }
        }}
      />
      {value.mode === 'fixed' && (
        <Input
          value={value.value}
          onChange={(e) => onChange({ mode: 'fixed', value: e.currentTarget.value })}
        />
      )}
      {value.mode === 'field' && (
        <Select
          options={fieldOptions}
          value={(value as Extract<TextConfig, { mode: 'field' }>).field || null}
          placeholder="Select field…"
          isClearable
          onChange={(v) => onChange({ mode: 'field', field: v?.value ?? '' })}
        />
      )}
    </div>
  </Field>
);
