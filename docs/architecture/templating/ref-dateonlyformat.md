# Reference: DateOnlyFormat

Formats a date-only value using a custom DayJS format string. Forces UTC.

**Tags:** `{~DateOnlyFormat:ADDRESS^FORMAT~}`

**Source:** `pict/source/templates/data/Pict-Template-DateOnlyFormat.js`

## Syntax

```
{~DateOnlyFormat:ADDRESS^FORMAT_STRING~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a date string |
| FORMAT_STRING | Yes | DayJS format string (separated by `^`) |

## Behavior

- Parses the value as a date using DayJS
- Forces UTC interpretation (no timezone conversion)
- Formats using the provided format string

## Examples

```javascript
_Pict.parseTemplate('{~DateOnlyFormat:Record.Date^MMMM Do, YYYY~}',
	{ Date: '2023-05-25' });
// 'May 25th, 2023'

_Pict.parseTemplate('{~DateOnlyFormat:Record.Date^dddd MMMM Do YYYY~}',
	{ Date: '2023-05-25' });
// 'Thursday May 25th 2023'
```

## Related

- [DateTimeFormat](architecture/templating/ref-datetimeformat.md) -- For date-time values (timezone-aware)
- [DateOnlyYMD](architecture/templating/ref-dateonlyymd.md) -- Fixed YYYY-MM-DD format
