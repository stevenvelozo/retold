# Reference: ViewRetainingScope (VRS)

Renders a Pict view inline, passing the current scope through.

**Tags:** `{~ViewRetainingScope:VIEW_HASH~}` `{~VRS:VIEW_HASH~}`

**Source:** `pict/source/templates/Pict-Template-View-RetainingScope.js`

## Syntax

```
{~VRS:VIEW_HASH~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| VIEW_HASH | Yes | Hash of a registered Pict view |

## Behavior

- Same as View, but calls `renderWithScope()` on the view
- The current Scope namespace is available inside the child view's templates

## Examples

```html
<!-- Parent sets scope, child view reads it -->
{~VRS:ChildView~}

<!-- Inside ChildView's templates: -->
<div class="{~D:Scope.theme~}">{~D:Scope.title~}</div>
```

## Related

- [V](architecture/templating/ref-view.md) -- View without scope retention
- [P](architecture/templating/ref-pict.md) -- Pict instance reference
