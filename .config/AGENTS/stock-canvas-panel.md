# Stock Grafana Canvas Panel — Behavior Reference

Source files live at `public/app/plugins/panel/canvas/` in the Grafana monorepo.
Key files read: `components/connections/ConnectionAnchors.tsx`, `components/connections/ConnectionSVG.tsx`, `components/connections/Connections.tsx`.

---

## Element Selection / Move / Resize

- **Click** an unselected element → selects it (Grafana uses the Selecto library; canvasplus uses its own click handler — both fine)
- Selected element gets an **8-handle overlay** (corners + edge midpoints) for move/resize/rotate — equivalent to canvasplus's `DragLayer`
- Resize handles are small squares with directional cursors; a full-element move overlay captures drag

---

## Connection Anchors — the "tiny X's"

### What they look like
- **16 `<img>` elements** per overlay, each showing a **5×5px SVG of two diagonal lines (an X shape)**
  - Blue stroke `#29b6f2`, semi-transparent white stroke behind it
  - This is the visual the user describes as "tiny x's"
- NOT circles, NOT SVG elements inside a global SVG layer

### Positions — 16 anchors, perimeter only, NO center
Using a normalized ±1 coordinate system (0,0 = center of element):
```
(-1, 1)  (-0.5, 1)  (0, 1)  (0.5, 1)  (1, 1)   ← top edge
(1, 0.5)  (1, 0)  (1,-0.5)                       ← right edge
(1,-1)  (0.5,-1)  (0,-1)  (-0.5,-1)  (-1,-1)    ← bottom edge
(-1,-0.5)  (-1, 0)  (-1, 0.5)                    ← left edge
```
= 5 per side including shared corners = 16 unique points total.

### DOM architecture — ONE overlay div for the whole scene
There is a **single `<div>` overlay** (`connectionAnchorDiv`) for the entire canvas, not one per element:
- Normally `display: none`
- On `mouseenter` of any element (in edit mode): the div's `top`, `left`, `width`, `height` are set to match that element's bounding rect, then `display: block`
- On `mouseleave`: normally hide, **except** if the cursor is moving TO one of the anchor `<img>` elements (checked via `relatedTarget.getAttribute('alt') === 'connection anchor'`) — in that case don't hide

### The 30px buffer zone — prevents flicker
Inside `connectionAnchorDiv` there is a `mouseoutDiv` with:
```css
position: absolute;
margin: -30px;
width: calc(100% + 60px);
height: calc(100% + 60px);
```
This 30px overhang means the cursor can move from the element surface outward to an anchor image (which sits outside the element border) without triggering `mouseleave` on the element. The `onMouseOut` on this div is what actually hides the anchors, and it checks `relatedTarget` before hiding.

### Hover highlight on individual anchor
When hovering a single anchor image, a **green circle** (16px, `backgroundColor: '#00ff00'`, `opacity: 0.3`) appears centered on that anchor. It disappears on `mouseleave` of the anchor.

---

## Connection Creation — MOUSEDOWN + DRAG + RELEASE

**Not click-then-click. Never click-then-click.**

1. User presses mouse button down (`mousedown`) on an anchor X image
2. A rubber-band SVG `<line>` appears from the anchor point and follows the cursor (scene-level `mousemove` listener)
3. While dragging, if the cursor enters another element, that element's anchor overlay appears (hover shows target anchors)
4. User releases mouse button (`mouseup`) anywhere:
   - If cursor is over a target element: connection saved with source anchor coords + target element + target coords
   - If cursor never moved more than `CONNECTION_ANCHOR_HIGHLIGHT_OFFSET` (8px) from start: nothing saved (prevents accidental connections from plain clicks on anchors)
5. A plain click on an anchor image does **not** create a connection — you must drag

**This is the critical design that allows clicking elements to select them without accidentally starting connections.**

---

## Existing Connections — Display

Each saved connection renders as **two overlapping SVG elements**:
1. A **transparent hit-area line** (`stroke: transparent`, `strokeWidth: 15`) for easy pointer targeting
2. The **visible colored line** on top

Both are inside an SVG with `position: absolute; width: 100%; height: 100%; zIndex: 1000; pointerEvents: none` (container), with individual elements having `pointerEvents: auto`.

### Arrowheads
SVG `<marker>` polygons: `points="0 0, 10 3.5, 0 7"` for forward; reversed for backward.

---

## Connection Selection & Editing

- **Click** the connection line (hits the transparent 15px area) → selects it
- Selected connection: a blue semi-transparent stroke (`#44aaff`, `strokeOpacity: 0.6`, `strokeWidth + 5`) renders behind the visible line
- **Delete / Backspace** key → removes selected connection
- Click anywhere else → deselects

### Vertex editing (bend points) — shown only on selected connections
- **Existing vertices**: solid blue circles (`r=5`, fill `#44aaff`) — draggable to move the bend
- **Add-vertex circles**: semi-transparent blue circles (`r=4`, `opacity: 0.5`) at the midpoint of each segment — mousedown+drag to insert a new bend
- Dragging a vertex near straight-line alignment snaps it; dragging it onto the line between its neighbors removes it (auto-delete)
- Maximum 10 vertices per connection

---

## Z-Index / Pointer Event Hierarchy

| Layer | z-index | pointerEvents |
|---|---|---|
| Element divs | element.zIndex | default (click-through to content) |
| Connection SVGs | 1000 | none (container); auto (lines, circles) |
| Connection anchor overlay | CSS stacking (inside scene) | none (container); `auto !important` (anchor imgs) |
| DragLayer (selected element) | element.zIndex + 1000 | none (container); all (move overlay, handles) |

---

## What CanvasPlus Should Match

- Anchor overlay = single repositioned HTML div, not SVG circles per element
- Anchor images = X-shaped icons (not circles)
- Connection creation = mousedown + drag + release (not click + click)  
- Connection hit area = wide transparent stroke behind visible line
- Connection selection + Delete key deletion
- Vertex circles on selected connections (nice-to-have, canvasplus can defer this)
