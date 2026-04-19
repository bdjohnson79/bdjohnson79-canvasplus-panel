export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'icon'
  | 'server'
  | 'cloud'
  | 'triangle'
  | 'parallelogram';

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
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  fontFamily: string;
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
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  background: BackgroundStyle;
  border: BorderStyle;
  text?: TextStyle & { content: TextConfig };
  iconName?: string;
  iconColor?: ColorConfig;
  serverVariant?: 'single' | 'stack' | 'database' | 'terminal';
  statusColor?: ColorConfig;
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
