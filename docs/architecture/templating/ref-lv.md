# Reference: LogValue (LV)

Resolves a value and logs it with type information. Returns empty string.

**Tags:** `{~LogValue:ADDRESS~}` `{~LV:ADDRESS~}`

**Source:** `pict/source/templates/debugging/Pict-Template-LogValue.js`

## Syntax

```
{~LV:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to the value to log |

## Behavior

- Resolves the address
- Logs the type (`typeof`) and value at trace level
- Returns empty string

## Examples

```html
{~LV:AppData.CurrentUser~}
{~LV:Record.OrderTotal~}
```

## Related

- [LS](architecture/templating/ref-ls.md) -- Log a literal message
- [LVT](architecture/templating/ref-lvt.md) -- Log an object tree
- [DT](architecture/templating/ref-dt.md) -- Render an object as HTML
