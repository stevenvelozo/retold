# Reference: PascalCaseIdentifier

Converts a string to PascalCase.

**Tags:** `{~PascalCaseIdentifier:ADDRESS~}`

**Source:** `pict/source/templates/data/Pict-Template-PascalCaseIdentifier.js`

## Syntax

```
{~PascalCaseIdentifier:ADDRESS~}
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| ADDRESS | Yes | Path to a string value |

## Behavior

- Capitalizes the first letter of each word
- Removes non-alphanumeric separators (hyphens, underscores, spaces)
- Returns the PascalCase result

## Examples

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
