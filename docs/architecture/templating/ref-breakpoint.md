# Reference: Breakpoint

Inserts a JavaScript `debugger` statement. Returns empty string.

**Tags:** `{~Breakpoint~}` or `{~Breakpoint:LABEL~}`

**Source:** `pict/source/templates/debugging/Pict-Template-Breakpoint.js`

## Syntax

```
{~Breakpoint~}
{~Breakpoint:LABEL~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| LABEL | No | Optional label logged with the breakpoint |

## Behavior

- Calls `debugger;` -- pauses execution when DevTools are open
- Logs a stack trace
- Returns empty string (no visible output)

## Examples

```html
{~Breakpoint~}
{~Breakpoint:before-render~}
```

## Related

- [LS](architecture/templating/ref-ls.md) -- Log a message
- [LV](architecture/templating/ref-lv.md) -- Log a value
