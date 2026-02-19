# Reference: HtmlCommentEnd (HCE)

Conditionally outputs ` -->` to close an HTML comment. Pair with HtmlCommentStart.

**Tags:** `{~HtmlCommentEnd:ADDRESS~}` `{~HCE:ADDRESS~}` or `{~HCE:ADDRESS:POLARITY~}`

**Source:** `pict/source/templates/data/Pict-Template-HtmlCommentEnd.js`

## Syntax

```
{~HCE:ADDRESS~}
{~HCE:ADDRESS:POLARITY~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a value to check (must match the corresponding HCS) |
| POLARITY | No | Must match the corresponding HCS polarity |

## Examples

See [HCS](architecture/templating/ref-hcs.md) for combined examples.

## Related

- [HCS](architecture/templating/ref-hcs.md) -- Matching comment start tag
