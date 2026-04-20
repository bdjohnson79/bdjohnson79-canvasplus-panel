export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'icon'
  | 'server'
  | 'cloud'
  | 'triangle'
  | 'parallelogram'
  | 'image'
  | 'metric-value';

export type HorizontalConstraint = 'left' | 'right' | 'center' | 'leftright';
export type VerticalConstraint = 'top' | 'bottom' | 'center' | 'topbottom';

export interface ElementConstraint {
  horizontal: HorizontalConstraint;
  vertical: VerticalConstraint;
}

export interface Placement {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  rotation: number;
}

export type ColorConfig =
  | { mode: 'fixed'; value: string }
  | { mode: 'field'; field: string }
  | { mode: 'thresholds' };

export type TextConfig =
  | { mode: 'fixed'; value: string }
  | { mode: 'field'; field: string };

export interface TextStyle {
  size: number;
  align: 'left' | 'center' | 'right';
  color: ColorConfig;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
}

export interface BorderStyle {
  width: number;
  color: ColorConfig;
  radius: number;
}

export interface BackgroundStyle {
  color: ColorConfig;
  image?: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;
  placement: Placement;
  constraint: ElementConstraint;
  background: BackgroundStyle;
  border: BorderStyle;
  text?: TextStyle & { content: TextConfig };
  iconName?: string;
  iconColor?: ColorConfig;
  serverVariant?: 'single' | 'stack' | 'database' | 'terminal';
  statusColor?: ColorConfig;
  imageSource?: 'inline' | 'field';
  imageData?: string;
  imageFormat?: 'svg+xml' | 'svg+xml;base64' | 'png' | 'jpeg' | 'gif' | 'webp';
  imageField?: string;
  imageFit?: 'contain' | 'cover' | 'fill' | 'none';
  metricField?: string;
  metricValueSize?: number;
  metricValueWeight?: number;
  metricValueStyle?: 'normal' | 'italic';
  metricLabelPosition?: 'top' | 'bottom';
  metricValueColor?: ColorConfig;
  zIndex: number;
}

export type AnchorPoint = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'c';

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type ArrowDirection = 'none' | 'forward' | 'backward' | 'both';

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor: AnchorPoint;
  targetAnchor: AnchorPoint;
  color: ColorConfig;
  width: number;
  lineStyle: LineStyle;
  arrowDirection: ArrowDirection;
  animated: boolean;
  midpoint?: { x: number; y: number };
}

export interface CanvasOptions {
  elements: CanvasElement[];
  connections: CanvasConnection[];
  background: { color: string; image?: string };
  inlineEditing: boolean;
  panZoom: boolean;
}

/** Resolved absolute pixel rect — used internally for rendering, drag, and connections. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
