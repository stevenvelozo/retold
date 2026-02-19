# Reference: RandomNumberString (RNS)

Generates a zero-padded random numeric string of a specified length.

**Tags:** `{~RandomNumberString:LENGTH~}` `{~RNS:LENGTH~}` or `{~RNS:LENGTH,MAX~}`

**Source:** `pict/source/templates/data-generation/Pict-Template-RandomNumberString.js`

## Syntax

```
{~RNS:LENGTH~}
{~RNS:LENGTH,MAX~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| LENGTH | No | Output string length (default: 4) |
| MAX | No | Maximum numeric value (default: 10^LENGTH - 1, separated by `,`) |

## Examples

```javascript
_Pict.parseTemplate('{~RNS:6~}');
// e.g., '003847' (always 6 characters)

_Pict.parseTemplate('{~RNS:4~}');
// e.g., '0042' (always 4 characters)
```

## Related

- [RN](architecture/templating/ref-rn.md) -- Random number (not padded)
