# Pict - Browser MVC

> Retold Pict — Non-opinionated MVC tools: views, templates, providers,
> application lifecycle, with routing and CSS injection. Pict sits alongside the
> server stack and can target any text-based UI (browser DOM, terminal, strings).

Pict connects to Fable for services and can use Meadow-Endpoints as a data
source, but has no hard dependency on the server layers. This example shows a
standalone browser application with multiple views and hash-based routing.

## Run

```bash
npm install
npm run demo
```

Then open http://localhost:8086 in your browser.

## What This Demonstrates

- A Pict application class extending `pict-application`
- Multiple views extending `pict-view` with Templates and Renderables
- Template expressions for data binding (`{~D:path~}`) and iteration (`{~TemplateSet~}`)
- Hash-based routing via `pict-router` with route-driven view rendering
- View lifecycle hooks (onAfterRender)
- Per-view CSS injection into `<style id="PICT-CSS">`
- Quackage build for browser bundling (browserify + babel + terser)
- Orator serving the built static files

## Structure

```
source/
  BookStore-Application.js          # Application class (extends pict-application)
  BookStore-Application-Config.json # Application configuration
  providers/
    Router-Config.json              # Route definitions (/Home, /About)
  views/
    View-Layout.js                  # Shell layout (nav + content container)
    View-Home.js                    # Home page (book catalog with TemplateSet)
    View-About.js                   # About page
html/
  index.html                        # Browser entry point
server.js                           # Orator static file server
generate-build-config.js            # Generates quackage config with absolute paths
```
