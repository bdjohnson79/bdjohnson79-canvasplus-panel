import React, { useEffect, useRef } from 'react';
import { PanelProps } from '@grafana/data';
import { CanvasOptions } from '../types';
import { CanvasContainer } from './CanvasContainer';

interface Props extends PanelProps<CanvasOptions> {}

export const CanvasPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, onOptionsChange }) => {
  const prevDims = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (prevDims.current.w !== width || prevDims.current.h !== height) {
      prevDims.current = { w: width, h: height };
      onOptionsChange({ ...options, _panelWidth: width, _panelHeight: height });
    }
  });

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
