# Pict Example App Style Guide

## Red Rock Mesa Theme

All Pict example applications use the **Red Rock Mesa** theme — a southwest-inspired design that makes it immediately obvious you are looking at a Pict example app.

The theme is named for the Sedona red rock and Monument Valley landscape: deep sky teal headers, sienna accents, sandstone borders, and pale desert backgrounds.

## Color Palette

| Role | Color | Hex |
|------|-------|-----|
| **Deep Sky Teal** | Header background, table headers, headings | `#264653` |
| **Red Rock** | Emphasis, alternate accent | `#B33030` |
| **Sienna** | Primary accent, buttons, top borders, badge | `#E76F51` |
| **Sienna Hover** | Button hover state | `#C45A3E` |
| **Sandstone** | Borders, secondary headings | `#D4A373` |
| **Pale Desert** | Page background, header text | `#FAEDCD` |
| **Warm White** | Form container backgrounds | `#fff` |
| **Desert Off-White** | Input backgrounds | `#FFFCF7` |
| **Input Border** | Default input/textarea borders | `#D4C4A8` |
| **Table Row Stripe** | Even row background | `#FFF9F0` |
| **Table Row Border** | Cell bottom border | `#E8D9C0` |
| **Shadow** | Container box-shadow | `rgba(38,70,83,0.08)` |

## Standard Header

Every example app includes a header bar with three elements:

```html
<div class="pict-example-header">
    <div class="pict-example-badge">
        <svg viewBox="0 0 16 16"><polygon points="8,1 10,6 16,6 11,9.5 13,15 8,11.5 3,15 5,9.5 0,6 6,6"/></svg>
        Pict Example
    </div>
    <div class="pict-example-app-name">Your App Name</div>
    <div class="pict-example-module">pict-section-form</div>
</div>
```

- **Badge** (left): Sienna background with star icon and "PICT EXAMPLE" text — identifies this as a Pict example
- **App Name** (center-left): The specific example application name in pale desert text
- **Module Name** (right): The source module name in sandstone text, pushed to the far right

## Page Structure

```html
<body>
    <!-- 1. Header bar -->
    <div class="pict-example-header">...</div>

    <!-- 2. Content wrapper -->
    <div class="pict-example-content">
        <!-- 3. Optional action bar -->
        <div class="pict-example-actions">
            <button>Action</button>
        </div>
        <!-- 4. Form container (Pict renders into this) -->
        <div id="Pict-Form-Container"></div>
    </div>
</body>
```

The content area has `1.5rem` padding and spans the full browser width — no max-width constraint, so wide tables and grids are usable at any viewport size.

## Form Container

The main form container has:

- White background
- Sandstone (`#D4A373`) border
- **4px sienna top border** — the signature accent
- 6px border radius
- Subtle box shadow

```css
#Pict-Form-Container {
    background: #fff;
    border: 1px solid #D4A373;
    border-top: 4px solid #E76F51;
    border-radius: 6px;
    padding: 1.25rem;
    box-shadow: 0 2px 8px rgba(38,70,83,0.08);
}
```

## Form Elements

### Inputs and Selects

All text inputs, number inputs, textareas, and selects get:

- `1px solid #D4C4A8` border
- `#FFFCF7` background (warm off-white)
- `0.45rem 0.6rem` padding
- `4px` border radius
- On focus: sienna border with subtle sienna glow (`box-shadow: 0 0 0 2px rgba(231,111,81,0.15)`)

### Labels

- Deep sky teal (`#264653`)
- `font-weight: 600`
- `0.85rem` font size

### Buttons

Primary buttons use sienna:

```css
background: #E76F51;
color: #fff;
border: none;
padding: 0.5rem 1.25rem;
border-radius: 4px;
font-weight: 600;
```

Secondary/action buttons use deep sky teal:

```css
background: #264653;
color: #FAEDCD;
```

### Tables

- Header row: deep sky teal background with pale desert text
- Cell borders: `1px solid #E8D9C0`
- Even rows: `#FFF9F0` background (subtle stripe)

## Implementation Notes

- **All CSS is inline** within `<style>` tags in each HTML file — no external CSS framework dependencies
- The `<style id="PICT-CSS"></style>` tag must remain present for Pict's dynamic CSS injection
- Theme CSS should come **after** the PICT-CSS tag so it can override dynamic styles if needed
- Use the `box-sizing: border-box` reset on all elements
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

## Adding a New Example

When creating a new example application:

1. Copy the HTML structure from any existing themed example (e.g., `simple_form`)
2. Update the `<title>` tag: `Your App Name - Pict Example`
3. Update the header app name: `<div class="pict-example-app-name">Your App Name</div>`
4. Update the module name if it differs from `pict-section-form`
5. Keep all theme CSS intact — the inline styles are self-contained
6. Add any app-specific CSS **after** the theme block with a comment separator

## Exceptions

- The **postcard_example** (`Das Postkard`) has its own distinct styling with Pure CSS and a sidebar navigation — it is excluded from the standard theme
- Apps using third-party component CSS (TUI Grid, JSON Editor, etc.) should load those stylesheets **before** the theme `<style>` block so the theme can override as needed
- The `complex_table` example preserves custom `.HasFancyHeaders` styles, adapted to use theme-compatible colors
