import React from 'react';
import { StandardEditorProps } from '@grafana/data';

export const TextAreaEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => (
  <textarea
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    style={{ width: '100%', minHeight: '80px', fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}
  />
);
