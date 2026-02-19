# Reference: DataJson (DJ)

Returns a resolved value serialized as JSON via `JSON.stringify()`.

**Tags:** `{~DataJson:ADDRESS~}` `{~DJ:ADDRESS~}` or `{~DJ:~}`

**Source:** `pict/source/templates/data/Pict-Template-DataJson.js`

## Syntax

```
{~DJ:ADDRESS~}
{~DJ:~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | No | Dot-notation path. If empty, serializes the entire Record. |

## Behavior

- Resolves the address against the unified state
- Calls `JSON.stringify()` on the resolved value
- If ADDRESS is empty, serializes the entire Record object
- Returns the JSON string

## Examples

```javascript
_Pict.AppData.Config = { theme: 'dark', language: 'en' };
_Pict.parseTemplate('{~DJ:AppData.Config~}');
// '{"theme":"dark","language":"en"}'

// Empty address serializes the Record
_Pict.parseTemplate('{~DJ:~}', { id: 1, name: 'Test' });
// '{"id":1,"name":"Test"}'
```

```html
<script>
var config = {~DJ:AppData.Config~};
</script>
```

## Related

- [D](architecture/templating/ref-data.md) -- Basic data access (string coercion)
- [DEJS](architecture/templating/ref-dejs.md) -- Data escaped for JavaScript string literals
