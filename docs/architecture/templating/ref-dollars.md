# Reference: Dollars

Formats a number as US currency with a dollar sign, two decimal places, and thousands separators.

**Tags:** `{~Dollars:ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-Dollars.js`

## Syntax

```
{~Dollars:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a numeric value |

## Examples

```javascript
_Pict.parseTemplate('{~Dollars:Record.Price~}', { Price: 1234.5 });
// '$1,234.50'

_Pict.parseTemplate('{~Dollars:Record.Price~}', { Price: 9.9 });
// '$9.90'

_Pict.parseTemplate('{~Dollars:Record.Price~}', { Price: 0 });
// '$0.00'
```

## Related

- [Digits](architecture/templating/ref-digits.md) -- Numeric formatting without currency symbol
