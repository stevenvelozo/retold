# Reference: TemplateByDataAddress (TBDA)

Reads a template string from a data address and parses it inline.

**Tags:** `{~TemplateByDataAddress:ADDRESS~}` `{~TBDA:ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-TemplateByDataAddress.js`

## Syntax

```
{~TBDA:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a string containing template content |

## Behavior

- Resolves a template string (the actual markup) from data
- Fully parses the resolved string for Jellyfish expressions
- Useful when template content is stored in configuration or database records

## Examples

```javascript
_Pict.AppData.CustomBanner = '<h1>{~D:AppData.SiteName~}</h1>';
_Pict.AppData.SiteName = 'My Store';

_Pict.parseTemplate('{~TBDA:AppData.CustomBanner~}');
// '<h1>My Store</h1>'
```

## Related

- [T](architecture/templating/ref-template.md) -- Render by hash (pre-registered)
- [TBR](architecture/templating/ref-tbr.md) -- Resolve hash name from data, then render
- [TFA](architecture/templating/ref-tfa.md) -- Identical to TBDA
