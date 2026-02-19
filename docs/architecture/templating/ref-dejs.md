# Reference: DataEncodeJavascriptString (DEJS)

Resolves a value and escapes it for safe use inside a JavaScript string literal.

**Tags:** `{~DataEncodeJavascriptString:ADDRESS~}` `{~DEJS:ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-DataEncodeJavascriptString.js`

## Syntax

```
{~DEJS:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Dot-notation path to resolve |

## Behavior

- Resolves the address against the unified state
- Escapes quotes, backslashes, and other characters that would break a JavaScript string literal
- Returns the escaped string

## Examples

```javascript
_Pict.parseTemplate('"{~DEJS:Record.Text~}"',
	{ Text: 'She said "hello"' });
// '"She said \"hello\""'
```

```html
<button onclick="{~P~}.search('{~DEJS:Record.Query~}')">Search</button>
```

## Related

- [D](architecture/templating/ref-data.md) -- Basic data access (no escaping)
- [DJ](architecture/templating/ref-dj.md) -- Data as JSON
