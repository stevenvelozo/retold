# Reference: HtmlCommentStart (HCS)

Conditionally outputs `<!-- ` to start an HTML comment based on a value's truthiness.

**Tags:** `{~HtmlCommentStart:ADDRESS~}` `{~HCS:ADDRESS~}` or `{~HCS:ADDRESS:POLARITY~}`

**Source:** `pict/source/templates/data/Pict-Template-HtmlCommentStart.js`

## Syntax

```
{~HCS:ADDRESS~}
{~HCS:ADDRESS:POLARITY~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a value to check |
| POLARITY | No | Default: comment when **falsy**. Set to `1`/`true`/`t` to comment when **truthy**. |

## Examples

```javascript
// Default: comments out when value is falsy
_Pict.parseTemplate('{~HCS:Record.Show~}<p>Content</p>{~HCE:Record.Show~}',
	{ Show: true });
// '<p>Content</p>'

_Pict.parseTemplate('{~HCS:Record.Show~}<p>Content</p>{~HCE:Record.Show~}',
	{ Show: false });
// '<!-- <p>Content</p> -->'
```

## Related

- [HCE](architecture/templating/ref-hce.md) -- Matching comment end tag
