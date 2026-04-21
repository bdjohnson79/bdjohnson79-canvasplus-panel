import { FieldConfigProperty, PanelPlugin } from '@grafana/data';
import { CanvasOptions } from './types';
import { CanvasPanel } from './components/CanvasPanel';
import { ElementsEditor } from './components/editor/ElementsEditor';
import { TextAreaEditor } from './components/editor/TextAreaEditor';

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
      .addSelect({
        path: 'background.imageMode',
        name: 'Background image',
        defaultValue: 'none',
        settings: {
          options: [
            { label: 'None', value: 'none' },
            { label: 'Fixed (URL)', value: 'fixed' },
            { label: 'From field', value: 'field' },
            { label: 'Inline data', value: 'inline' },
          ],
        },
      })
      .addTextInput({
        path: 'background.imageUrl',
        name: 'Image URL',
        description: 'Full URL or Grafana path (e.g. /public/img/bg/nasa.jpg)',
        showIf: (opts) => opts.background?.imageMode === 'fixed',
      })
      .addFieldNamePicker({
        path: 'background.imageField',
        name: 'Image field',
        description: 'Query field whose value is an image URL',
        showIf: (opts) => opts.background?.imageMode === 'field',
      })
      .addSelect({
        path: 'background.imageFormat',
        name: 'Image format',
        defaultValue: 'png',
        settings: {
          options: [
            { label: 'SVG (text/xml)', value: 'svg+xml' },
            { label: 'SVG (base64)', value: 'svg+xml;base64' },
            { label: 'PNG', value: 'png' },
            { label: 'JPEG', value: 'jpeg' },
          ],
        },
        showIf: (opts) => opts.background?.imageMode === 'inline',
      })
      .addCustomEditor({
        id: 'backgroundImageData',
        path: 'background.imageData',
        name: 'Image data',
        description: 'Paste base64-encoded image data or SVG markup',
        editor: TextAreaEditor,
        showIf: (opts) => opts.background?.imageMode === 'inline',
      })
      .addSelect({
        path: 'background.imageSize',
        name: 'Image size',
        defaultValue: 'cover',
        settings: {
          options: [
            { label: 'Cover', value: 'cover' },
            { label: 'Contain', value: 'contain' },
            { label: 'Auto', value: 'auto' },
            { label: 'Stretch (fill)', value: 'stretch' },
          ],
        },
        showIf: (opts) => opts.background?.imageMode !== 'none',
      })
      .addCustomEditor({
        id: 'elements',
        path: 'elements',
        name: 'Elements',
        description: 'Add and configure canvas elements',
        defaultValue: [],
        editor: ElementsEditor,
      })
  );
