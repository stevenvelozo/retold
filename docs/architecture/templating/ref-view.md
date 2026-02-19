# Reference: View (V)

Renders a registered Pict view inline.

**Tags:** `{~View:VIEW_HASH~}` `{~V:VIEW_HASH~}`

**Source:** `pict/source/templates/Pict-Template-View.js`

## Syntax

```
{~V:VIEW_HASH~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| VIEW_HASH | Yes | Hash of a registered Pict view |

## Behavior

- Triggers the view's render pipeline
- Captures output to a virtual render target
- Returns the rendered string

## Examples

```html
<div class="page">
	{~V:HeaderView~}
	<main>{~D:AppData.Content~}</main>
	{~V:FooterView~}
</div>
```

## Related

- [VRS](architecture/templating/ref-vrs.md) -- View with scope retention
- [P](architecture/templating/ref-pict.md) -- Pict instance reference
