# Reference: DateTimeFormat

Formats a date-time value using a custom DayJS format string. Timezone-aware.

**Tags:** `{~DateTimeFormat:ADDRESS^FORMAT~}` `{~DateFormat:ADDRESS^FORMAT~}`

**Source:** `pict/source/templates/data/Pict-Template-DateTimeFormat.js`

## Syntax

```
{~DateTimeFormat:ADDRESS^FORMAT_STRING~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a date-time string or value |
| FORMAT_STRING | Yes | DayJS format string (separated by `^`) |

## Format Tokens

| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | 4-digit year | 2025 |
| `YY` | 2-digit year | 25 |
| `MMMM` | Full month name | January |
| `MMM` | Short month name | Jan |
| `MM` | Zero-padded month | 01 |
| `M` | Month | 1 |
| `DD` | Zero-padded day | 01 |
| `Do` | Ordinal day | 1st |
| `dddd` | Full day name | Monday |
| `ddd` | Short day name | Mon |
| `HH` | 24-hour hour | 00-23 |
| `hh` | 12-hour hour | 01-12 |
| `mm` | Minutes | 00-59 |
| `ss` | Seconds | 00-59 |
| `A` | AM/PM | AM |

## Examples

```javascript
_Pict.options.Timezone = 'America/New_York';

_Pict.parseTemplate('{~DateTimeFormat:Record.Date^MMMM Do, YYYY~}',
	{ Date: '2023-05-25T15:30:00.000Z' });
// 'May 25th, 2023'

_Pict.parseTemplate('{~DateTimeFormat:Record.Date^dddd, MMMM D YYYY [at] h:mm A~}',
	{ Date: '2023-05-25T15:30:00.000Z' });
// 'Thursday, May 25 2023 at 11:30 AM'
```

## Related

- [DateTimeYMD](architecture/templating/ref-datetimeymd.md) -- Fixed YYYY-MM-DD format
- [DateOnlyFormat](architecture/templating/ref-dateonlyformat.md) -- For date-only values
