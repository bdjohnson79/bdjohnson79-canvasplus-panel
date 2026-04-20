import { ElementConstraint, Placement, PixelRect } from '../types';

/**
 * Converts a constraint + placement into an absolute pixel rect relative to the
 * panel's top-left corner. This is the single source of truth for element position.
 *
 * Coordinate semantics per constraint type:
 *   horizontal 'left'     → placement.left  = px from panel left edge
 *   horizontal 'right'    → placement.right = px from panel right edge
 *   horizontal 'center'   → placement.left  = px offset from panel horizontal center
 *                           (element center = panelWidth/2 + placement.left)
 *   horizontal 'leftright'→ left + right both used; width is derived
 *
 *   vertical 'top'        → placement.top    = px from panel top
 *   vertical 'bottom'     → placement.bottom = px from panel bottom
 *   vertical 'center'     → placement.top    = px offset from panel vertical center
 *                           (element center = panelHeight/2 + placement.top)
 *   vertical 'topbottom'  → top + bottom both used; height is derived
 */
export function resolvePixelRect(
  placement: Placement,
  constraint: ElementConstraint,
  panelWidth: number,
  panelHeight: number
): PixelRect {
  let x = 0;
  let y = 0;
  let width = placement.width;
  let height = placement.height;

  switch (constraint.horizontal) {
    case 'left':
      x = placement.left;
      break;
    case 'right':
      x = panelWidth - placement.right - placement.width;
      break;
    case 'center':
      x = panelWidth / 2 + placement.left - placement.width / 2;
      break;
    case 'leftright':
      x = placement.left;
      width = panelWidth - placement.left - placement.right;
      break;
  }

  switch (constraint.vertical) {
    case 'top':
      y = placement.top;
      break;
    case 'bottom':
      y = panelHeight - placement.bottom - placement.height;
      break;
    case 'center':
      y = panelHeight / 2 + placement.top - placement.height / 2;
      break;
    case 'topbottom':
      y = placement.top;
      height = panelHeight - placement.top - placement.bottom;
      break;
  }

  return { x, y, width, height };
}

/**
 * Inverse of resolvePixelRect. Given a new pixel position after a drag/resize,
 * returns the updated placement fields that preserve the current constraint type.
 */
export function pixelToPlacement(
  pixelX: number,
  pixelY: number,
  width: number,
  height: number,
  constraint: ElementConstraint,
  panelWidth: number,
  panelHeight: number
): Partial<Placement> {
  const result: Partial<Placement> = { width, height };

  switch (constraint.horizontal) {
    case 'left':
      result.left = pixelX;
      break;
    case 'right':
      result.right = panelWidth - pixelX - width;
      break;
    case 'center':
      result.left = pixelX - panelWidth / 2 + width / 2;
      break;
    case 'leftright':
      result.left = pixelX;
      result.right = panelWidth - pixelX - width;
      break;
  }

  switch (constraint.vertical) {
    case 'top':
      result.top = pixelY;
      break;
    case 'bottom':
      result.bottom = panelHeight - pixelY - height;
      break;
    case 'center':
      result.top = pixelY - panelHeight / 2 + height / 2;
      break;
    case 'topbottom':
      result.top = pixelY;
      result.bottom = panelHeight - pixelY - height;
      break;
  }

  return result;
}
