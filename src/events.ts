import { BusEventWithPayload } from '@grafana/data';

export interface CanvasElementSelectedPayload {
  elementId: string | null;
}

export class CanvasElementSelectedEvent extends BusEventWithPayload<CanvasElementSelectedPayload> {
  static type = 'canvas-element-selected';
}

export interface CanvasElementDeletePayload {
  elementId: string;
}

export class CanvasElementDeleteEvent extends BusEventWithPayload<CanvasElementDeletePayload> {
  static type = 'canvas-element-delete';
}

export interface GroupElementsPayload {
  elementIds: string[];
}

export class GroupElementsEvent extends BusEventWithPayload<GroupElementsPayload> {
  static type = 'canvas-group-elements';
}

export interface UngroupElementsPayload {
  groupId: string;
}

export class UngroupElementsEvent extends BusEventWithPayload<UngroupElementsPayload> {
  static type = 'canvas-ungroup-elements';
}
