# Reference: TemplateFromMap (TFM)

Looks up a key in a map, retrieves the entry, and renders a template with it as Record.

**Tags:** `{~TemplateFromMap:HASH:MAP:KEY~}` `{~TFM:HASH:MAP:KEY~}`

**Source:** `pict/source/templates/Pict-Template-TemplateFromMap.js`

## Syntax

```
{~TFM:TEMPLATE_HASH:MAP_ADDRESS:KEY_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Hash of the template to render |
| MAP_ADDRESS | Yes | Address of the map/object |
| KEY_ADDRESS | Yes | Address containing the key to look up |

## Examples

```javascript
_Pict.AppData.Authors = {
	'A-01': { Name: 'Frank Herbert', Born: 1920 },
	'A-02': { Name: 'William Gibson', Born: 1948 }
};

_Pict.TemplateProvider.addTemplate('AuthorLabel',
	'{~D:Record.Name~} (b. {~D:Record.Born~})');

_Pict.parseTemplate('{~TFM:AuthorLabel:AppData.Authors:Record.IDAuthor~}',
	{ IDAuthor: 'A-01' });
// 'Frank Herbert (b. 1920)'
```

## Related

- [T](architecture/templating/ref-template.md) -- Render with direct data
- [DVBK](architecture/templating/ref-dvbk.md) -- Simple value lookup by key
- [TSFM](architecture/templating/ref-tsfm.md) -- Iterate an array from a map
