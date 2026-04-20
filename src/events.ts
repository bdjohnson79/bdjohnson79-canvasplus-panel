import { BusEventWithPayload } from '@grafana/data';

export interface CanvasElementSelectedPayload {
  elementId: string | null;
}

export class CanvasElementSelectedEvent extends BusEventWithPayload<CanvasElementSelectedPayload> {
  static type = 'canvas-element-selected';
}
