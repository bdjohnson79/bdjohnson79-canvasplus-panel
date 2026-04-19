import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { PanelData, GrafanaTheme2, FieldConfigSource } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { CanvasElement, CanvasConnection, CanvasOptions, PixelRect } from '../types';
import { resolvePixelRect } from '../utils/placement';
import { ElementRegistry } from './elements';
import { useDataBinding } from './hooks/useDataBinding';
import { ConnectionLayer } from './ConnectionLayer';
import { DragLayer } from './editor/DragLayer';

// ── Edit context ──────────────────────────────────────────────────────────────

interface EditContextValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  updateConnection: (id: string, partial: Partial<CanvasConnection>) => void;
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
  fieldConfig: FieldConfigSource;
  theme: GrafanaTheme2;
  editMode: boolean;
  isSelected: boolean;
  panelWidth: number;
  panelHeight: number;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const ElementWrapper: React.FC<ElementWrapperProps> = ({
  element,
  rect,
  data,
  fieldConfig,
  theme,
  editMode,
  isSelected,
  panelWidth,
  panelHeight,
  canvasRef,
}) => {
  const ctx = useCanvasEdit();
  const resolved = useDataBinding(element, data, fieldConfig, theme);
  const Component = ElementRegistry[element.type];

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) {return;}
      e.stopPropagation();
      ctx?.setSelectedId(element.id);
    },
    [editMode, ctx, element.id]
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
      >
        <Component element={element} resolved={resolved} isSelected={isSelected} editMode={editMode} />
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
  fieldConfig: FieldConfigSource;
  width: number;
  height: number;
  onOptionsChange: (opts: CanvasOptions) => void;
}

export const CanvasContainer: React.FC<Props> = ({
  options,
  data,
  fieldConfig,
  width,
  height,
  onOptionsChange,
}) => {
  const theme = useTheme2();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // ── option helpers ──────────────────────────────────────────────────────────

  const updateElement = useCallback(
    (id: string, partial: Partial<CanvasElement>) => {
      onOptionsChange({
        ...options,
        elements: options.elements.map((el) => (el.id === id ? { ...el, ...partial } : el)),
      });
    },
    [options, onOptionsChange]
  );

  const updateConnection = useCallback(
    (id: string, partial: Partial<CanvasConnection>) => {
      onOptionsChange({
        ...options,
        connections: options.connections.map((c) => (c.id === id ? { ...c, ...partial } : c)),
      });
    },
    [options, onOptionsChange]
  );

  const editCtx: EditContextValue = {
    selectedId,
    setSelectedId,
    updateElement,
    updateConnection,
  };

  // ── pan/zoom handlers ───────────────────────────────────────────────────────

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!options.panZoom) {return;}
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.25, z - e.deltaY * 0.001)));
    },
    [options.panZoom]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!options.panZoom || e.button !== 1) {return;}
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [options.panZoom, pan]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) {return;}
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    },
    []
  );

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── resolve pixel rects for all elements ────────────────────────────────────

  const sortedElements = [...options.elements].sort((a, b) => a.zIndex - b.zIndex);

  const rectMap = new Map<string, PixelRect>();
  for (const el of options.elements) {
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
        }}
        onClick={() => {
          if (options.inlineEditing) {
            setSelectedId(null);
            setSelectedConnectionId(null);
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
                fieldConfig={fieldConfig}
                theme={theme}
                editMode={options.inlineEditing}
                isSelected={el.id === selectedId}
                panelWidth={width}
                panelHeight={height}
                canvasRef={canvasRef}
              />
            );
          })}

          <ConnectionLayer
            connections={options.connections}
            elements={options.elements}
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
