# Reference: Join (J)

Joins resolved values from multiple addresses with a separator. Skips empty values and flattens arrays.

**Tags:** `{~Join:SEPARATOR^ADDR1^ADDR2^...~}` `{~J:SEPARATOR^ADDR1^ADDR2^...~}`

**Source:** `pict/source/templates/data/Pict-Template-Join.js`

## Syntax

```
{~J:SEPARATOR^ADDRESS1^ADDRESS2^ADDRESS3~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| SEPARATOR | Yes | String placed between joined values |
| ADDRESS1..N | Yes | Addresses to resolve and join (separated by `^`) |

## Behavior

- Resolves each address
- Skips empty or falsy values
- Flattens any arrays encountered
- Joins remaining values with the separator

## Examples

```javascript
_Pict.parseTemplate('{~J:, ^Record.City^Record.State^Record.Country~}',
	{ City: 'Portland', State: 'Oregon', Country: 'US' });
// 'Portland, Oregon, US'

// Empty values skipped
_Pict.parseTemplate('{~J:, ^Record.City^Record.State~}',
	{ City: 'Portland', State: '' });
// 'Portland'
```

## Related

- [JU](architecture/templating/ref-joinunique.md) -- Join with deduplication
- [PJU](architecture/templating/ref-pluckjoinunique.md) -- Pluck a property from array items, deduplicate, join
