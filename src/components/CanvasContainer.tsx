import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EventBus, GrafanaTheme2, PanelData } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { AnchorPoint, BackgroundImageSize, CanvasConnection, CanvasElement, CanvasGroup, CanvasOptions, PixelRect } from '../types';
import { resolvePixelRect } from '../utils/placement';
import { resolveBackgroundImage } from '../utils/colorUtils';
import { ElementRegistry } from './elements';
import { useDataBinding } from './hooks/useDataBinding';
import { ConnectionLayer, ConnectionLayerHandle, anchorPixel, ALL_ANCHORS } from './ConnectionLayer';
import { ConnectionAnchors } from './ConnectionAnchors';
import { DragLayer } from './editor/DragLayer';
import { CanvasElementSelectedEvent, CanvasElementDeleteEvent, GroupElementsEvent, UngroupElementsEvent } from '../events';
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
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  updateConnection: (id: string, partial: Partial<CanvasConnection>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveToTop: (id: string) => void;
  moveToBottom: (id: string) => void;
  requestEdit: (id: string) => void;
  groupElements: (ids: string[]) => void;
  ungroupElements: (groupId: string) => void;
  selectGroup: (groupId: string) => void;
  toggleSelection: (id: string, groupId: string | null) => void;
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

  const isInSelection = ctx ? ctx.selectedIds.has(element.id) && element.id !== ctx.selectedId : false;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editMode) {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          ctx?.toggleSelection(element.id, element.groupId ?? null);
        } else if (element.groupId) {
          ctx?.selectGroup(element.groupId);
          eventBus.publish(new CanvasElementSelectedEvent({ elementId: element.id }));
        } else {
          ctx?.setSelectedId(element.id);
          ctx?.setSelectedIds(new Set([element.id]));
          eventBus.publish(new CanvasElementSelectedEvent({ elementId: element.id }));
        }
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

      {editMode && isInSelection && (
        <div
          style={{
            position: 'absolute',
            left: rect.x - 1,
            top: rect.y - 1,
            width: rect.width + 2,
            height: rect.height + 2,
            border: '1px dashed #4e9fff',
            pointerEvents: 'none',
            zIndex: element.zIndex + 999,
          }}
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
      setSelectedIds(event.payload.elementId ? new Set([event.payload.elementId]) : new Set());
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
        setSelectedIds(new Set());
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
      const elements = options.elements ?? [];
      const element = elements.find((el) => el.id === id);

      // Group-move: placement-only update where size is unchanged and element belongs to a group
      const isMoveOnly =
        partial.placement != null &&
        element != null &&
        partial.placement.width === element.placement.width &&
        partial.placement.height === element.placement.height;

      if (isMoveOnly && element?.groupId) {
        const oldP = element.placement;
        const newP = partial.placement!;
        const dTop    = newP.top    - oldP.top;
        const dLeft   = newP.left   - oldP.left;
        const dRight  = newP.right  - oldP.right;
        const dBottom = newP.bottom - oldP.bottom;
        const gid = element.groupId;

        onOptionsChange({
          ...options,
          elements: elements.map((el) => {
            if (el.id === id) { return { ...el, ...partial }; }
            if (el.groupId === gid) {
              return {
                ...el,
                placement: {
                  ...el.placement,
                  top:    el.placement.top    + dTop,
                  left:   el.placement.left   + dLeft,
                  right:  el.placement.right  + dRight,
                  bottom: el.placement.bottom + dBottom,
                },
              };
            }
            return el;
          }),
        });
        return;
      }

      onOptionsChange({
        ...options,
        elements: elements.map((el) => (el.id === id ? { ...el, ...partial } : el)),
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
      const remaining = (options.elements ?? []).filter((el) => el.id !== id);
      const usedGroupIds = new Set(remaining.filter((el) => el.groupId).map((el) => el.groupId!));
      const newGroups = (options.groups ?? []).filter((g) => usedGroupIds.has(g.id));
      onOptionsChange({
        ...options,
        elements: remaining,
        connections: (options.connections ?? []).filter((c) => c.sourceId !== id && c.targetId !== id),
        groups: newGroups,
      });
      setSelectedId(null);
      setSelectedIds(new Set());
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
        groupId: undefined,
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

  const groupElements = useCallback(
    (ids: string[]) => {
      const elements = options.elements ?? [];
      const targets = elements.filter((el) => ids.includes(el.id));
      if (targets.length < 2) { return; }
      const sorted = [...targets].sort((a, b) => a.zIndex - b.zIndex);
      const maxZ = Math.max(...sorted.map((el) => el.zIndex));
      const count = sorted.length;
      const newZMap = new Map<string, number>();
      sorted.forEach((el, i) => { newZMap.set(el.id, maxZ - count + 1 + i); });
      const groupId = uuidv4();
      const groupName = `Group ${(options.groups ?? []).length + 1}`;
      const newGroup: CanvasGroup = { id: groupId, name: groupName };
      onOptionsChange({
        ...options,
        elements: elements.map((el) =>
          newZMap.has(el.id) ? { ...el, groupId, zIndex: newZMap.get(el.id)! } : el
        ),
        groups: [...(options.groups ?? []), newGroup],
      });
      setSelectedIds(new Set(ids));
      setSelectedId(ids[0] ?? null);
    },
    [options, onOptionsChange]
  );

  const ungroupElements = useCallback(
    (groupId: string) => {
      onOptionsChange({
        ...options,
        elements: (options.elements ?? []).map((el) =>
          el.groupId === groupId ? { ...el, groupId: undefined } : el
        ),
        groups: (options.groups ?? []).filter((g) => g.id !== groupId),
      });
      setSelectedId(null);
      setSelectedIds(new Set());
    },
    [options, onOptionsChange]
  );

  const selectGroup = useCallback(
    (groupId: string) => {
      const members = (options.elements ?? []).filter((el) => el.groupId === groupId);
      const ids = new Set(members.map((el) => el.id));
      setSelectedIds(ids);
      const first = [...members].sort((a, b) => a.zIndex - b.zIndex)[0];
      setSelectedId(first?.id ?? null);
    },
    [options.elements]
  );

  const toggleSelection = useCallback(
    (id: string, groupId: string | null) => {
      if (groupId) {
        const groupMemberIds = (options.elements ?? [])
          .filter((el) => el.groupId === groupId)
          .map((el) => el.id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          const allIn = groupMemberIds.every((mid) => prev.has(mid));
          if (allIn) {
            groupMemberIds.forEach((mid) => next.delete(mid));
          } else {
            groupMemberIds.forEach((mid) => next.add(mid));
          }
          return next;
        });
        setSelectedId((prev) => (prev === id ? null : id));
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) { next.delete(id); } else { next.add(id); }
          return next;
        });
        setSelectedId((prev) => (prev === id ? null : id));
      }
    },
    [options.elements]
  );

  // Ref-based subscriptions for group events (same pattern as deleteElementRef)
  const groupElementsRef = useRef(groupElements);
  const ungroupElementsRef = useRef(ungroupElements);
  useEffect(() => { groupElementsRef.current = groupElements; });
  useEffect(() => { ungroupElementsRef.current = ungroupElements; });

  useEffect(() => {
    const sub = eventBus.subscribe(GroupElementsEvent, (event) => {
      groupElementsRef.current(event.payload.elementIds);
    });
    return () => sub.unsubscribe();
  }, [eventBus]);

  useEffect(() => {
    const sub = eventBus.subscribe(UngroupElementsEvent, (event) => {
      ungroupElementsRef.current(event.payload.groupId);
    });
    return () => sub.unsubscribe();
  }, [eventBus]);

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
    selectedIds,
    setSelectedIds,
    updateElement,
    updateConnection,
    deleteElement,
    duplicateElement,
    moveToTop,
    moveToBottom,
    requestEdit,
    groupElements,
    ungroupElements,
    selectGroup,
    toggleSelection,
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

  // ── resolve background image ─────────────────────────────────────────────────

  const bgImageUrl = resolveBackgroundImage(options.background, data.series);
  const bgSizeMap: Record<BackgroundImageSize, string> = {
    auto: 'auto',
    cover: 'cover',
    contain: 'contain',
    stretch: '100% 100%',
  };
  const bgSize = bgSizeMap[options.background.imageSize ?? 'cover'];

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
          backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
          backgroundSize: bgImageUrl ? bgSize : undefined,
          backgroundRepeat: bgImageUrl ? 'no-repeat' : undefined,
          backgroundPosition: bgImageUrl ? 'center' : undefined,
          cursor: drawingConnSrc ? 'crosshair' : undefined,
        }}
        onClick={() => {
          if (options.inlineEditing) {
            setSelectedId(null);
            setSelectedIds(new Set());
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
