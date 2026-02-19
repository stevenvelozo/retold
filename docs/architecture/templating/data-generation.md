# Data Generation Expressions

Data generation expressions produce random values for testing, unique IDs, or placeholder content.

## RandomNumber (RN)

Generates a random integer between a minimum and maximum value (inclusive).

**Tags:** `{~RandomNumber:MIN,MAX~}` `{~RN:MIN,MAX~}` or `{~RN:~}` (defaults: 0 to 9999999)

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| MIN | Minimum value (default: 0) |
| MAX | Maximum value (default: 9999999). Separated from MIN by `,`. |

**Examples:**

```html
<!-- Random number 1-100 -->
<span>Score: {~RN:1,100~}</span>

<!-- Random with defaults -->
<code>ID: {~RN:~}</code>

<!-- Random percentage -->
<div style="width: {~RN:10,100~}%">Progress</div>
```

```javascript
_Pict.parseTemplate('{~RN:1,6~}');
// A random integer from 1 to 6 (like a die roll)

_Pict.parseTemplate('{~RN:1000,9999~}');
// A random 4-digit number
```

---

## RandomNumberString (RNS)

Generates a zero-padded random numeric string of a specified length.

**Tags:** `{~RandomNumberString:LENGTH~}` `{~RNS:LENGTH~}` or `{~RNS:LENGTH,MAX~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| LENGTH | The number of characters in the output string (default: 4) |
| MAX | Maximum numeric value (default: 10^LENGTH - 1). Separated from LENGTH by `,`. |

**Examples:**

```html
<!-- 6-character padded random string -->
<code>REF-{~RNS:6~}</code>

<!-- 10-character padded random string -->
<span>{~RNS:10~}</span>
```

```javascript
_Pict.parseTemplate('{~RNS:4~}');
// e.g., '0042' or '7831' (always 4 characters, zero-padded)

_Pict.parseTemplate('{~RNS:8~}');
// e.g., '00384729' (always 8 characters, zero-padded)
```

RandomNumberString is useful for generating reference codes, order numbers, or temporary identifiers that need a consistent length. The zero-padding ensures the output is always exactly LENGTH characters, which is important for display consistency and sortability.
