# Iteration Expressions

Iteration expressions render a template once for each item in a collection. These are the primary mechanism for generating lists, tables, and repeated structures.

## TemplateSet (TS)

Renders a registered template once for each item in an array or object. Each item becomes the `Record` inside the template.

**Tags:** `{~TemplateSet:TEMPLATE_HASH:COLLECTION_ADDRESS~}` `{~TS:TEMPLATE_HASH:COLLECTION_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render for each item |
| COLLECTION_ADDRESS | Address of an array or object to iterate over |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('ProductRow',
	'<tr><td>{~D:Record.Name~}</td><td>{~Dollars:Record.Price~}</td></tr>');

_Pict.AppData.Products = [
	{ Name: 'Widget', Price: 9.99 },
	{ Name: 'Gadget', Price: 19.99 },
	{ Name: 'Sprocket', Price: 4.50 }
];

_Pict.parseTemplate('<table>{~TS:ProductRow:AppData.Products~}</table>');
// '<table><tr><td>Widget</td><td>$9.99</td></tr><tr><td>Gadget</td><td>$19.99</td></tr><tr><td>Sprocket</td><td>$4.50</td></tr></table>'
```

When iterating over an object, each value becomes Record and the iteration follows the object's key order.

TemplateSet is the workhorse of list rendering. Every table body, navigation menu, card grid, or repeated structure typically uses a TemplateSet.

---

## TemplateSetFromMap (TSFM)

Looks up a key in a map to get an array, then renders a template for each item in that array.

**Tags:** `{~TemplateSetFromMap:TEMPLATE_HASH:MAP_ADDRESS:KEY_ADDRESS~}` `{~TSFM:TEMPLATE_HASH:MAP_ADDRESS:KEY_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render for each item |
| MAP_ADDRESS | Address of a map/object whose values are arrays |
| KEY_ADDRESS | Address containing the key to look up in the map |

**Examples:**

```javascript
_Pict.AppData.TeamRoster = {
	'Engineering': [
		{ Name: 'Alice', Title: 'Lead' },
		{ Name: 'Bob', Title: 'Senior' }
	],
	'Design': [
		{ Name: 'Carol', Title: 'Director' },
		{ Name: 'Dave', Title: 'Senior' }
	]
};

_Pict.TemplateProvider.addTemplate('MemberRow',
	'<li>{~D:Record.Name~} - {~D:Record.Title~}</li>');

_Pict.parseTemplate(
	'<ul>{~TSFM:MemberRow:AppData.TeamRoster:Record.Department~}</ul>',
	{ Department: 'Engineering' });
// '<ul><li>Alice - Lead</li><li>Bob - Senior</li></ul>'
```

This is useful when your data is organized as a map of arrays (e.g., items grouped by category, team members grouped by department) and you need to render one group at a time.

---

## TemplateSetWithPayload (TSWP)

Renders a template for each item in a collection, wrapping each item as `{ Data: <item>, Payload: <payloadData> }`. Inside templates, use `Record.Data` for the current item and `Record.Payload` for the extra data.

**Tags:** `{~TemplateSetWithPayload:TEMPLATE_HASH:COLLECTION_ADDRESS:PAYLOAD_ADDRESS~}` `{~TSWP:TEMPLATE_HASH:COLLECTION_ADDRESS:PAYLOAD_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render for each item |
| COLLECTION_ADDRESS | Address of an array to iterate over |
| PAYLOAD_ADDRESS | Address of additional data to include with each item |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('TaskItem',
	'<div class="{~D:Record.Payload.itemClass~}">{~D:Record.Data.Title~}</div>');

_Pict.AppData.Tasks = [
	{ Title: 'Write tests' },
	{ Title: 'Fix bug' },
	{ Title: 'Deploy' }
];
_Pict.AppData.DisplayConfig = { itemClass: 'task-card' };

_Pict.parseTemplate(
	'{~TSWP:TaskItem:AppData.Tasks:AppData.DisplayConfig~}');
// '<div class="task-card">Write tests</div><div class="task-card">Fix bug</div><div class="task-card">Deploy</div>'
```

The payload pattern solves a common problem: when rendering a list, each item template needs access to shared configuration (CSS classes, labels, feature flags) that is not part of the item data itself. Without payload, you would need to reference `AppData` directly for this shared data. With payload, the template is self-contained and reusable.

---

## TemplateValueSet (TVS)

Iterates over the values of an object or array. Each value becomes Record. For arrays, the record includes `Key`, `Value`, `Index`, and `Count` properties. For objects, keys are iterated in sorted order.

**Tags:** `{~TemplateValueSet:TEMPLATE_HASH:DATA_ADDRESS~}` `{~TVS:TEMPLATE_HASH:DATA_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render for each value |
| DATA_ADDRESS | Address of an object or array |

**Array Record Properties:**

| Property | Description |
|----------|-------------|
| `Record.Key` | The array index |
| `Record.Value` | The value at that index |
| `Record.Index` | Same as Key (zero-based) |
| `Record.Count` | Total number of items |

**Examples:**

```javascript
// Iterating over array values
_Pict.TemplateProvider.addTemplate('ValueItem',
	'<li>{~D:Record.Value~}</li>');

_Pict.AppData.Tags = ['javascript', 'node', 'express'];

_Pict.parseTemplate('<ul>{~TVS:ValueItem:AppData.Tags~}</ul>');
// '<ul><li>javascript</li><li>node</li><li>express</li></ul>'

// Iterating over object values (sorted keys)
_Pict.TemplateProvider.addTemplate('UserEntry',
	'<p>{~D:Record.Value~}</p>');

_Pict.AppData.Users = { '3': 'Charlie', '1': 'Alice', '2': 'Bob' };

_Pict.parseTemplate('{~TVS:UserEntry:AppData.Users~}');
// '<p>Alice</p><p>Bob</p><p>Charlie</p>' (sorted by key)
```

TemplateValueSet is distinct from TemplateSet. TemplateSet expects each array item to be an object that becomes Record directly. TemplateValueSet wraps each value in a `{ Key, Value, Index, Count }` envelope. Use TemplateValueSet when iterating over simple values (strings, numbers) or when you need the index/count metadata.

## Choosing the Right Iteration Expression

| Scenario | Expression |
|----------|------------|
| Array of objects, render each as Record | `{~TS:...~}` |
| Map of arrays, render one group | `{~TSFM:...~}` |
| Array of objects, each needs shared payload data | `{~TSWP:...~}` |
| Array of simple values, or need index/count | `{~TVS:...~}` |
