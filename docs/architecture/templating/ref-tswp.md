# Reference: TemplateSetWithPayload (TSWP)

Renders a template for each item, wrapping each as `{ Data, Payload }`.

**Tags:** `{~TemplateSetWithPayload:HASH:COLLECTION:PAYLOAD~}` `{~TSWP:HASH:COLLECTION:PAYLOAD~}`

**Source:** `pict/source/templates/Pict-Template-TemplateSetWithPayload.js`

## Syntax

```
{~TSWP:TEMPLATE_HASH:COLLECTION_ADDRESS:PAYLOAD_ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| TEMPLATE_HASH | Yes | Hash of the template to render per item |
| COLLECTION_ADDRESS | Yes | Address of an array to iterate |
| PAYLOAD_ADDRESS | Yes | Address of extra data included with each item |

## Behavior

Inside the rendered template, Record has two properties:
- `Record.Data` -- the current array item
- `Record.Payload` -- the resolved payload object

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('Item',
	'<div class="{~D:Record.Payload.cssClass~}">{~D:Record.Data.Name~}</div>');

_Pict.AppData.Items = [{ Name: 'Widget' }, { Name: 'Gadget' }];
_Pict.AppData.Config = { cssClass: 'product-card' };

_Pict.parseTemplate('{~TSWP:Item:AppData.Items:AppData.Config~}');
// '<div class="product-card">Widget</div><div class="product-card">Gadget</div>'
```

## Related

- [TS](architecture/templating/ref-ts.md) -- Iterate without payload
- [TVS](architecture/templating/ref-tvs.md) -- Iterate over values with metadata
