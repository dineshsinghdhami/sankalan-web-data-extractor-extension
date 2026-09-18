# Sankalan — Web Data Extractor

![Version](https://img.shields.io/badge/version-0.2.0-black)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow)
![Browser](https://img.shields.io/badge/Browser-Edge%20%7C%20Chrome-0A66C2)
![Export](https://img.shields.io/badge/Export-CSV%20%7C%20JSON%20%7C%20XLSX-success)

**Sankalan** is a browser extension for discovering and extracting structured data from webpages and exporting it in analysis-ready formats.

> **Collect first. Analyze later.**

Sankalan is designed for data collection, not data cleaning or analysis. It scans the current webpage, detects structured content such as HTML tables and repeated records, discovers fields dynamically, previews the extracted dataset, and exports the raw data to **CSV, JSON, or XLSX**.

---

## Features

- Scan the current webpage for structured data
- Detect visible HTML tables
- Detect repeated records, cards, listings, and product-style layouts
- Dynamically discover fields instead of using a fixed schema
- Extract titles, names, prices, ratings, reviews, availability, metadata, links, images, and other visible fields when present
- Merge semantically related fields when appropriate
- Preserve missing values as blank values
- Preserve source URLs and image URLs
- Preview extracted data before export
- Export data to:
  - CSV
  - JSON
  - XLSX
- Preserve raw text in XLSX to reduce unwanted spreadsheet conversion
- Support `rowspan` and `colspan` in HTML table extraction
- Extract key-value and infobox-style tables
- Work with local HTML files when browser file access is enabled
- Manifest V3 browser extension

---

## Raw Data Preservation

Sankalan tries to preserve webpage values as raw text instead of silently converting them.

For example:

```text
+977              → +977
2.8%              → 2.8%
21 December 1923  → 21 December 1923
```

This is especially useful when the exported dataset will later be processed with tools such as:

- Python
- Pandas
- Excel
- Power BI
- SQL
- Jupyter Notebook

---

## Dynamic Schema Discovery

Sankalan does **not** depend on one fixed structure such as:

```text
Name | Price | Discount | Rating
```

Instead, it examines the selected repeated records and discovers the available fields from the webpage itself.

This means different pages can produce different schemas.

Examples:

```text
Books
Title | Price | Rating | Availability | Action | Link | Image URL
```

```text
Movies
Title | Rating | Reviews | Runtime | Year | Certificate | Link | Image URL
```

```text
Quotes
Quote | Tags | Author | Author Link
```

```text
Wikipedia-style information
Field | Value
```

The goal is to extract what actually exists on the page instead of inventing missing fields.

---

## How Sankalan Works

```text
Current webpage
      ↓
Page scanner
      ↓
Structured source detection
      ↓
┌──────────────────┬────────────────────┐
│ HTML Tables      │ Repeated Records   │
└──────────────────┴────────────────────┘
      ↓                       ↓
Table extractor        Field discovery
                              ↓
                       Semantic extraction
                              ↓
                         Record extractor
                              ↓
                     Dataset normalization
                              ↓
                         Data preview
                              ↓
                  CSV / JSON / XLSX export
```

---

## Project Structure

```text
sankalan-web-data-extractor-extension/
│
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── package.json
├── package-lock.json
│
├── extractors/
│   ├── field-discovery.js
│   ├── ratings.js
│   ├── record-extractor.js
│   └── utils.js
│
├── vendor/
│   └── xlsx.full.min.js
│
└── icons/
    ├── source.png
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Main Components

### `popup.js`

Controls the extension workflow:

- webpage scanning
- table selection
- repeated-group selection
- extraction
- preview rendering
- CSV export
- JSON export
- XLSX export

### `field-discovery.js`

Inspects repeated records and dynamically discovers candidate fields using DOM structure, visible text, attributes, links, images, and semantic patterns.

### `ratings.js`

Handles rating and review extraction from different representations such as visible numbers, metadata, stars, attributes, and rating scales.

### `record-extractor.js`

Builds the final dataset from discovered fields and applies semantic cleanup, duplicate-field reduction, field validation, and structured link/image extraction.

### `xlsx.full.min.js`

Local SheetJS build used to generate real `.xlsx` files without depending on a remote CDN.

---

## Installation

Sankalan is currently installed as an **unpacked browser extension**.

### Microsoft Edge

1. Clone or download this repository.
2. Open:

```text
edge://extensions
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder:

```text
sankalan-web-data-extractor-extension
```

6. Pin **Sankalan** to the browser toolbar.

### Google Chrome

1. Open:

```text
chrome://extensions
```

2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the Sankalan project folder.

---

## Using Sankalan

1. Open a webpage containing structured data.
2. Click the **Sankalan** extension icon.
3. Click **Scan Current Page**.
4. Review the detected page elements.
5. Choose either:
   - **Tables**
   - **Repeated Items**
6. Select the dataset or repeated group.
7. Click the extraction button.
8. Review the data preview.
9. Export the dataset as CSV, JSON, or XLSX.

---

## Local HTML Files

Sankalan can also be tested with local `.html` files.

In Edge:

```text
edge://extensions
→ Sankalan
→ Details
→ Allow access to file URLs
```

Enable the option before scanning a `file://` page.

---

## Example Use Cases

Sankalan can be useful for collecting raw webpage data for:

- data analysis projects
- exploratory data analysis
- machine learning datasets
- price comparisons
- research datasets
- product listings
- movie datasets
- book datasets
- public information tables
- quote collections
- website structure experiments

---

## Tested Extraction Scenarios

During development, Sankalan has been tested against several different webpage structures, including:

- book listing cards
- movie ranking/listing pages
- quote cards with authors and tags
- Wikipedia-style tables and infoboxes
- custom HTML tables with `rowspan`
- product-style repeated layouts

Because websites frequently change their frontend structure, extraction quality can vary between pages and over time.

---

## Current Limitations

Sankalan is still under active development.

Some modern websites use:

- client-side rendering
- virtualized lists
- lazy-loaded cards
- frequently changing CSS classes
- dynamically replaced DOM nodes
- anti-automation techniques

These behaviors can make repeated-record extraction more difficult than traditional static HTML extraction.

Sankalan does not attempt to bypass authentication, paywalls, CAPTCHAs, anti-bot protections, or access controls.

---

## Privacy

Sankalan performs extraction from the webpage currently open in the browser.

The extension does not require a remote backend for its normal extraction workflow. Exported files are created locally through the browser download system.

Always make sure you have permission to collect and use data from a website and follow the website's terms and applicable rules.

---

## Technology

- HTML
- CSS
- JavaScript
- Chrome Extension APIs
- Manifest V3
- SheetJS / XLSX

---

## Permissions

Sankalan currently requests:

```text
activeTab
scripting
downloads
```

They are used to:

- inspect the active webpage after user interaction
- inject the extraction modules
- export generated datasets

---

## Development

Clone the repository:

```bash
git clone https://github.com/dineshsinghdhami/sankalan-web-data-extractor-extension.git
cd sankalan-web-data-extractor-extension
```

Install the JavaScript dependency if needed:

```bash
npm install
```

After modifying extension files:

```text
edge://extensions
→ Sankalan
→ Reload
```

Then refresh the webpage being tested.

---

## Roadmap

Planned improvements include:

- stronger extraction on heavily dynamic websites
- better automatic repeated-group ranking
- improved semantic field naming
- additional duplicate-field detection
- reusable extractor utilities
- cleaner modular separation of popup logic
- broader regression testing
- browser store packaging

---

## Version

Current extension version:

```text
0.2.0
```

---

## Repository

GitHub:

```text
https://github.com/dineshsinghdhami/sankalan-web-data-extractor-extension
```

Issues:

```text
https://github.com/dineshsinghdhami/sankalan-web-data-extractor-extension/issues
```

---

## Author

**Dinesh Singh Dhami**

GitHub: [@dineshsinghdhami](https://github.com/dineshsinghdhami)

---

## Project Status

Sankalan is currently an actively developed browser-extension project.

The extension is usable locally through **Load unpacked** while compatibility and extraction behavior continue to improve across different webpage structures.

---

> **Sankalan — Collect first. Analyze later.**
