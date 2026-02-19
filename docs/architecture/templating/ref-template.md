# Reference: Template (T)

Renders a registered template by its hash.

**Tags:** `{~Template:HASH~}` `{~T:HASH~}` or `{~T:HASH:DATA_ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-Template.js`

## Syntax

```
{~T:TEMPLATE_HASH~}
{~T:TEMPLATE_HASH:DATA_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Hash of a registered template |
| DATA_ADDRESS | No | Address to resolve and pass as Record |

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('Badge',
	'<span class="badge">{~D:Record.Label~}</span>');

_Pict.parseTemplate('{~T:Badge:AppData.User~}');
// Renders Badge with AppData.User as Record

_Pict.parseTemplate('{~T:Badge~}', { Label: 'Admin' });
// Renders Badge with the current Record
```

## Related

- [TBR](architecture/templating/ref-tbr.md) -- Template hash from data
- [TBDA](architecture/templating/ref-tbda.md) -- Template content from data
- [TS](architecture/templating/ref-ts.md) -- Render for each item in a collection
