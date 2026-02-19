# Reference: LogStatement (LS)

Logs a literal message to the trace log. Returns empty string.

**Tags:** `{~LogStatement:MESSAGE~}` `{~LS:MESSAGE~}`

**Source:** `pict/source/templates/debugging/Pict-Template-LogStatement.js`

## Syntax

```
{~LS:MESSAGE~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| MESSAGE | Yes | Literal string to log |

## Behavior

- Logs the message at trace level
- Returns empty string

## Examples

```html
{~LS:Starting render~}
{~TS:Row:AppData.Items~}
{~LS:Render complete~}
```

## Related

- [LV](architecture/templating/ref-lv.md) -- Log a resolved value
- [LVT](architecture/templating/ref-lvt.md) -- Log an object tree
