# Reference: DataWithAbsoluteFallback (DWAF)

Resolves a value from the address space. Returns a literal fallback string if the value is falsy.

**Tags:** `{~DataWithAbsoluteFallback:ADDRESS^FALLBACK~}` `{~DWAF:ADDRESS^FALLBACK~}`

**Source:** `pict/source/templates/Pict-Template-DataWithAbsoluteFallback.js`

## Syntax

```
{~DWAF:ADDRESS^LITERAL_FALLBACK~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Dot-notation path to resolve |
| LITERAL_FALLBACK | Yes | Plain string returned when the value is falsy (separated by `^`) |

## Behavior

- Resolves the address against the unified state
- If the value is truthy, returns it as a string
- If the value is falsy (`undefined`, `null`, `''`, `0`, `false`), returns the literal fallback string
- The fallback is not parsed for template expressions -- it is returned as-is

## Examples

```javascript
_Pict.parseTemplate('{~DWAF:Record.Title^Untitled~}', { Title: 'Dune' });
// 'Dune'

_Pict.parseTemplate('{~DWAF:Record.Title^Untitled~}', {});
// 'Untitled'

_Pict.parseTemplate('{~DWAF:Record.Count^0 items~}', { Count: 0 });
// '0 items' (0 is falsy)
```

## Related

- [D](architecture/templating/ref-data.md) -- Basic data access
- [DWTF](architecture/templating/ref-dwtf.md) -- Data with template fallback (renders a template instead of a literal)
