# Reference: TemplateSet (TS)

Renders a template once for each item in a collection. Each item becomes Record.

**Tags:** `{~TemplateSet:HASH:COLLECTION~}` `{~TS:HASH:COLLECTION~}`

**Source:** `pict/source/templates/Pict-Template-TemplateSet.js`

## Syntax

```
{~TS:TEMPLATE_HASH:COLLECTION_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Hash of the template to render per item |
| COLLECTION_ADDRESS | Yes | Address of an array or object to iterate |

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('Row',
	'<tr><td>{~D:Record.Name~}</td></tr>');

_Pict.AppData.Users = [
	{ Name: 'Alice' },
	{ Name: 'Bob' }
];

_Pict.parseTemplate('<table>{~TS:Row:AppData.Users~}</table>');
// '<table><tr><td>Alice</td></tr><tr><td>Bob</td></tr></table>'
```

## Related

- [TSFM](architecture/templating/ref-tsfm.md) -- Iterate from a map lookup
- [TSWP](architecture/templating/ref-tswp.md) -- Iterate with payload
- [TVS](architecture/templating/ref-tvs.md) -- Iterate over values with key/index metadata
