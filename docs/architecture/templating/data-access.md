# Data Access Expressions

Data access expressions resolve values from Pict's address space and return them as strings. These are the most frequently used expressions in Jellyfish templates.

## Data (D)

Resolves a value from the address space and returns it as a string.

**Tags:** `{~Data:ADDRESS~}` `{~D:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Dot-notation path to resolve (e.g., `AppData.User.Name`, `Record.Title`) |

**Examples:**

```html
<h1>{~D:AppData.PageTitle~}</h1>
<p>Author: {~D:Record.Author~}</p>
<span>{~D:Bundle.Config.Version~}</span>
```

```javascript
_Pict.AppData.User = { Name: 'Alice' };
_Pict.parseTemplate('Hello, {~D:AppData.User.Name~}!');
// 'Hello, Alice!'

_Pict.parseTemplate('{~D:Record.City~}', { City: 'Portland' });
// 'Portland'
```

If the address resolves to `undefined`, returns an empty string.

---

## DataWithTemplateFallback (DWTF)

Resolves a value from the address space. If the value is falsy or undefined, renders a fallback template by hash instead.

**Tags:** `{~DataWithTemplateFallback:DATA_ADDRESS:FALLBACK_TEMPLATE_HASH~}` `{~DWTF:DATA_ADDRESS:FALLBACK_TEMPLATE_HASH~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| DATA_ADDRESS | Dot-notation path to resolve |
| FALLBACK_TEMPLATE_HASH | Hash of a registered template to render if the value is falsy |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('MissingTitle',
	'<span class="empty">No title available</span>');

_Pict.TemplateProvider.addTemplate('BookHeading',
	'<h1>{~DWTF:Record.Title:MissingTitle~}</h1>');

// With data present
_Pict.parseTemplateByHash('BookHeading', { Title: 'Dune' });
// '<h1>Dune</h1>'

// Without data
_Pict.parseTemplateByHash('BookHeading', { Title: undefined });
// '<h1><span class="empty">No title available</span></h1>'
```

---

## DataWithAbsoluteFallback (DWAF)

Resolves a value from the address space. If the value is falsy or undefined, returns a literal fallback string.

**Tags:** `{~DataWithAbsoluteFallback:DATA_ADDRESS^LITERAL_FALLBACK~}` `{~DWAF:DATA_ADDRESS^LITERAL_FALLBACK~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| DATA_ADDRESS | Dot-notation path to resolve |
| LITERAL_FALLBACK | A literal string to return if the value is falsy (separated by `^`) |

**Examples:**

```html
<h1>{~DWAF:Record.Title^Untitled Document~}</h1>
<p>{~DWAF:Record.Author^Unknown Author~}</p>
```

```javascript
_Pict.parseTemplate('{~DWAF:Record.Title^No Title~}', { Title: 'Dune' });
// 'Dune'

_Pict.parseTemplate('{~DWAF:Record.Title^No Title~}', {});
// 'No Title'
```

The fallback is a plain string, not a template -- it is not parsed for further expressions.

---

## DataValueByKey (DVBK)

Accesses an object using a dynamic key resolved from a data address. Useful when the property name to access is itself stored in data.

**Tags:** `{~DataValueByKey:OBJECT_ADDRESS^KEY_ADDRESS~}` `{~DVBK:OBJECT_ADDRESS^KEY_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| OBJECT_ADDRESS | Address of the object to access |
| KEY_ADDRESS | Address containing the key string to use for the lookup (separated by `^`) |

**Examples:**

```javascript
_Pict.AppData.StatusLabels = {
	'active': 'Currently Active',
	'inactive': 'No Longer Active',
	'pending': 'Awaiting Approval'
};

_Pict.parseTemplate(
	'{~DVBK:AppData.StatusLabels^Record.Status~}',
	{ Status: 'pending' });
// 'Awaiting Approval'
```

This is valuable for lookup tables and maps where the key comes from another data field.

---

## DataJson (DJ)

Returns the resolved value serialized as a JSON string via `JSON.stringify()`. If the address is empty, serializes the entire Record.

**Tags:** `{~DataJson:ADDRESS~}` `{~DJ:ADDRESS~}` or `{~DJ:~}` (for entire Record)

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Dot-notation path to resolve (optional; empty address returns the full Record) |

**Examples:**

```html
<script>
var appConfig = {~DJ:AppData.Config~};
var currentRecord = {~DJ:~};
</script>
```

```javascript
_Pict.AppData.Config = { theme: 'dark', language: 'en' };
_Pict.parseTemplate('{~DJ:AppData.Config~}');
// '{"theme":"dark","language":"en"}'

_Pict.parseTemplate('{~DJ:~}', { id: 1, name: 'Test' });
// '{"id":1,"name":"Test"}'
```

Useful for passing data from templates into JavaScript contexts, data attributes, or API payloads.

---

## DataEncodeJavascriptString (DEJS)

Resolves a value and escapes it for safe use inside a JavaScript string literal. Escapes quotes, backslashes, and other characters that would break a JS string.

**Tags:** `{~DataEncodeJavascriptString:ADDRESS~}` `{~DEJS:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Dot-notation path to resolve |

**Examples:**

```html
<script>
var userName = "{~DEJS:AppData.User.Name~}";
var description = "{~DEJS:Record.Description~}";
</script>
```

```javascript
_Pict.parseTemplate('"{~DEJS:Record.Quote~}"',
	{ Quote: 'She said "hello" and left.' });
// '"She said \"hello\" and left."'
```

Always use DEJS when embedding data values inside JavaScript string literals in templates. Using plain `{~D:...~}` inside a quoted string risks injection if the data contains quotes or special characters.
