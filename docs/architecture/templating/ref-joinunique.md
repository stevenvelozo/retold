# Reference: JoinUnique (JU)

Joins resolved values, deduplicating before joining.

**Tags:** `{~JoinUnique:SEPARATOR^ADDR1^ADDR2^...~}` `{~JU:SEPARATOR^ADDR1^ADDR2^...~}`

**Source:** `pict/source/templates/data/Pict-Template-JoinUnique.js`

## Syntax

```
{~JU:SEPARATOR^ADDRESS1^ADDRESS2^ADDRESS3~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| SEPARATOR | Yes | String placed between joined values |
| ADDRESS1..N | Yes | Addresses to resolve, deduplicate, and join (separated by `^`) |

## Examples

```javascript
_Pict.AppData = { Tag1: 'js', Tag2: 'node', Tag3: 'js' };

_Pict.parseTemplate('{~JU:, ^AppData.Tag1^AppData.Tag2^AppData.Tag3~}');
// 'js, node'
```

## Related

- [J](architecture/templating/ref-join.md) -- Join without deduplication
- [PJU](architecture/templating/ref-pluckjoinunique.md) -- Pluck from array, deduplicate, join
