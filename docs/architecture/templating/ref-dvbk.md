# Reference: DataValueByKey (DVBK)

Accesses an object using a dynamic key resolved from a data address.

**Tags:** `{~DataValueByKey:OBJECT_ADDRESS^KEY_ADDRESS~}` `{~DVBK:OBJECT_ADDRESS^KEY_ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-DataValueByKey.js`

## Syntax

```
{~DVBK:OBJECT_ADDRESS^KEY_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| OBJECT_ADDRESS | Yes | Address of the object to access |
| KEY_ADDRESS | Yes | Address containing the key to use for the lookup (separated by `^`) |

## Behavior

- Resolves the object at OBJECT_ADDRESS
- Resolves the key string from KEY_ADDRESS
- Returns `object[key]` as a string
- Returns empty string if the object or key is missing

## Examples

```javascript
_Pict.AppData.Labels = {
	'active': 'Currently Active',
	'pending': 'Awaiting Review',
	'closed': 'Completed'
};

_Pict.parseTemplate('{~DVBK:AppData.Labels^Record.Status~}',
	{ Status: 'pending' });
// 'Awaiting Review'
```

## Related

- [D](architecture/templating/ref-data.md) -- Basic data access (static path)
- [TFM](architecture/templating/ref-tfm.md) -- Template from map (looks up and renders a template)
