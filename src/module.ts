import { FieldConfigProperty, PanelPlugin } from '@grafana/data';
import { CanvasOptions } from './types';
import { CanvasPanel } from './components/CanvasPanel';
import { ElementsEditor } from './components/editor/ElementsEditor';

const defaultOptions: Partial<CanvasOptions> = {
  elements: [],
  connections: [],
  background: { color: 'transparent' },
  inlineEditing: false,
  panZoom: false,
};

export const plugin = new PanelPlugin<CanvasOptions>(CanvasPanel)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Unit]: {},
      [FieldConfigProperty.Decimals]: {},
      [FieldConfigProperty.Min]: {},
      [FieldConfigProperty.Max]: {},
      [FieldConfigProperty.DisplayName]: {},
      [FieldConfigProperty.NoValue]: {},
      [FieldConfigProperty.Color]: {},
      [FieldConfigProperty.Thresholds]: {},
      [FieldConfigProperty.Mappings]: {},
      [FieldConfigProperty.Links]: {},
    },
  })
  .setNoPadding()
  .setPanelOptions((builder) =>
    builder
      .addBooleanSwitch({
        path: 'inlineEditing',
        name: 'Enable inline editing',
        description: 'Show drag and resize handles directly on the canvas',
        defaultValue: false,
      })
      .addBooleanSwitch({
        path: 'panZoom',
        name: 'Pan & zoom',
        description: 'Scroll to zoom, middle-click drag to pan',
        defaultValue: false,
      })
      .addColorPicker({
        path: 'background.color',
        name: 'Background color',
        defaultValue: 'transparent',
      })
      .addCustomEditor({
        id: 'elements',
        path: 'elements',
        name: 'Elements',
        description: 'Add and configure canvas elements',
        defaultValue: [],
        editor: ElementsEditor,
      })
  )
  .setDefaults(defaultOptions as CanvasOptions);
