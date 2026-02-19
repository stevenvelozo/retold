# Reference: SolveByReference (SBR)

Resolves an equation string from data and evaluates it.

**Tags:** `{~SolveByReference:EQUATION_ADDR~}` `{~SBR:EQUATION_ADDR~}` or `{~SBR:EQUATION_ADDR:DATA_ADDR:MANIFEST_ADDR~}`

**Source:** `pict/source/templates/Pict-Template-SolveByReference.js`

## Syntax

```
{~SBR:EQUATION_ADDRESS~}
{~SBR:EQUATION_ADDRESS:DATA_ADDRESS:MANIFEST_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| EQUATION_ADDRESS | Yes | Address containing the equation string |
| DATA_ADDRESS | No | Address of data object for variable resolution |
| MANIFEST_ADDRESS | No | Address of a Manyfest instance for variable mapping |

## Examples

```javascript
_Pict.AppData.Formula = 'Width * Height';
_Pict.AppData.Dims = { Width: 100, Height: 50 };

_Pict.parseTemplate('{~SBR:AppData.Formula:AppData.Dims~}');
// '5000'
```

## Related

- [S](architecture/templating/ref-solve.md) -- Inline expression evaluation
