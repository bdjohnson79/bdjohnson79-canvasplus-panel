import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EventBus, GrafanaTheme2, PanelData } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { AnchorPoint, CanvasConnection, CanvasElement, CanvasOptions, PixelRect } from '../types';
import { resolvePixelRect } from '../utils/placement';
import { ElementRegistry } from './elements';
import { useDataBinding } from './hooks/useDataBinding';
import { ConnectionLayer, ConnectionLayerHandle, anchorPixel, ALL_ANCHORS } from './ConnectionLayer';
import { ConnectionAnchors } from './ConnectionAnchors';
import { DragLayer } from './editor/DragLayer';
import { CanvasElementSelectedEvent, CanvasElementDeleteEvent } from '../events';
import { v4 as uuidv4 } from '../utils/uuid';

// ── Nearest anchor helper ─────────────────────────────────────────────────────

function nearestAnchor(rect: PixelRect, x: number, y: number): AnchorPoint {
  let best: AnchorPoint = 'n';
  let bestDist = Infinity;
  for (const anchor of ALL_ANCHORS) {
    const pt = anchorPixel(rect, anchor);
    const d = Math.hypot(pt.x - x, pt.y - y);
    if (d < bestDist) { bestDist = d; best = anchor; }
  }
  return best;
}

// ── Edit context ──────────────────────────────────────────────────────────────

interface EditContextValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  updateConnection: (id: string, partial: Partial<CanvasConnection>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveToTop: (id: string) => void;
  moveToBottom: (id: string) => void;
  requestEdit: (id: string) => void;
}

const CanvasEditContext = createContext<EditContextValue | null>(null);

export function useCanvasEdit() {
  return useContext(CanvasEditContext);
}

// ── Single element wrapper ────────────────────────────────────────────────────

interface ElementWrapperProps {
  element: CanvasElement;
  rect: PixelRect;
  data: PanelData;
  theme: GrafanaTheme2;
  editMode: boolean;
  isSelected: boolean;
  panelWidth: number;
  panelHeight: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  eventBus: EventBus;
  onHoverChange: (id: string | null) => void;
  onAnchorMouseDown: (elementId: string, anchor: AnchorPoint, clientX: number, clientY: number) => void;
}

const ElementWrapper: React.FC<ElementWrapperProps> = ({
  element,
  rect,
  data,
  theme,
  editMode,
  isSelected,
  panelWidth,
  panelHeight,
  canvasRef,
  eventBus,
  onHoverChange,
  onAnchorMouseDown,
}) => {
  const ctx = useCanvasEdit();
  const resolved = useDataBinding(element, data, theme);
  const [showAnchors, setShowAnchors] = useState(false);
  const Component = ElementRegistry[element.type];

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editMode) {
        e.stopPropagation();
        ctx?.setSelectedId(element.id);
        eventBus.publish(new CanvasElementSelectedEvent({ elementId: element.id }));
        return;
      }

      const fieldName =
        element.metricField ||
        (element.text?.content?.mode === 'field' ? element.text.content.field : undefined);
      if (!fieldName) {
        return;
      }

      for (const frame of data.series) {
        const field = frame.fields.find((f) => f.name === fieldName);
        if (field?.getLinks) {
          const lastIdx = Math.max(0, field.values.length - 1);
          const links = field.getLinks({ valueRowIndex: lastIdx });
          if (links.length > 0) {
            if (links[0].onClick) {
              links[0].onClick(e.nativeEvent);
            } else {
              window.open(links[0].href, links[0].target ?? '_self');
            }
          }
          break;
        }
      }
    },
    [editMode, ctx, element, data.series, eventBus]
  );

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          transform: element.placement.rotation ? `rotate(${element.placement.rotation}deg)` : undefined,
          zIndex: element.zIndex,
          boxSizing: 'border-box',
          cursor: editMode ? 'pointer' : 'default',
        }}
        onClick={handleClick}
        onMouseEnter={() => {
          if (editMode) {
            onHoverChange(element.id);
            setShowAnchors(true);
          }
        }}
        onMouseLeave={() => {
          if (editMode) {
            onHoverChange(null);
            setShowAnchors(false);
          }
        }}
      >
        {/* 30px hover-extension zone — pointer-events: auto makes the browser treat
            this area as part of the element's DOM subtree, so mouseleave on the
            wrapper fires only when cursor is 30px beyond the element boundary.
            Rendered before content so it sits visually behind the element body. */}
        {editMode && !isSelected && showAnchors && (
          <div
            style={{
              position: 'absolute',
              top: -30,
              left: -30,
              width: 'calc(100% + 60px)',
              height: 'calc(100% + 60px)',
              pointerEvents: 'auto',
            }}
          />
        )}

        <Component element={element} resolved={resolved} rect={rect} isSelected={isSelected} editMode={editMode} />

        {/* Anchor X overlay — only shown on hover; hidden when selected or cursor leaves 30px buffer */}
        {editMode && !isSelected && showAnchors && (
          <ConnectionAnchors
            rotation={element.placement.rotation ?? 0}
            onAnchorMouseDown={(anchor, clientX, clientY) =>
              onAnchorMouseDown(element.id, anchor, clientX, clientY)
            }
          />
        )}
      </div>

      {editMode && isSelected && ctx && (
        <DragLayer
          element={element}
          resolvedPos={rect}
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          canvasRef={canvasRef}
          onUpdate={(partial) => ctx.updateElement(element.id, partial)}
          onSelect={() => ctx.setSelectedId(element.id)}
        />
      )}
    </>
  );
};

