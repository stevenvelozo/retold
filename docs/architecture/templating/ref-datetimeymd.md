# Reference: DateTimeYMD

Formats a date-time value as `YYYY-MM-DD`. Timezone-aware.

**Tags:** `{~DateTimeYMD:ADDRESS~}` `{~DateYMD:ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-DateTimeYMD.js`

## Syntax

```
{~DateTimeYMD:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a date-time string or value |

## Behavior

- Parses the value as a date-time using DayJS
- Converts to the timezone configured in `pict.options.Timezone`
- Formats as `YYYY-MM-DD`

## Examples

```javascript
_Pict.options.Timezone = 'America/Los_Angeles';

_Pict.parseTemplate('{~DateTimeYMD:Record.Date~}',
	{ Date: '2023-05-25T05:54:46.000Z' });
// '2023-05-24' (UTC midnight is previous day in Pacific)

_Pict.parseTemplate('{~DateTimeYMD:Record.Date~}',
	{ Date: '2023-05-25T20:00:00.000Z' });
// '2023-05-25'
```

## Related

- [DateTimeFormat](architecture/templating/ref-datetimeformat.md) -- Custom format string
- [DateOnlyYMD](architecture/templating/ref-dateonlyymd.md) -- For date-only values (no timezone shift)
