# Data Formatting Expressions

Formatting expressions transform resolved values for display -- numbers, dates, currencies, and string manipulation.

## Digits

Formats a number with two decimal places and thousands separators.

**Tags:** `{~Digits:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a numeric value |

**Examples:**

```html
<span>{~Digits:Record.Quantity~} units</span>
<td>{~Digits:Record.Population~}</td>
```

```javascript
_Pict.parseTemplate('{~Digits:Record.Value~}', { Value: 1234567.891 });
// '1,234,567.89'

_Pict.parseTemplate('{~Digits:Record.Value~}', { Value: 42 });
// '42.00'
```

---

## Dollars

Formats a number as US currency with a dollar sign, two decimal places, and thousands separators.

**Tags:** `{~Dollars:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a numeric value |

**Examples:**

```html
<span class="price">{~Dollars:Record.Price~}</span>
<td>Total: {~Dollars:AppData.Order.Total~}</td>
```

```javascript
_Pict.parseTemplate('{~Dollars:Record.Price~}', { Price: 1234.5 });
// '$1,234.50'

_Pict.parseTemplate('{~Dollars:Record.Price~}', { Price: 9.9 });
// '$9.90'
```

---

## PascalCaseIdentifier

Converts a string to PascalCase -- capitalizes the first letter of each word and removes non-alphanumeric characters.

**Tags:** `{~PascalCaseIdentifier:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a string value |

**Examples:**

```javascript
_Pict.parseTemplate('{~PascalCaseIdentifier:Record.Name~}',
	{ Name: 'meadow-endpoints' });
// 'MeadowEndpoints'

_Pict.parseTemplate('{~PascalCaseIdentifier:Record.Name~}',
	{ Name: 'hello world' });
// 'HelloWorld'

_Pict.parseTemplate('{~PascalCaseIdentifier:Record.Name~}',
	{ Name: 'some_variable_name' });
// 'SomeVariableName'
```

Useful for generating code identifiers, CSS class names, or display labels from raw strings.

---

## DateTimeYMD

Formats a date-time value as `YYYY-MM-DD`. Timezone-aware -- respects `pict.options.Timezone` when converting.

**Tags:** `{~DateTimeYMD:ADDRESS~}` `{~DateYMD:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a date-time string or value |

**Examples:**

```html
<time>{~DateTimeYMD:Record.CreateDate~}</time>
```

```javascript
_Pict.options.Timezone = 'America/Los_Angeles';
_Pict.parseTemplate('{~DateTimeYMD:Record.Date~}',
	{ Date: '2023-05-25T05:54:46.000Z' });
// '2023-05-24' (adjusted from UTC to Pacific)
```

---

## DateTimeFormat

Formats a date-time value using a custom DayJS format string. Timezone-aware.

**Tags:** `{~DateTimeFormat:ADDRESS^FORMAT_STRING~}` `{~DateFormat:ADDRESS^FORMAT_STRING~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a date-time string or value |
| FORMAT_STRING | DayJS format string (separated by `^`) |

**Common Format Tokens:**

| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | 4-digit year | 2025 |
| `MM` | Zero-padded month | 01-12 |
| `MMMM` | Full month name | January |
| `DD` | Zero-padded day | 01-31 |
| `Do` | Ordinal day | 1st, 2nd, 3rd |
| `dddd` | Full day name | Monday |
| `HH` | 24-hour hour | 00-23 |
| `hh` | 12-hour hour | 01-12 |
| `mm` | Minutes | 00-59 |
| `A` | AM/PM | AM, PM |

**Examples:**

```html
<time>{~DateTimeFormat:Record.PublishedDate^MMMM Do, YYYY~}</time>
<span>{~DateTimeFormat:Record.EventTime^dddd, MMMM D YYYY [at] h:mm A~}</span>
```

```javascript
_Pict.options.Timezone = 'America/New_York';
_Pict.parseTemplate('{~DateTimeFormat:Record.Date^dddd MMMM Do YYYY~}',
	{ Date: '2023-05-25T05:54:46.000Z' });
// 'Wednesday May 24th 2023'
```

---

## DateOnlyYMD

Formats a date-only value (no time component) as `YYYY-MM-DD`. Forces UTC interpretation to avoid timezone shifting.

**Tags:** `{~DateOnlyYMD:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a date string (e.g., `2023-05-25`) |

**Examples:**

```javascript
_Pict.parseTemplate('{~DateOnlyYMD:Record.BirthDate~}',
	{ BirthDate: '2023-05-25' });
// '2023-05-25'
```

Use this instead of `DateTimeYMD` when working with date-only values. `DateTimeYMD` applies timezone conversion, which can shift a date-only value to the previous or next day. `DateOnlyYMD` forces UTC to prevent this.

---

## DateOnlyFormat

Formats a date-only value using a custom DayJS format string. Forces UTC interpretation.

**Tags:** `{~DateOnlyFormat:ADDRESS^FORMAT_STRING~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a date string |
| FORMAT_STRING | DayJS format string (separated by `^`) |

**Examples:**

```html
<span>{~DateOnlyFormat:Record.BirthDate^MMMM Do, YYYY~}</span>
```

```javascript
_Pict.parseTemplate('{~DateOnlyFormat:Record.Date^dddd MMMM Do YYYY~}',
	{ Date: '2023-05-25' });
// 'Thursday May 25th 2023'
```

---

## Join (J)

Joins resolved values from multiple addresses with a separator. Skips empty or falsy values. Flattens arrays.

**Tags:** `{~Join:SEPARATOR^ADDRESS1^ADDRESS2^...~}` `{~J:SEPARATOR^ADDRESS1^ADDRESS2^...~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| SEPARATOR | The string to place between joined values |
| ADDRESS1, ADDRESS2, ... | Addresses to resolve and join (separated by `^`) |

**Examples:**

```html
<p>{~J:, ^Record.City^Record.State^Record.Country~}</p>
<span>{~J: - ^AppData.Server1^AppData.Server2~}</span>
```

```javascript
_Pict.parseTemplate('{~J:, ^Record.City^Record.State~}',
	{ City: 'Portland', State: 'Oregon' });
// 'Portland, Oregon'

// Empty values are skipped
_Pict.parseTemplate('{~J:, ^Record.City^Record.State^Record.Zip~}',
	{ City: 'Portland', State: '', Zip: '97201' });
// 'Portland, 97201'
```

---

## JoinUnique (JU)

Joins resolved values, deduplicating before joining. Otherwise identical to Join.

**Tags:** `{~JoinUnique:SEPARATOR^ADDRESS1^ADDRESS2^...~}` `{~JU:SEPARATOR^ADDRESS1^ADDRESS2^...~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| SEPARATOR | The string to place between joined values |
| ADDRESS1, ADDRESS2, ... | Addresses to resolve, deduplicate, and join (separated by `^`) |

**Examples:**

```javascript
_Pict.AppData = { Tag1: 'javascript', Tag2: 'node', Tag3: 'javascript' };

_Pict.parseTemplate('{~JU:, ^AppData.Tag1^AppData.Tag2^AppData.Tag3~}');
// 'javascript, node' (duplicate removed)
```

---

## PluckJoinUnique (PJU)

Plucks a property from each object in an array, deduplicates the values, and joins them with a separator.

**Tags:** `{~PluckJoinUnique:SEPARATOR^PROPERTY^ARRAY_ADDRESS~}` `{~PJU:SEPARATOR^PROPERTY^ARRAY_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| SEPARATOR | The string to place between joined values |
| PROPERTY | The property name to pluck from each array item |
| ARRAY_ADDRESS | Address of the array (separated by `^`) |

**Examples:**

```javascript
_Pict.AppData.Files = [
	{ name: 'photo.jpg', source: 'original' },
	{ name: 'thumb.jpg', source: 'derivative' },
	{ name: 'meta.xml', source: 'metadata' },
	{ name: 'large.jpg', source: 'derivative' }
];

_Pict.parseTemplate('{~PJU:, ^source^AppData.Files~}');
// 'original, derivative, metadata' (duplicate 'derivative' removed)
```

Useful for extracting and displaying unique categories, tags, or types from a collection of records.

---

## HtmlCommentStart (HCS)

Conditionally outputs `<!-- ` to start an HTML comment, based on the truthiness of a data value. Paired with HtmlCommentEnd to wrap content in comments for conditional display.

**Tags:** `{~HtmlCommentStart:ADDRESS~}` `{~HCS:ADDRESS~}` or `{~HCS:ADDRESS:POLARITY~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a value to check for truthiness |
| POLARITY | Optional. Default: comment when value is **falsy**. Set to `1`, `true`, or `t` to comment when **truthy**. |

---

## HtmlCommentEnd (HCE)

Conditionally outputs ` -->` to close an HTML comment. Must match a corresponding HtmlCommentStart.

**Tags:** `{~HtmlCommentEnd:ADDRESS~}` `{~HCE:ADDRESS~}` or `{~HCE:ADDRESS:POLARITY~}`

**Parameters:** Same as HtmlCommentStart.

**Combined Example:**

```html
{~HCS:Record.ShowBanner~}
<div class="banner">Special Offer!</div>
{~HCE:Record.ShowBanner~}
```

```javascript
// When ShowBanner is true, content is visible:
_Pict.parseTemplate(template, { ShowBanner: true });
// '<div class="banner">Special Offer!</div>'

// When ShowBanner is false, content is commented out:
_Pict.parseTemplate(template, { ShowBanner: false });
// '<!-- <div class="banner">Special Offer!</div> -->'

// Inverted polarity -- comment when true:
'{~HCS:Record.IsHidden:1~}<p>Content</p>{~HCE:Record.IsHidden:1~}'
```

This approach is useful for toggling content visibility in server-rendered HTML while keeping the markup in the DOM for debugging.
