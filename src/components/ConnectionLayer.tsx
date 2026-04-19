import React, { useMemo } from 'react';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { CanvasConnection, CanvasElement, AnchorPoint } from '../types';
import { resolveColor } from '../utils/colorUtils';
import { css, keyframes } from '@emotion/css';

interface Props {
  connections: CanvasConnection[];
  elements: CanvasElement[];
  width: number;
  height: number;
  series: DataFrame[];
  theme: GrafanaTheme2;
  editMode: boolean;
  selectedConnectionId?: string;
  onSelectConnection?: (id: string) => void;
}

function anchorPixel(el: CanvasElement, anchor: AnchorPoint): { x: number; y: number } {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  switch (anchor) {
    case 'n': return { x: cx, y: el.y };
    case 'ne': return { x: el.x + el.width, y: el.y };
    case 'e': return { x: el.x + el.width, y: cy };
    case 'se': return { x: el.x + el.width, y: el.y + el.height };
    case 's': return { x: cx, y: el.y + el.height };
    case 'sw': return { x: el.x, y: el.y + el.height };
    case 'w': return { x: el.x, y: cy };
    case 'nw': return { x: el.x, y: el.y };
    case 'c': return { x: cx, y: cy };
  }
}

function dashArray(lineStyle: string, width: number): string | undefined {
  if (lineStyle === 'dashed') return `${width * 4},${width * 2}`;
  if (lineStyle === 'dotted') return `${width},${width * 2}`;
  return undefined;
}

const marchingAnts = keyframes`
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0; }
`;

export const ConnectionLayer: React.FC<Props> = ({
  connections,
  elements,
  width,
  height,
  series,
  theme,
  editMode,
  selectedConnectionId,
  onSelectConnection,
}) => {
  const elMap = useMemo(() => {
    const m: Record<string, CanvasElement> = {};
    for (const el of elements) {
      m[el.id] = el;
    }
    return m;
  }, [elements]);

  if (connections.length === 0) {
    return null;
  }

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: editMode ? 'all' : 'none', overflow: 'visible' }}
      width={width}
      height={height}
    >
      <defs>
        {connections.map((conn) => {
          const color = resolveColor(conn.color, series, theme, theme.colors.text.secondary);
          const markers: React.ReactNode[] = [];
          if (conn.arrowDirection === 'forward' || conn.arrowDirection === 'both') {
            markers.push(
              <marker
                key={`${conn.id}-fwd`}
                id={`arrow-fwd-${conn.id}`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill={color} />
              </marker>
            );
          }
          if (conn.arrowDirection === 'backward' || conn.arrowDirection === 'both') {
            markers.push(
              <marker
                key={`${conn.id}-bwd`}
                id={`arrow-bwd-${conn.id}`}
                markerWidth="8"
                markerHeight="8"
                refX="2"
                refY="3"
                orient="auto-start-reverse"
              >
                <path d="M8,0 L8,6 L0,3 z" fill={color} />
              </marker>
            );
          }
          return markers;
        })}
      </defs>

      {connections.map((conn) => {
        const src = elMap[conn.sourceId];
        const tgt = elMap[conn.targetId];
        if (!src || !tgt) {
          return null;
        }

        const s = anchorPixel(src, conn.sourceAnchor);
        const t = anchorPixel(tgt, conn.targetAnchor);
        const color = resolveColor(conn.color, series, theme, theme.colors.text.secondary);
        const da = conn.animated
          ? `${conn.width * 4},${conn.width * 2}`
          : dashArray(conn.lineStyle, conn.width);

        const isSelected = conn.id === selectedConnectionId;

        let d: string;
        if (conn.midpoint) {
          const mx = s.x + (t.x - s.x) * conn.midpoint.x;
          const my = s.y + (t.y - s.y) * conn.midpoint.y;
          d = `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`;
        } else {
          d = `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
        }

        const animClass = conn.animated
          ? css`
              animation: ${marchingAnts} 0.6s linear infinite;
            `
          : undefined;

        return (
          <path
            key={conn.id}
            d={d}
            stroke={color}
            strokeWidth={isSelected ? conn.width + 2 : conn.width}
            strokeDasharray={da}
            fill="none"
            markerEnd={
              conn.arrowDirection === 'forward' || conn.arrowDirection === 'both'
                ? `url(#arrow-fwd-${conn.id})`
                : undefined
            }
            markerStart={
              conn.arrowDirection === 'backward' || conn.arrowDirection === 'both'
                ? `url(#arrow-bwd-${conn.id})`
                : undefined
            }
            className={animClass}
            style={{ cursor: editMode ? 'pointer' : 'default' }}
            onClick={editMode && onSelectConnection ? () => onSelectConnection(conn.id) : undefined}
          />
        );
      })}
    </svg>
  );
};
