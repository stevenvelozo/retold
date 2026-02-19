# Reference: TemplateIfAbsolute (TIfAbs)

Compares a data-resolved value against a literal. Renders a template if the comparison is true.

**Tags:** `{~TemplateIfAbsolute:HASH:DATA:CONDITION~}` `{~TIfAbs:HASH:DATA:CONDITION~}`

**Source:** `pict/source/templates/logic/Pict-Template-TemplateIfAbsolute.js`

## Syntax

```
{~TIfAbs:TEMPLATE_HASH:DATA_ADDRESS:LEFT^OPERATOR^LITERAL~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Template to render if true |
| DATA_ADDRESS | No | Data to pass as Record (can be empty) |
| LEFT | Yes | Address for left operand |
| OPERATOR | Yes | Comparison operator (same as TIf) |
| LITERAL | Yes | A literal value (not resolved from data) |

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('Admin', '<span>Admin</span>');

_Pict.AppData.User = { Role: 'admin' };
_Pict.parseTemplate('{~TIfAbs:Admin::AppData.User.Role^==^admin~}');
// '<span>Admin</span>'

_Pict.parseTemplate('{~TIfAbs:Admin::AppData.User.Role^==^guest~}');
// ''
```

## Related

- [TIf](architecture/templating/ref-tif.md) -- Compare two data addresses
- [NE](architecture/templating/ref-ne.md) -- Simple truthiness output