// ── Main container ────────────────────────────────────────────────────────────

interface Props {
  options: CanvasOptions;
  data: PanelData;
  width: number;
  height: number;
  onOptionsChange: (opts: CanvasOptions) => void;
  eventBus: EventBus;
}

export const CanvasContainer: React.FC<Props> = ({
  options,
  data,
  width,
  height,
  onOptionsChange,
  eventBus,
}) => {
  const theme = useTheme2();
  const canvasRef = useRef<HTMLDivElement>(null);
  const connectionLayerRef = useRef<ConnectionLayerHandle>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Connection drag source — no x2/y2 here; the preview line is updated imperatively
  // via connectionLayerRef to avoid a React re-render on every mousemove frame.
  const [drawingConnSrc, setDrawingConnSrc] = useState<{
    sourceId: string;
    sourceAnchor: AnchorPoint;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  // Subscribe to selection events from the sidebar editor
  useEffect(() => {
    const sub = eventBus.subscribe(CanvasElementSelectedEvent, (event) => {
      setSelectedId(event.payload.elementId);
    });
    return () => sub.unsubscribe();
  }, [eventBus]);

  // ESC cancels an in-progress connection drag or clears selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        connectionLayerRef.current?.clearPreview();
        setDrawingConnSrc(null);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Delete key removes the selected connection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedConnectionId) {
        onOptionsChange({
          ...options,
          connections: (options.connections ?? []).filter((c) => c.id !== selectedConnectionId),
        });
        setSelectedConnectionId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedConnectionId, options, onOptionsChange]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // ── option helpers ──────────────────────────────────────────────────────────

  const updateElement = useCallback(
    (id: string, partial: Partial<CanvasElement>) => {
      onOptionsChange({
        ...options,
        elements: (options.elements ?? []).map((el) => (el.id === id ? { ...el, ...partial } : el)),
      });
    },
    [options, onOptionsChange]
  );

  const updateConnection = useCallback(
    (id: string, partial: Partial<CanvasConnection>) => {
      onOptionsChange({
        ...options,
        connections: (options.connections ?? []).map((c) => (c.id === id ? { ...c, ...partial } : c)),
      });
    },
    [options, onOptionsChange]
  );

  const deleteElement = useCallback(
    (id: string) => {
      onOptionsChange({
        ...options,
        elements: (options.elements ?? []).filter((el) => el.id !== id),
        connections: (options.connections ?? []).filter((c) => c.sourceId !== id && c.targetId !== id),
      });
      setSelectedId(null);
    },
    [options, onOptionsChange]
  );

  // Use a ref so the CanvasElementDeleteEvent subscription never stales —
  // deleteElement changes whenever options changes, but the subscription only
  // needs to be set up once per eventBus instance.
  const deleteElementRef = useRef(deleteElement);
  useEffect(() => {
    deleteElementRef.current = deleteElement;
  });

  useEffect(() => {
    const sub = eventBus.subscribe(CanvasElementDeleteEvent, (event) => {
      deleteElementRef.current(event.payload.elementId);
    });
    return () => sub.unsubscribe();
  }, [eventBus]);

  const duplicateElement = useCallback(
    (id: string) => {
      const elements = options.elements ?? [];
      const source = elements.find((el) => el.id === id);
      if (!source) { return; }
      const zIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) + 1 : 1;
      const copy: CanvasElement = {
        ...source,
        id: uuidv4(),
        name: `${source.name}-copy`,
        zIndex,
        placement: { ...source.placement, top: source.placement.top + 5, left: source.placement.left + 5 },
      };
      onOptionsChange({ ...options, elements: [...elements, copy] });
    },
    [options, onOptionsChange]
  );

  const moveToTop = useCallback(
    (id: string) => {
      const elements = options.elements ?? [];
      const maxZ = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) : 0;
      onOptionsChange({
        ...options,
        elements: elements.map((el) => (el.id === id ? { ...el, zIndex: maxZ + 1 } : el)),
      });
    },
    [options, onOptionsChange]
  );

  const moveToBottom = useCallback(
    (id: string) => {
      onOptionsChange({
        ...options,
        elements: (options.elements ?? []).map((el) =>
          el.id === id ? { ...el, zIndex: 0 } : { ...el, zIndex: el.zIndex + 1 }
        ),
      });
    },
    [options, onOptionsChange]
  );

  const requestEdit = useCallback(
    (id: string) => {
      eventBus.publish(new CanvasElementSelectedEvent({ elementId: id }));
    },
    [eventBus]
  );

  // ── connection drawing ──────────────────────────────────────────────────────

  const handleAnchorMouseDown = useCallback(
    (elementId: string, anchor: AnchorPoint, clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) { return; }
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top  - pan.y) / zoom;
      setDrawingConnSrc({ sourceId: elementId, sourceAnchor: anchor, startClientX: clientX, startClientY: clientY });
      connectionLayerRef.current?.updatePreview(elementId, anchor, x, y);
    },
    [pan, zoom]
  );

  const editCtx: EditContextValue = {
    selectedId,
    setSelectedId,
    updateElement,
    updateConnection,
    deleteElement,
    duplicateElement,
    moveToTop,
    moveToBottom,
    requestEdit,
  };

  // ── pan/zoom + connection drag handlers ─────────────────────────────────────

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!options.panZoom) { return; }
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.25, z - e.deltaY * 0.001)));
    },
    [options.panZoom]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!options.panZoom || e.button !== 1) { return; }
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [options.panZoom, pan]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      }
      if (drawingConnSrc) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - pan.x) / zoom;
          const y = (e.clientY - rect.top  - pan.y) / zoom;
          connectionLayerRef.current?.updatePreview(drawingConnSrc.sourceId, drawingConnSrc.sourceAnchor, x, y);
        }
      }
    },
    [drawingConnSrc, pan, zoom]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      isPanning.current = false;

      if (!drawingConnSrc) { return; }

      const dist = Math.hypot(
        e.clientX - drawingConnSrc.startClientX,
        e.clientY - drawingConnSrc.startClientY
      );

      if (dist >= 8 && hoveredElementId && hoveredElementId !== drawingConnSrc.sourceId) {
        const elements = options.elements ?? [];
        const targetEl = elements.find((el) => el.id === hoveredElementId);
        if (targetEl && canvasRef.current) {
          const targetRect = resolvePixelRect(targetEl.placement, targetEl.constraint, width, height);
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const cx = (e.clientX - canvasRect.left - pan.x) / zoom;
          const cy = (e.clientY - canvasRect.top  - pan.y) / zoom;
          const targetAnchor = nearestAnchor(targetRect, cx, cy);
          onOptionsChange({
            ...options,
            connections: [
              ...(options.connections ?? []),
              {
                id: uuidv4(),
                sourceId: drawingConnSrc.sourceId,
                sourceAnchor: drawingConnSrc.sourceAnchor,
                targetId: hoveredElementId,
                targetAnchor,
                color: { mode: 'fixed', value: theme.colors.text.secondary },
                width: 2,
                lineStyle: 'solid',
                arrowDirection: 'forward',
                animated: false,
              },
            ],
          });
        }
      }

      connectionLayerRef.current?.clearPreview();
      setDrawingConnSrc(null);
    },
    [drawingConnSrc, hoveredElementId, options, width, height, onOptionsChange, pan, zoom, theme]
  );

  // ── resolve pixel rects for all elements ────────────────────────────────────

  const elements = options.elements ?? [];
  const connections = options.connections ?? [];

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const rectMap = new Map<string, PixelRect>();
  for (const el of elements) {
    rectMap.set(el.id, resolvePixelRect(el.placement, el.constraint, width, height));
  }

  return (
    <CanvasEditContext.Provider value={editCtx}>
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          width,
          height,
          overflow: 'hidden',
          background: options.background.color || 'transparent',
          backgroundImage: options.background.image ? `url(${options.background.image})` : undefined,
          backgroundSize: 'cover',
          cursor: drawingConnSrc ? 'crosshair' : undefined,
        }}
        onClick={() => {
          if (options.inlineEditing) {
            setSelectedId(null);
            setSelectedConnectionId(null);
            connectionLayerRef.current?.clearPreview();
            setDrawingConnSrc(null);
          }
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: options.panZoom
              ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              : undefined,
            transformOrigin: '0 0',
          }}
        >
          {sortedElements.map((el) => {
            const rect = rectMap.get(el.id)!;
            return (
              <ElementWrapper
                key={el.id}
                element={el}
                rect={rect}
                data={data}
                theme={theme}
                editMode={options.inlineEditing}
                isSelected={el.id === selectedId}
                panelWidth={width}
                panelHeight={height}
                canvasRef={canvasRef}
                eventBus={eventBus}
                onHoverChange={setHoveredElementId}
                onAnchorMouseDown={handleAnchorMouseDown}
              />
            );
          })}

          <ConnectionLayer
            ref={connectionLayerRef}
            connections={connections}
            rectMap={rectMap}
            width={width}
            height={height}
            series={data.series}
            theme={theme}
            editMode={options.inlineEditing}
            selectedConnectionId={selectedConnectionId ?? undefined}
            onSelectConnection={setSelectedConnectionId}
          />
        </div>
      </div>
    </CanvasEditContext.Provider>
  );
};
