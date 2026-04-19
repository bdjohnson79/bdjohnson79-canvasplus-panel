import React from 'react';
import { PanelProps } from '@grafana/data';
import { CanvasOptions } from '../types';
import { CanvasContainer } from './CanvasContainer';

interface Props extends PanelProps<CanvasOptions> {}

export const CanvasPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, onOptionsChange }) => {
  return (
    <CanvasContainer
      options={options}
      data={data}
      fieldConfig={fieldConfig}
      width={width}
      height={height}
      onOptionsChange={onOptionsChange}
    />
  );
};
