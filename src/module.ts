import { PanelPlugin } from '@grafana/data';
import { CanvasOptions } from './types';
import { CanvasPanel } from './components/CanvasPanel';

const defaultOptions: Partial<CanvasOptions> = {
  elements: [],
  connections: [],
  background: { color: 'transparent' },
  inlineEditing: false,
  panZoom: false,
};

export const plugin = new PanelPlugin<CanvasOptions>(CanvasPanel)
  .setNoPadding()
  .setPanelOptions((builder) =>
    builder
      .addBooleanSwitch({
        path: 'inlineEditing',
        name: 'Enable editing',
        description: 'Show drag/resize controls and element toolbar',
        defaultValue: false,
      })
      .addBooleanSwitch({
        path: 'panZoom',
        name: 'Pan & zoom',
        description: 'Allow scrolling to zoom and middle-click drag to pan',
        defaultValue: false,
      })
      .addColorPicker({
        path: 'background.color',
        name: 'Background color',
        defaultValue: 'transparent',
      })
  )
  .setDefaults(defaultOptions as CanvasOptions);
