import React from 'react';
import { ElementType, CanvasElement, PixelRect } from '../../types';
import { ResolvedStyle } from '../hooks/useDataBinding';

export interface ElementProps {
  element: CanvasElement;
  resolved: ResolvedStyle;
  rect: PixelRect;
  isSelected: boolean;
  editMode: boolean;
}

import { RectangleElement } from './RectangleElement';
import { EllipseElement } from './EllipseElement';
import { TextElement } from './TextElement';
import { IconElement } from './IconElement';
import { ServerElement } from './ServerElement';
import { CloudElement } from './CloudElement';
import { TriangleElement } from './TriangleElement';
import { BlockArrowElement } from './BlockArrowElement';
import { ImageElement } from './ImageElement';
import { MetricValueElement } from './MetricValueElement';

export const ElementRegistry: Record<ElementType, React.FC<ElementProps>> = {
  rectangle: RectangleElement,
  ellipse: EllipseElement,
  text: TextElement,
  icon: IconElement,
  server: ServerElement,
  cloud: CloudElement,
  triangle: TriangleElement,
  'block-arrow': BlockArrowElement,
  image: ImageElement,
  'metric-value': MetricValueElement,
};
