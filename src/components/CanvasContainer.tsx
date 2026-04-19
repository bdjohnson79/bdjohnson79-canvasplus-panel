import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { PanelData, GrafanaTheme2, FieldConfigSource } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { CanvasElement, CanvasConnection, CanvasOptions } from '../types';
import { ElementRegistry } from './elements';
import { useDataBinding } from './hooks/useDataBinding';
import { ConnectionLayer } from './ConnectionLayer';
import { DragLayer } from './editor/DragLayer';
import { AddElementToolbar } from './editor/AddElementToolbar';
import { ElementEditor } from './editor/ElementEditor';

// ── Edit context ──────────────────────────────────────────────────────────────

interface EditContextValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateElement: (id: string, partial: Partial<CanvasElement>) => void;
  addElement: (el: CanvasElement) => void;
  removeElement: (id: string) => void;
  addConnection: (conn: CanvasConnection) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, partial: Partial<CanvasConnection>) => void;
}

const CanvasEditContext = createContext<EditContextValue | null>(null);

export function useCanvasEdit() {
  return useContext(CanvasEditContext);
}

// ── Single element wrapper ────────────────────────────────────────────────────

interface ElementWrapperProps {
  element: CanvasElement;
  data: PanelData;
  fieldConfig: FieldConfigSource;
  theme: GrafanaTheme2;
  editMode: boolean;
  isSelected: boolean;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const ElementWrapper: React.FC<ElementWrapperProps> = ({
  element,
  data,
  fieldConfig,
  theme,
  editMode,
  isSelected,
  canvasRef,
}) => {
  const ctx = useCanvasEdit();
  const resolved = useDataBinding(element, data, fieldConfig, theme);
  const Component = ElementRegistry[element.type];

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
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
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
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

  // pan/zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // ── option helpers ──────────────────────────────────────────────────────────

  const setElements = useCallback(
    (elements: CanvasElement[]) => onOptionsChange({ ...options, elements }),
    [options, onOptionsChange]
  );

  const setConnections = useCallback(
    (connections: CanvasConnection[]) => onOptionsChange({ ...options, connections }),
    [options, onOptionsChange]
  );

  const updateElement = useCallback(
    (id: string, partial: Partial<CanvasElement>) => {
      setElements(options.elements.map((el) => (el.id === id ? { ...el, ...partial } : el)));
    },
    [options.elements, setElements]
  );

  const addElement = useCallback(
    (el: CanvasElement) => setElements([...options.elements, el]),
    [options.elements, setElements]
  );

  const removeElement = useCallback(
    (id: string) => {
      setElements(options.elements.filter((el) => el.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [options.elements, setElements, selectedId]
  );

  const addConnection = useCallback(
    (conn: CanvasConnection) => setConnections([...options.connections, conn]),
    [options.connections, setConnections]
  );

  const removeConnection = useCallback(
    (id: string) => setConnections(options.connections.filter((c) => c.id !== id)),
    [options.connections, setConnections]
  );

  const updateConnection = useCallback(
    (id: string, partial: Partial<CanvasConnection>) =>
      setConnections(options.connections.map((c) => (c.id === id ? { ...c, ...partial } : c))),
    [options.connections, setConnections]
  );

  // ── context value ───────────────────────────────────────────────────────────

  const editCtx: EditContextValue = {
    selectedId,
    setSelectedId,
    updateElement,
    addElement,
    removeElement,
    addConnection,
    removeConnection,
    updateConnection,
  };

  // ── pan/zoom handlers ───────────────────────────────────────────────────────

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!options.panZoom) return;
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.25, z - e.deltaY * 0.001)));
    },
    [options.panZoom]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!options.panZoom || e.button !== 1) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [options.panZoom, pan]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    },
    []
  );

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── sorted elements ─────────────────────────────────────────────────────────

  const sortedElements = [...options.elements].sort((a, b) => a.zIndex - b.zIndex);
  const nextZIndex = options.elements.length > 0 ? Math.max(...options.elements.map((e) => e.zIndex)) + 1 : 1;
  const selectedElement = options.elements.find((el) => el.id === selectedId) ?? null;

  const toolbarHeight = options.inlineEditing ? 40 : 0;
  const editorWidth = options.inlineEditing && selectedId ? 240 : 0;
  const canvasW = width - editorWidth;
  const canvasH = height - toolbarHeight;

  return (
    <CanvasEditContext.Provider value={editCtx}>
      <div style={{ width, height, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {options.inlineEditing && (
          <AddElementToolbar
            canvasWidth={canvasW}
            canvasHeight={canvasH}
            nextZIndex={nextZIndex}
            onAdd={addElement}
          />
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* canvas area */}
          <div
            ref={canvasRef}
            style={{
              position: 'relative',
              width: canvasW,
              height: canvasH,
              overflow: options.panZoom ? 'hidden' : 'hidden',
              background: options.background.color || 'transparent',
              backgroundImage: options.background.image ? `url(${options.background.image})` : undefined,
              backgroundSize: 'cover',
              flexShrink: 0,
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
              {sortedElements.map((el) => (
                <ElementWrapper
                  key={el.id}
                  element={el}
                  data={data}
                  fieldConfig={fieldConfig}
                  theme={theme}
                  editMode={options.inlineEditing}
                  isSelected={el.id === selectedId}
                  canvasRef={canvasRef}
                />
              ))}

              <ConnectionLayer
                connections={options.connections}
                elements={options.elements}
                width={canvasW}
                height={canvasH}
                series={data.series}
                theme={theme}
                editMode={options.inlineEditing}
                selectedConnectionId={selectedConnectionId ?? undefined}
                onSelectConnection={setSelectedConnectionId}
              />
            </div>
          </div>

          {/* element editor sidebar */}
          {options.inlineEditing && selectedElement && (
            <ElementEditor
              element={selectedElement}
              onChange={(partial) => updateElement(selectedElement.id, partial)}
              onDelete={() => removeElement(selectedElement.id)}
            />
          )}
        </div>
      </div>
    </CanvasEditContext.Provider>
  );
};
