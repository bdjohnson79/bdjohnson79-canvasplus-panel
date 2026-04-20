import React from 'react';
import { PanelProps } from '@grafana/data';
import { CanvasOptions } from '../types';
import { CanvasContainer } from './CanvasContainer';

export const CanvasPanel: React.FC<PanelProps<CanvasOptions>> = ({
  options,
  data,
  width,
  height,
  onOptionsChange,
  eventBus,
}) => {
  return (
    <CanvasContainer
      options={options}
      data={data}
      width={width}
      height={height}
      onOptionsChange={onOptionsChange}
      eventBus={eventBus}
    />
  );
};
