import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useTheme2, IconButton } from '@grafana/ui';
import { CanvasElement, PixelRect } from '../../types';
import { pixelToPlacement } from '../../utils/placement';
import { useCanvasEdit } from '../CanvasContainer';

interface Props {
  element: CanvasElement;
  resolvedPos: PixelRect;
  panelWidth: number;
  panelHeight: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  onUpdate: (partial: Partial<CanvasElement>) => void;
  onSelect: () => void;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

const HANDLE_SIZE = 8;

const HANDLES: Array<{ id: Handle; cursor: string; top: string; left: string; transform: string }> = [
  { id: 'nw', cursor: 'nw-resize', top: '0', left: '0', transform: 'translate(-50%,-50%)' },
  { id: 'n',  cursor: 'n-resize',  top: '0', left: '50%', transform: 'translate(-50%,-50%)' },
  { id: 'ne', cursor: 'ne-resize', top: '0', left: '100%', transform: 'translate(-50%,-50%)' },
  { id: 'e',  cursor: 'e-resize',  top: '50%', left: '100%', transform: 'translate(-50%,-50%)' },
  { id: 'se', cursor: 'se-resize', top: '100%', left: '100%', transform: 'translate(-50%,-50%)' },
  { id: 's',  cursor: 's-resize',  top: '100%', left: '50%', transform: 'translate(-50%,-50%)' },
  { id: 'sw', cursor: 'sw-resize', top: '100%', left: '0', transform: 'translate(-50%,-50%)' },
  { id: 'w',  cursor: 'w-resize',  top: '50%', left: '0', transform: 'translate(-50%,-50%)' },
];

export const DragLayer: React.FC<Props> = ({
  element,
  resolvedPos,
  panelWidth,
  panelHeight,
  canvasRef,
  onUpdate,
  onSelect,
}) => {
  const theme = useTheme2();
  const ctx = useCanvasEdit();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  useEffect(() => {
    if (!menuOpen) { return; }
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const canvasOffset = useCallback(() => {
    if (!canvasRef.current) {return { x: 0, y: 0 };}
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }, [canvasRef]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, handle: Handle) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();
      const offset = canvasOffset();
      dragState.current = {
        handle,
        startX: e.clientX - offset.x,
        startY: e.clientY - offset.y,
        origX: resolvedPos.x,
        origY: resolvedPos.y,
        origW: resolvedPos.width,
        origH: resolvedPos.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [resolvedPos, onSelect, canvasOffset]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) {return;}
      const offset = canvasOffset();
      const cx = e.clientX - offset.x;
      const cy = e.clientY - offset.y;
      const dx = cx - dragState.current.startX;
      const dy = cy - dragState.current.startY;
      const { handle, origX, origY, origW, origH } = dragState.current;

      const MIN = 10;
      let x = origX, y = origY, w = origW, h = origH;

      if (handle === 'move') {
        x = origX + dx;
        y = origY + dy;
      } else {
        if (handle.includes('e')) { w = Math.max(MIN, origW + dx); }
        if (handle.includes('w')) { x = origX + dx; w = Math.max(MIN, origW - dx); }
        if (handle.includes('s')) { h = Math.max(MIN, origH + dy); }
        if (handle.includes('n')) { y = origY + dy; h = Math.max(MIN, origH - dy); }
      }

      const newPlacement = pixelToPlacement(x, y, w, h, element.constraint, panelWidth, panelHeight);
      onUpdate({ placement: { ...element.placement, ...newPlacement } });
    },
    [onUpdate, canvasOffset, element.constraint, element.placement, panelWidth, panelHeight]
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: resolvedPos.x - 1,
        top: resolvedPos.y - 1,
        width: resolvedPos.width + 2,
        height: resolvedPos.height + 2,
        boxSizing: 'border-box',
        border: '1px solid #4e9fff',
        pointerEvents: 'none',
        zIndex: element.zIndex + 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* move overlay */}
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'move', pointerEvents: 'all' }}
        onPointerDown={(e) => onPointerDown(e, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {HANDLES.map(({ id, cursor, top, left, transform }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            top,
            left,
            transform,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: '#fff',
            border: '1px solid #4e9fff',
            borderRadius: 2,
            cursor,
            pointerEvents: 'all',
            zIndex: 1,
          }}
          onPointerDown={(e) => onPointerDown(e, id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ))}

      {/* Gear icon + context menu — anchored to the right edge of the selection border */}
      <div
        ref={menuRef}
        style={{
          position: 'absolute',
          top: 0,
          left: '100%',
          marginLeft: 4,
          pointerEvents: 'all',
          zIndex: 2,
        }}
      >
        <IconButton
          name="cog"
          size="sm"
          tooltip="Element options"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          style={{ background: theme.colors.background.primary, border: `1px solid ${theme.colors.border.medium}` }}
        />

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              marginTop: 2,
              background: theme.colors.background.primary,
              border: `1px solid ${theme.colors.border.medium}`,
              borderRadius: theme.shape.radius.default,
              boxShadow: theme.shadows.z3,
              zIndex: 9999,
              minWidth: 140,
              opacity: 1,
            }}
          >
            {element.type === 'metric-value' && (
              <button
                style={menuItemStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = theme.colors.action.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  ctx?.requestEdit(element.id);
                }}
              >
                Edit
              </button>
            )}
            <button
              style={menuItemStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = theme.colors.action.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                ctx?.duplicateElement(element.id);
              }}
            >
              Duplicate
            </button>
            <button
              style={menuItemStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = theme.colors.action.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                ctx?.moveToTop(element.id);
              }}
            >
              Move to top
            </button>
            <button
              style={menuItemStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = theme.colors.action.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                ctx?.moveToBottom(element.id);
              }}
            >
              Move to bottom
            </button>
            <button
              style={{
                ...menuItemStyle,
                color: theme.colors.error.text,
                borderTop: `1px solid ${theme.colors.border.weak}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = theme.colors.action.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                ctx?.deleteElement(element.id);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
