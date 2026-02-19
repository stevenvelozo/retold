# Reference: RandomNumber (RN)

Generates a random integer between a minimum and maximum value.

**Tags:** `{~RandomNumber:MIN,MAX~}` `{~RN:MIN,MAX~}` or `{~RN:~}`

**Source:** `pict/source/templates/data-generation/Pict-Template-RandomNumber.js`

## Syntax

```
{~RN:MIN,MAX~}
{~RN:~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| MIN | No | Minimum value (default: 0) |
| MAX | No | Maximum value (default: 9999999, separated from MIN by `,`) |

## Examples

```javascript
_Pict.parseTemplate('{~RN:1,100~}');
// Random integer 1-100

_Pict.parseTemplate('{~RN:~}');
// Random integer 0-9999999
```

## Related

- [RNS](architecture/templating/ref-rns.md) -- Zero-padded random number string
