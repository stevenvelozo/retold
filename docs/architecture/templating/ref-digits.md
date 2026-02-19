# Reference: Digits

Formats a number with two decimal places and thousands separators.

**Tags:** `{~Digits:ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-Digits.js`

## Syntax

```
{~Digits:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a numeric value |

## Examples

```javascript
_Pict.parseTemplate('{~Digits:Record.Value~}', { Value: 1234567.891 });
// '1,234,567.89'

_Pict.parseTemplate('{~Digits:Record.Value~}', { Value: 42 });
// '42.00'

_Pict.parseTemplate('{~Digits:Record.Value~}', { Value: 0.5 });
// '0.50'
```

## Related

- [Dollars](architecture/templating/ref-dollars.md) -- Currency formatting with $ sign
