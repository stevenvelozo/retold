# Reference: Entity (E)

Fetches a record from a Meadow REST API and renders a template with it. Asynchronous.

**Tags:** `{~Entity:TYPE^ID^HASH~}` `{~E:TYPE^ID^HASH~}`

**Source:** `pict/source/templates/Pict-Template-Entity.js`

## Syntax

```
{~E:ENTITY_TYPE^ID_OR_ADDRESS^TEMPLATE_HASH~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ENTITY_TYPE | Yes | Meadow entity scope (e.g., `Book`, `User`) |
| ID_OR_ADDRESS | Yes | Static ID or address resolving to an ID |
| TEMPLATE_HASH | Yes | Template to render with the fetched record |

## Behavior

- Fetches the entity via `pict.EntityProvider.getEntity()`
- Requires a callback (async-only; sync returns empty string)
- The fetched record becomes Record in the rendered template

## Examples

```javascript
_Pict.TemplateProvider.addTemplate('BookCard',
	'<h3>{~D:Record.Title~}</h3>');

// Static ID
_Pict.parseTemplate('{~E:Book^42^BookCard~}', {},
	(pError, pResult) => { /* pResult: '<h3>Dune</h3>' */ });

// Dynamic ID
_Pict.parseTemplate('{~E:Book^Record.IDBook^BookCard~}',
	{ IDBook: 100 },
	(pError, pResult) => { /* fetches Book 100 */ });
```

## Related

- [T](architecture/templating/ref-template.md) -- Render with local data (no fetch)
