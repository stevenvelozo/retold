# Reference: TemplateIf (TIf)

Compares two data-resolved values. Renders a template if the comparison is true.

**Tags:** `{~TemplateIf:HASH:DATA:CONDITION~}` `{~TIf:HASH:DATA:CONDITION~}`

**Source:** `pict/source/templates/logic/Pict-Template-TemplateIf.js`

## Syntax

```
{~TIf:TEMPLATE_HASH:DATA_ADDRESS:LEFT^OPERATOR^RIGHT~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Template to render if true |
| DATA_ADDRESS | No | Data to pass as Record (can be empty) |
| LEFT | Yes | Address for left operand |
| OPERATOR | Yes | Comparison operator |
| RIGHT | Yes | Address for right operand |

## Operators

`==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`, `TRUE`, `FALSE`, `LNGT` (length >), `LNLT` (length <)

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('Match', '<span>Match!</span>');

_Pict.AppData = { Actual: 200, Expected: 200 };
_Pict.parseTemplate('{~TIf:Match::AppData.Actual^==^AppData.Expected~}');
// '<span>Match!</span>'

_Pict.parseTemplate('{~TIf:Match::AppData.Actual^>^AppData.Expected~}');
// '' (200 is not > 200)
```

## Related

- [TIfAbs](architecture/templating/ref-tifabs.md) -- Compare against a literal value
- [NE](architecture/templating/ref-ne.md) -- Simple truthiness check
