# Reference: TemplateByReference (TBR)

Reads a template hash (name) from a data address, then renders that registered template.

**Tags:** `{~TemplateByReference:ADDRESS~}` `{~TBR:ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-TemplateByReference.js`

## Syntax

```
{~TBR:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a string containing a registered template hash |

## Behavior

- Resolves the address to get a template hash string
- Looks up that hash in the TemplateProvider
- Renders the registered template

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('CardLayout',
	'<div class="card">{~D:Record.Content~}</div>');
_Pict.TemplateProvider.addTemplate('ListLayout',
	'<li>{~D:Record.Content~}</li>');

_Pict.parseTemplate('{~TBR:Record.Layout~}',
	{ Layout: 'CardLayout', Content: 'Hello' });
// '<div class="card">Hello</div>'
```

## Related

- [T](architecture/templating/ref-template.md) -- Render by a known hash
- [TBDA](architecture/templating/ref-tbda.md) -- Resolve template content (not hash) from data
