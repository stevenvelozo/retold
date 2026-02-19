# Reference: TemplateSetFromMap (TSFM)

Looks up a key in a map to get an array, then renders a template for each item.

**Tags:** `{~TemplateSetFromMap:HASH:MAP:KEY~}` `{~TSFM:HASH:MAP:KEY~}`

**Source:** `pict/source/templates/Pict-Template-TemplateSetFromMap.js`

## Syntax

```
{~TSFM:TEMPLATE_HASH:MAP_ADDRESS:KEY_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Hash of the template to render per item |
| MAP_ADDRESS | Yes | Address of a map whose values are arrays |
| KEY_ADDRESS | Yes | Address containing the key to look up |

## Examples

```javascript
_Pict.AppData.Teams = {
	'Engineering': [{ Name: 'Alice' }, { Name: 'Bob' }],
	'Design': [{ Name: 'Carol' }]
};

_Pict.TemplateProvider.addTemplate('Member', '<li>{~D:Record.Name~}</li>');

_Pict.parseTemplate(
	'<ul>{~TSFM:Member:AppData.Teams:Record.Dept~}</ul>',
	{ Dept: 'Engineering' });
// '<ul><li>Alice</li><li>Bob</li></ul>'
```

## Related

- [TS](architecture/templating/ref-ts.md) -- Iterate over a direct collection
- [TFM](architecture/templating/ref-tfm.md) -- Single item from map (not iterated)
