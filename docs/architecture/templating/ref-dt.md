# Reference: DataTree (DT)

Renders an object tree as HTML `<div>` elements for visual debugging.

**Tags:** `{~DataTree:ADDRESS~}` `{~DT:ADDRESS~}` or `{~DT:ADDRESS^DEPTH~}`

**Source:** `pict/source/templates/debugging/Pict-Template-DataValueTree.js`

## Syntax

```
{~DT:ADDRESS~}
{~DT:ADDRESS^DEPTH~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to the object to render |
| DEPTH | No | Maximum traversal depth (default: 1, separated by `^`) |

## Behavior

- Renders an HTML tree using CSS classes: `PICTObjectSet`, `PICTObjectBranch`, `PICTObjectBranchValue`, `PICTObjectBranchDepth_N`
- Unlike other debugging expressions, produces visible output
- Uses customizable templates `PICT-Object-Wrap` and `PICT-Object-Branch`

## Examples

```html
<div class="debug">{~DT:AppData.Data^2~}</div>
```

## Related

- [LVT](architecture/templating/ref-lvt.md) -- Log to console instead of rendering
- [DJ](architecture/templating/ref-dj.md) -- JSON serialization
