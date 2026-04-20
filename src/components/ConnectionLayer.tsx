import React from 'react';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { CanvasConnection, AnchorPoint, PixelRect } from '../types';
import { resolveColor } from '../utils/colorUtils';
import { css, keyframes } from '@emotion/css';

interface Props {
  connections: CanvasConnection[];
  rectMap: Map<string, PixelRect>;
  width: number;
  height: number;
  series: DataFrame[];
  theme: GrafanaTheme2;
  editMode: boolean;
  selectedConnectionId?: string;
  onSelectConnection?: (id: string) => void;
  drawingConn?: {
    sourceId: string;
    sourceAnchor: AnchorPoint;
    x2: number;
    y2: number;
  } | null;
}

export function anchorPixel(rect: PixelRect, anchor: AnchorPoint): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const r = rect;
  switch (anchor) {
    case 'nw': return { x: r.x,                    y: r.y };
    case 'n1': return { x: r.x + r.width * 0.25,   y: r.y };
    case 'n':  return { x: cx,                      y: r.y };
    case 'n2': return { x: r.x + r.width * 0.75,   y: r.y };
    case 'ne': return { x: r.x + r.width,           y: r.y };
    case 'e1': return { x: r.x + r.width,           y: r.y + r.height * 0.25 };
    case 'e':  return { x: r.x + r.width,           y: cy };
    case 'e2': return { x: r.x + r.width,           y: r.y + r.height * 0.75 };
    case 'se': return { x: r.x + r.width,           y: r.y + r.height };
    case 's2': return { x: r.x + r.width * 0.75,   y: r.y + r.height };
    case 's':  return { x: cx,                      y: r.y + r.height };
    case 's1': return { x: r.x + r.width * 0.25,   y: r.y + r.height };
    case 'sw': return { x: r.x,                     y: r.y + r.height };
    case 'w1': return { x: r.x,                     y: r.y + r.height * 0.25 };
    case 'w':  return { x: r.x,                     y: cy };
    case 'w2': return { x: r.x,                     y: r.y + r.height * 0.75 };
  }
}

export const ALL_ANCHORS: AnchorPoint[] = [
  'nw', 'n1', 'n', 'n2', 'ne',
  'e1', 'e', 'e2',
  'se', 's2', 's', 's1', 'sw',
  'w1', 'w', 'w2',
];

function dashArray(lineStyle: string, width: number): string | undefined {
  if (lineStyle === 'dashed') { return `${width * 4},${width * 2}`; }
  if (lineStyle === 'dotted') { return `${width},${width * 2}`; }
  return undefined;
}

const marchingAnts = keyframes`
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0; }
`;

export const ConnectionLayer: React.FC<Props> = ({
  connections,
  rectMap,
  width,
  height,
  series,
  theme,
  editMode,
  selectedConnectionId,
  onSelectConnection,
  drawingConn,
}) => {
  // Rubber-band preview line while a connection is being drawn
  let previewPath: string | null = null;
  if (drawingConn) {
    const srcRect = rectMap.get(drawingConn.sourceId);
    if (srcRect) {
      const src = anchorPixel(srcRect, drawingConn.sourceAnchor);
      previewPath = `M ${src.x} ${src.y} L ${drawingConn.x2} ${drawingConn.y2}`;
    }
  }

  const hasContent = connections.length > 0 || previewPath;
  if (!hasContent) {
    return null;
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 1000,
      }}
      width={width}
      height={height}
    >
      <defs>
        {connections.map((conn) => {
          const color = resolveColor(conn.color, series, theme, theme.colors.text.secondary);
          const markers: React.ReactNode[] = [];
          if (conn.arrowDirection === 'forward' || conn.arrowDirection === 'both') {
            markers.push(
              <marker key={`${conn.id}-fwd`} id={`arrow-fwd-${conn.id}`}
                markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={color} />
              </marker>
            );
          }
          if (conn.arrowDirection === 'backward' || conn.arrowDirection === 'both') {
            markers.push(
              <marker key={`${conn.id}-bwd`} id={`arrow-bwd-${conn.id}`}
                markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto-start-reverse">
                <polygon points="10 0, 0 3.5, 10 7" fill={color} />
              </marker>
            );
          }
          return markers;
        })}
      </defs>

      {/* Existing connections — render selected last so it appears on top */}
      {[...connections]
        .sort((a, b) => (a.id === selectedConnectionId ? 1 : b.id === selectedConnectionId ? -1 : 0))
        .map((conn) => {
          const srcRect = rectMap.get(conn.sourceId);
          const tgtRect = rectMap.get(conn.targetId);
          if (!srcRect || !tgtRect) { return null; }

          const s = anchorPixel(srcRect, conn.sourceAnchor);
          const t = anchorPixel(tgtRect, conn.targetAnchor);
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
            ? css`animation: ${marchingAnts} 0.6s linear infinite;`
            : undefined;

          const markerEnd =
            conn.arrowDirection === 'forward' || conn.arrowDirection === 'both'
              ? `url(#arrow-fwd-${conn.id})` : undefined;
          const markerStart =
            conn.arrowDirection === 'backward' || conn.arrowDirection === 'both'
              ? `url(#arrow-bwd-${conn.id})` : undefined;

          return (
            <g
              key={conn.id}
              style={{ cursor: editMode ? 'pointer' : 'default' }}
              onClick={editMode && onSelectConnection ? (e) => { e.stopPropagation(); onSelectConnection(conn.id); } : undefined}
            >
              {/* Wide transparent hit area for easy clicking */}
              <path
                d={d}
                stroke="transparent"
                strokeWidth={15}
                fill="none"
                style={{ pointerEvents: editMode ? 'all' : 'none' }}
              />
              {/* Selection highlight — blue glow behind the line */}
              {isSelected && (
                <path
                  d={d}
                  stroke="#44aaff"
                  strokeOpacity={0.6}
                  strokeWidth={conn.width + 5}
                  fill="none"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Visible connection line */}
              <path
                d={d}
                stroke={color}
                strokeWidth={conn.width}
                strokeDasharray={da}
                fill="none"
                markerEnd={markerEnd}
                markerStart={markerStart}
                className={animClass}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}

      {/* Rubber-band preview line while drawing a new connection */}
      {previewPath && (
        <path
          d={previewPath}
          stroke={theme.colors.primary.border}
          strokeWidth={2}
          strokeDasharray="6,3"
          fill="none"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  );
};
