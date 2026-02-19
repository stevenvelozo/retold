# Reference: PluckJoinUnique (PJU)

Plucks a property from each object in an array, deduplicates, and joins with a separator.

**Tags:** `{~PluckJoinUnique:SEPARATOR^PROPERTY^ARRAY_ADDRESS~}` `{~PJU:SEPARATOR^PROPERTY^ARRAY_ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-PluckJoinUnique.js`

## Syntax

```
{~PJU:SEPARATOR^PROPERTY^ARRAY_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| SEPARATOR | Yes | String placed between joined values |
| PROPERTY | Yes | Property name to extract from each array item |
| ARRAY_ADDRESS | Yes | Address of the array (separated by `^`) |

## Examples

```javascript
_Pict.AppData.Files = [
	{ name: 'photo.jpg', type: 'image' },
	{ name: 'doc.pdf', type: 'document' },
	{ name: 'logo.png', type: 'image' }
];

_Pict.parseTemplate('{~PJU:, ^type^AppData.Files~}');
// 'image, document'
```

## Related

- [J](architecture/templating/ref-join.md) -- Join values from addresses
- [JU](architecture/templating/ref-joinunique.md) -- Join unique values from addresses
