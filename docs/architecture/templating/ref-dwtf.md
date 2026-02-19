# Reference: DataWithTemplateFallback (DWTF)

Resolves a value from the address space. Renders a fallback template if the value is falsy.

**Tags:** `{~DataWithTemplateFallback:ADDRESS:FALLBACK_HASH~}` `{~DWTF:ADDRESS:FALLBACK_HASH~}`

**Source:** `pict/source/templates/Pict-Template-DataWithTemplateFallback.js`

## Syntax

```
{~DWTF:DATA_ADDRESS:FALLBACK_TEMPLATE_HASH~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| DATA_ADDRESS | Yes | Dot-notation path to resolve |
| FALLBACK_TEMPLATE_HASH | Yes | Hash of a registered template to render when the value is falsy |

## Behavior

- Resolves the address against the unified state
- If the value is truthy, returns it as a string
- If the value is falsy, renders the registered template identified by FALLBACK_TEMPLATE_HASH
- The fallback template is fully parsed, so it can contain any Jellyfish expressions

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('MissingTitle',
	'<span class="placeholder">No title specified</span>');

_Pict.parseTemplate('{~DWTF:Record.Title:MissingTitle~}', { Title: 'Dune' });
// 'Dune'

_Pict.parseTemplate('{~DWTF:Record.Title:MissingTitle~}', {});
// '<span class="placeholder">No title specified</span>'
```

## Related

- [D](architecture/templating/ref-data.md) -- Basic data access
- [DWAF](architecture/templating/ref-dwaf.md) -- Data with literal fallback (returns a string instead of rendering a template)
