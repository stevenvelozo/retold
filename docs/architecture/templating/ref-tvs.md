# Reference: TemplateValueSet (TVS)

Iterates over values of an object or array. Includes Key, Value, Index, and Count metadata.

**Tags:** `{~TemplateValueSet:HASH:ADDRESS~}` `{~TVS:HASH:ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-TemplateValueSet.js`

## Syntax

```
{~TVS:TEMPLATE_HASH:DATA_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Hash of the template to render per value |
| DATA_ADDRESS | Yes | Address of an object or array |

## Record Properties

| Property | Description |
|----------|-------------|
| `Record.Key` | Array index or object key |
| `Record.Value` | The value at that key |
| `Record.Index` | Zero-based index |
| `Record.Count` | Total number of items |

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('Tag', '<span>{~D:Record.Value~}</span>');

_Pict.AppData.Tags = ['js', 'node', 'express'];
_Pict.parseTemplate('{~TVS:Tag:AppData.Tags~}');
// '<span>js</span><span>node</span><span>express</span>'

// Object (sorted keys)
_Pict.AppData.Users = { '2': 'Bob', '1': 'Alice' };
_Pict.parseTemplate('{~TVS:Tag:AppData.Users~}');
// '<span>Alice</span><span>Bob</span>'
```

## Related

- [TS](architecture/templating/ref-ts.md) -- Iterate objects as Record directly
