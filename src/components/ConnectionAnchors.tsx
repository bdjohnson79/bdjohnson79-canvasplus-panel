import React, { useRef } from 'react';
import { AnchorPoint } from '../types';

interface Props {
  onAnchorMouseDown: (anchor: AnchorPoint, clientX: number, clientY: number) => void;
}

// Normalized (x, y) in [-1,1]; (0,0) = center; (-1,1) = top-left corner.
// Matches stock Grafana Canvas panel ANCHORS array exactly.
const ANCHOR_DEFS: Array<{ anchor: AnchorPoint; x: number; y: number }> = [
  { anchor: 'nw', x: -1,   y:  1   },
  { anchor: 'n1', x: -0.5, y:  1   },
  { anchor: 'n',  x:  0,   y:  1   },
  { anchor: 'n2', x:  0.5, y:  1   },
  { anchor: 'ne', x:  1,   y:  1   },
  { anchor: 'e1', x:  1,   y:  0.5 },
  { anchor: 'e',  x:  1,   y:  0   },
  { anchor: 'e2', x:  1,   y: -0.5 },
  { anchor: 'se', x:  1,   y: -1   },
  { anchor: 's2', x:  0.5, y: -1   },
  { anchor: 's',  x:  0,   y: -1   },
  { anchor: 's1', x: -0.5, y: -1   },
  { anchor: 'sw', x: -1,   y: -1   },
  { anchor: 'w1', x: -1,   y: -0.5 },
  { anchor: 'w',  x: -1,   y:  0   },
  { anchor: 'w2', x: -1,   y:  0.5 },
];

// Same base64 SVG X icon used by the stock Grafana Canvas panel:
// 5×5px, two diagonal lines — white semi-transparent + blue #29b6f2
const X_ICON =
  'data:image/svg+xml;base64,PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAi' +
  'aHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHhtbG5zPSJodHRw' +
  'Oi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsi' +
  'IHdpZHRoPSI1cHgiIGhlaWdodD0iNXB4IiB2ZXJzaW9uPSIxLjEiPjxwYXRoIGQ9Im0gMCAwIEwgNSA1IE0gMCA1' +
  'IEwgNSAwIiBzdHJva2Utd2lkdGg9IjIiIHN0eWxlPSJzdHJva2Utb3BhY2l0eTowLjQiIHN0cm9rZT0iI2ZmZmZm' +
  'ZiIvPjxwYXRoIGQ9Im0gMCAwIEwgNSA1IE0gMCA1IEwgNSAwIiBzdHJva2U9IiMyOWI2ZjIiLz48L3N2Zz4=';

const HALF_SIZE = 2.5; // half of the 5px icon
const PADDING = 3;     // clickable padding around icon (matches stock ANCHOR_PADDING)
const HIGHLIGHT_HALF = 8; // half of 16px highlight circle

export const ConnectionAnchors: React.FC<Props> = ({ onAnchorMouseDown }) => {
  const highlightRef = useRef<HTMLDivElement>(null);

  const onAnchorEnter = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (highlightRef.current) {
      // Position highlight circle centered on the anchor image
      const top = parseFloat(img.style.top) - HIGHLIGHT_HALF + HALF_SIZE + PADDING;
      const left = parseFloat(img.style.left) - HIGHLIGHT_HALF + HALF_SIZE + PADDING;
      highlightRef.current.style.display = 'block';
      highlightRef.current.style.top = `${top}px`;
      highlightRef.current.style.left = `${left}px`;
    }
  };

  const onAnchorLeave = () => {
    if (highlightRef.current) {
      highlightRef.current.style.display = 'none';
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>

      {/* Green highlight circle — appears centered on whichever anchor is hovered */}
      <div
        ref={highlightRef}
        style={{
          display: 'none',
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#00ff00',
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 110,
        }}
      />

      {/* 16 anchor X images */}
      {ANCHOR_DEFS.map(({ anchor, x, y }) => {
        const topPct = -y * 50 + 50;
        const leftPct = x * 50 + 50;
        return (
          <img
            key={anchor}
            alt="connection anchor"
            src={X_ICON}
            style={{
              position: 'absolute',
              top: `calc(${topPct}% - ${HALF_SIZE + PADDING}px)`,
              left: `calc(${leftPct}% - ${HALF_SIZE + PADDING}px)`,
              padding: PADDING,
              width: 5 + 2 * PADDING,
              height: 5 + 2 * PADDING,
              cursor: 'crosshair',
              pointerEvents: 'auto',
              zIndex: 100,
            }}
            onMouseEnter={onAnchorEnter}
            onMouseLeave={onAnchorLeave}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAnchorMouseDown(anchor, e.clientX, e.clientY);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}
    </div>
  );
};
