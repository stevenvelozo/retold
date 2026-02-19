# Entity Expressions

Entity expressions integrate with Pict's Meadow API layer to fetch records from REST endpoints and render them with templates. These are inherently asynchronous.

## Entity (E)

Fetches an entity record from a Meadow REST API by type and ID, then renders a template with the fetched record.

**Tags:** `{~Entity:ENTITY_TYPE^ID^TEMPLATE_HASH~}` `{~E:ENTITY_TYPE^ID^TEMPLATE_HASH~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ENTITY_TYPE | The Meadow entity scope (e.g., `Book`, `User`, `Order`) |
| ID | A static ID or address that resolves to an ID |
| TEMPLATE_HASH | Hash of the template to render with the fetched record |

### Static ID

```javascript
_Pict.TemplateProvider.addTemplate('BookCard',
	'<div class="book"><h3>{~D:Record.Title~}</h3><p>By {~D:Record.Author~}</p></div>');

_Pict.parseTemplate('{~E:Book^42^BookCard~}', {},
	(pError, pResult) =>
	{
		console.log(pResult);
		// '<div class="book"><h3>Dune</h3><p>By Frank Herbert</p></div>'
	});
```

### Dynamic ID from Data

The ID parameter can be a data address that resolves to the actual ID value.

```javascript
_Pict.parseTemplate('{~E:Book^Record.IDBook^BookCard~}',
	{ IDBook: 100 },
	(pError, pResult) =>
	{
		console.log(pResult);
		// Fetches Book with ID 100 and renders with BookCard
	});
```

### How It Works

When the Entity expression encounters `{~E:Book^42^BookCard~}`:

1. It resolves the ID (static `42` or dynamic from a data address)
2. Calls `pict.EntityProvider.getEntity('Book', 42, callback)` to fetch the record via REST API
3. On success, renders the template `BookCard` with the fetched record as `Record`
4. Returns the rendered string through the callback

The EntityProvider uses Pict's configured API base URL and authentication to make the HTTP request. This means templates can transparently reference server-side data without the template author managing API calls.

### Synchronous Fallback

When called synchronously (no callback), the Entity expression returns an empty string. Entity fetching requires a callback because it involves a network request.

```javascript
// Sync: returns empty string
let tmpResult = _Pict.parseTemplate('{~E:Book^42^BookCard~}');
// ''

// Async: returns fetched and rendered content
_Pict.parseTemplate('{~E:Book^42^BookCard~}', {}, (pError, pResult) =>
{
	// pResult contains the rendered content
});
```

### Practical Pattern: Related Entity Display

A common pattern is displaying related entities in a list. Each item has a foreign key, and the Entity expression fetches and renders the related record inline.

```javascript
_Pict.TemplateProvider.addTemplate('AuthorName',
	'{~D:Record.FirstName~} {~D:Record.LastName~}');

_Pict.TemplateProvider.addTemplate('BookRow',
	'<tr><td>{~D:Record.Title~}</td><td>{~E:Author^Record.IDAuthor^AuthorName~}</td></tr>');

_Pict.AppData.Books = [
	{ Title: 'Dune', IDAuthor: 1 },
	{ Title: 'Neuromancer', IDAuthor: 2 }
];

_Pict.parseTemplate(
	'<table>{~TS:BookRow:AppData.Books~}</table>',
	{},
	(pError, pResult) =>
	{
		// Each row fetches its author by ID and renders the name
	});
```

This pattern works because the template engine processes async expressions within template sets correctly -- it waits for all entity fetches to complete before assembling the final output.
