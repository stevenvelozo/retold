# Reference: Data (D)

Resolves a value from Pict's address space and returns it as a string.

**Tags:** `{~Data:ADDRESS~}` `{~D:ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-Data.js`

## Syntax

```
{~D:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Dot-notation path into the unified state object |

## Behavior

- Resolves the address against the unified state (AppData, Record, Bundle, TempData, Context, Scope, Pict)
- Returns the resolved value coerced to a string
- Returns empty string if the address resolves to `undefined` or `null`
- Does not escape HTML or special characters

## Examples

```javascript
_Pict.AppData.User = { Name: 'Alice', Age: 30 };

_Pict.parseTemplate('{~D:AppData.User.Name~}');
// 'Alice'

_Pict.parseTemplate('{~D:AppData.User.Age~}');
// '30'

_Pict.parseTemplate('{~D:Record.City~}', { City: 'Portland' });
// 'Portland'

_Pict.parseTemplate('{~D:AppData.Missing.Path~}');
// ''
```

## Related

- [DWAF](architecture/templating/ref-dwaf.md) -- Data with literal fallback
- [DWTF](architecture/templating/ref-dwtf.md) -- Data with template fallback
- [DJ](architecture/templating/ref-dj.md) -- Data as JSON
- [DEJS](architecture/templating/ref-dejs.md) -- Data escaped for JavaScript strings
