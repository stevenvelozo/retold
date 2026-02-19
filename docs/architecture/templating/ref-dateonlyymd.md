# Reference: DateOnlyYMD

Formats a date-only value as `YYYY-MM-DD`. Forces UTC to prevent timezone shifting.

**Tags:** `{~DateOnlyYMD:ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-DateOnlyYMD.js`

## Syntax

```
{~DateOnlyYMD:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a date string (e.g., `2023-05-25`) |

## Behavior

- Parses the value as a date using DayJS
- Forces UTC interpretation (no timezone conversion)
- Formats as `YYYY-MM-DD`
- Use this for date-only values to avoid timezone-related date shifts

## Examples

```javascript
_Pict.parseTemplate('{~DateOnlyYMD:Record.BirthDate~}',
	{ BirthDate: '2023-05-25' });
// '2023-05-25'
```

## Related

- [DateTimeYMD](architecture/templating/ref-datetimeymd.md) -- For date-time values (timezone-aware)
- [DateOnlyFormat](architecture/templating/ref-dateonlyformat.md) -- Custom format for date-only values
