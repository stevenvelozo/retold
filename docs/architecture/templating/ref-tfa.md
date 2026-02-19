# Reference: TemplateFromAddress (TFA)

Reads template content from a data address and parses it. Identical to TBDA.

**Tags:** `{~TemplateFromAddress:ADDRESS~}` `{~TFA:ADDRESS~}`

**Source:** `pict/source/templates/Pict-Template-TemplateFromAddress.js`

## Syntax

```
{~TFA:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a string containing template content |

## Examples

```javascript
_Pict.parseTemplate('{~TFA:Record.Markup~}',
	{ Markup: '<b>{~D:Record.Name~}</b>', Name: 'Alice' });
// '<b>Alice</b>'
```

## Related

- [TBDA](architecture/templating/ref-tbda.md) -- Identical behavior
- [TBR](architecture/templating/ref-tbr.md) -- Resolve a template hash from data
