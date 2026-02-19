# Reference: TemplateByType (TBT)

Checks a value's JavaScript type and renders a template if the type matches.

**Tags:** `{~TemplateByType:ADDR:TYPE:HASH~}` `{~TBT:ADDR:TYPE:HASH~}` or `{~TBT:ADDR:TYPE:HASH:FALLBACK_ADDR:FALLBACK_HASH~}`

**Source:** `pict/source/templates/Pict-Template-TemplateByTypes.js`

## Syntax

```
{~TBT:DATA_ADDRESS:TYPE:TEMPLATE_HASH~}
{~TBT:DATA_ADDRESS:TYPE:TEMPLATE_HASH:FALLBACK_DATA:FALLBACK_TEMPLATE~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| DATA_ADDRESS | Yes | Address of the value to type-check |
| TYPE | Yes | Expected JavaScript type (`string`, `number`, `object`, `boolean`, `undefined`) |
| TEMPLATE_HASH | Yes | Template to render if the type matches |
| FALLBACK_DATA | No | Data address for fallback rendering |
| FALLBACK_TEMPLATE | No | Template to render if the type does not match |

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('ShowText', '<p>{~D:Record.Value~}</p>');
_Pict.TemplateProvider.addTemplate('ShowNum', '<p>{~Digits:Record.Value~}</p>');

_Pict.AppData.Item = { Value: 'Hello' };
_Pict.parseTemplate('{~TBT:AppData.Item.Value:string:ShowText~}');
// '<p>Hello</p>'

// With fallback
_Pict.AppData.Item = { Value: 42 };
_Pict.parseTemplate(
	'{~TBT:AppData.Item.Value:string:ShowText:AppData.Item:ShowNum~}');
// '<p>42.00</p>'
```

## Related

- [TIf](architecture/templating/ref-tif.md) -- Conditional by value comparison
- [TIfAbs](architecture/templating/ref-tifabs.md) -- Conditional by literal comparison
