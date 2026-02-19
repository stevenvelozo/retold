# Reference: LogValueTree (LVT)

Recursively logs an object's keys and values to the trace log. Returns empty string.

**Tags:** `{~LogValueTree:ADDRESS~}` `{~LVT:ADDRESS~}` or `{~LVT:ADDRESS^DEPTH~}`

**Source:** `pict/source/templates/debugging/Pict-Template-LogValueTree.js`

## Syntax

```
{~LVT:ADDRESS~}
{~LVT:ADDRESS^DEPTH~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to the object to log |
| DEPTH | No | Maximum traversal depth (default: 1, separated by `^`) |

## Examples

```html
{~LVT:AppData.Config~}
{~LVT:AppData.User^3~}
```

## Related

- [LV](architecture/templating/ref-lv.md) -- Log a single value
- [DT](architecture/templating/ref-dt.md) -- Render as HTML instead of logging
