# Reference: Pict / Self-Reference (P)

Returns the browser-side JavaScript reference to the Pict instance.

**Tags:** `{~Pict~}` `{~P~}`

**Source:** `pict/source/templates/Pict-Template-Self.js`

## Syntax

```
{~P~}
```

## Parameters

None.

## Behavior

- Returns `pict.browserAddress` (default: `window._Pict`)
- Used to wire event handlers in rendered HTML

## Examples

```html
<button onclick="{~P~}.views['Cart'].add({~D:Record.ID~})">Add</button>
```

```javascript
_Pict.parseTemplate('{~P~}');
// 'window._Pict'

_Pict.browserAddress = 'window._Pict.children[0]';
_Pict.parseTemplate('{~P~}');
// 'window._Pict.children[0]'
```

## Related

- [V](architecture/templating/ref-view.md) -- Render a view inline
- [DEJS](architecture/templating/ref-dejs.md) -- Escape data for JS strings in handlers
