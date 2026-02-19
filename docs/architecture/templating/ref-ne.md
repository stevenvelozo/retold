# Reference: NotEmpty (NE)

Outputs a literal string if a value is truthy. Otherwise outputs nothing.

**Tags:** `{~NotEmpty:ADDRESS^OUTPUT~}` `{~NE:ADDRESS^OUTPUT~}`

**Source:** `pict/source/templates/logic/Pict-Template-NotEmpty.js`

## Syntax

```
{~NE:ADDRESS^LITERAL_OUTPUT~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a value to check for truthiness |
| LITERAL_OUTPUT | Yes | String to output if truthy (separated by `^`) |

## Examples

```javascript
_Pict.parseTemplate('{~NE:Record.Name^has name~}', { Name: 'Alice' });
// 'has name'

_Pict.parseTemplate('{~NE:Record.Name^has name~}', {});
// ''
```

```html
<div class="item{~NE:Record.IsActive^ active~}">
{~D:Record.AddressLine2~}{~NE:Record.AddressLine2^<br/>~}
```

## Related

- [TIfAbs](architecture/templating/ref-tifabs.md) -- Full conditional with template rendering
- [HCS](architecture/templating/ref-hcs.md) / [HCE](architecture/templating/ref-hce.md) -- HTML comment toggling
