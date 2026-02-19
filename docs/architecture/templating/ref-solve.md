# Reference: Solve (S)

Evaluates a mathematical expression with optional variable resolution from data.

**Tags:** `{~Solve:EXPR~}` `{~S:EXPR~}` or `{~S:EXPR:DATA_ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-Solve.js`

## Syntax

```
{~S:EXPRESSION~}
{~S:EXPRESSION:DATA_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| EXPRESSION | Yes | Math expression string |
| DATA_ADDRESS | No | Address of object whose properties become variables |

## Built-in Functions

| Function | Description |
|----------|-------------|
| `ROUND(value, decimals)` | Round to N decimal places |
| `PI()` | The constant pi |
| `CONCAT(a, b, ...)` | String concatenation |

## Examples

```javascript
_Pict.parseTemplate('{~S:100+55~}');
// '155'

_Pict.AppData.Order = { Qty: 3, Price: 24.99 };
_Pict.parseTemplate('{~S:Qty*Price:AppData.Order~}');
// '74.97'

_Pict.parseTemplate('{~S:ROUND(PI()*R*R,2):AppData~}');
```

## Related

- [SBR](architecture/templating/ref-sbr.md) -- Equation from data
