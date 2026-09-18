# Sankalan : Web Data Extractor

![License](https://img.shields.io/badge/license-Proprietary-red)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E)
![Browser Extension](https://img.shields.io/badge/Browser-Extension-4285F4)
![Microsoft Edge](https://img.shields.io/badge/Microsoft%20Edge-Compatible-0078D7)
![Chrome](https://img.shields.io/badge/Chrome-Compatible-4285F4)
![CSV](https://img.shields.io/badge/Export-CSV-green)
![JSON](https://img.shields.io/badge/Export-JSON-orange)
![Excel](https://img.shields.io/badge/Export-XLSX-217346)

**Sankalan** is a browser extension that I developed to automatically discover and extract structured webpage data into **CSV, JSON, and Excel files** for further analysis.

I built Sankalan while learning **Data Analytics**. During practice, I often had to search for ready-made datasets on platforms such as Kaggle before I could begin working with Python, Pandas, Excel, SQL, or Power BI.

Instead of always depending on prepared datasets, I wanted a way to collect **current real-world data directly from webpages**.

That idea led me to build Sankalan.

> **Collect first. Analyze later.**

Sankalan scans webpages, detects tables and repeated records such as products, books, movies, quotes, listings, and cards, then converts the discovered information into structured datasets.

> **Note:** This project is proprietary. Copying, modification, redistribution, or reuse requires prior written permission. See [LICENSE.md](LICENSE.md).

---

## Why I Built Sankalan

While learning Data Analytics, I noticed that most practice projects begin with an already prepared dataset.

A common workflow was:

```text
Find dataset on Kaggle
        ↓
Download CSV
        ↓
Open in Pandas / Excel
        ↓
Clean and analyze data
```

I wanted to work with a more realistic workflow where I could first collect data that is currently available on the web.

For example, instead of using an old ecommerce dataset, I wanted to collect current product information such as:

- Product names
- Prices
- Discounts
- Ratings
- Reviews
- Availability
- Links
- Image URLs

The same idea can be applied to books, movies, quotes, public information, listings, and many other structured webpages.

Sankalan allows me to collect this data first and then continue the analysis using tools such as **Python, Pandas, Excel, SQL, Power BI, and Machine Learning libraries**.

---

## Features

- Scan the currently opened webpage
- Detect visible HTML tables
- Detect repeated records, cards, listings, and products
- Automatically discover available fields
- Generate different schemas for different webpages
- Extract text, prices, ratings, reviews, discounts, links, and image URLs
- Extract authors, tags, dates, and availability where present
- Support standard HTML tables
- Handle `rowspan` and `colspan`
- Support key-value and hierarchical tables
- Remove empty and unnecessary duplicate fields
- Preserve missing values as blank fields
- Preview extracted data before export
- Export datasets as CSV
- Export datasets as JSON
- Export datasets as Excel `.xlsx`
- Preserve raw values during Excel export
- Support local HTML files for testing
- Work without a backend server

---

## Dynamic Field Discovery

Sankalan does not use one fixed schema for every webpage.

For example, a books page may produce:

```text
Title
Price
Rating
Availability
Link
Image URL
```

A movie page may produce:

```text
Title
Rating
Reviews
Runtime
Year
Certificate
Link
Image URL
```

A quotes page may produce:

```text
Quote
Tags
Author
Author Link
```

An ecommerce page may produce:

```text
Title
Price
Discount
Rating
Reviews
Sold
Link
Image URL
```

The fields depend on the information actually present on the webpage.

This keeps Sankalan more flexible and avoids hardcoding it for only one website or one dataset structure.

---

## Table Extraction

Sankalan can also extract information directly from HTML tables.

The table extraction system supports:

- Standard tables
- Tables without explicit headers
- `rowspan`
- `colspan`
- Nested table filtering
- Key-value tables
- Hierarchical information
- Empty column removal

For example, webpage information can be converted into structures such as:

```text
Field | Value
```

or:

```text
Government - President
Area - Total
Population - Density
Time zone
Calling code
```

This makes the extracted information easier to use in later analysis.

---

## Raw Data Preservation

Sankalan is designed mainly for **data collection**, not automatic data cleaning.

Because of this, values such as:

```text
+977
2.8%
21 December 1923
147,181 km²
UTC+05:45
```

are preserved as closely as possible.

For example:

```text
+977
```

should remain `+977`, rather than being automatically converted into `977`.

The Excel export system writes extracted values as text where possible so spreadsheet software does not unexpectedly change the raw data.

Cleaning and transformation can then be performed later during the Data Analytics stage.

---

## Export Formats

Sankalan currently supports:

- **CSV** — useful for Pandas, Excel, SQL, and analytics workflows
- **JSON** — useful for Python, JavaScript, APIs, and structured processing
- **Excel `.xlsx`** — useful for spreadsheet analysis and Power BI workflows

Excel files are generated using **SheetJS**.

---

## Tech Stack

- **Language:** JavaScript
- **Interface:** HTML, CSS
- **Extension Standard:** Manifest V3
- **Browser APIs:** Chrome Extension APIs
- **Spreadsheet Export:** SheetJS
- **Browsers:** Microsoft Edge and Chromium-based browsers
- **Export Formats:** CSV, JSON, XLSX

---

## Project Structure

| Path | Purpose |
| --- | --- |
| `manifest.json` | Browser extension configuration |
| `popup.html` | Main popup interface |
| `popup.css` | Popup styling |
| `popup.js` | Scanning, extraction, preview, and export workflow |
| `extractors/field-discovery.js` | Dynamic field discovery |
| `extractors/record-extractor.js` | Repeated record extraction |
| `extractors/ratings.js` | Rating and review extraction |
| `extractors/utils.js` | Shared extractor utilities |
| `vendor/xlsx.full.min.js` | SheetJS library for Excel export |
| `icons/` | Sankalan extension icons |
| `LICENSE.md` | Licensing terms |

---

## How Sankalan Works

1. Open a webpage containing useful data.
2. Open the Sankalan browser extension.
3. Click **Scan Current Page**.
4. Sankalan detects tables and repeated record groups.
5. Select the data source you want to extract.
6. Click **Extract Table** or **Extract Item Fields**.
7. Preview the automatically discovered dataset.
8. Export it as CSV, JSON, or Excel.
9. Continue cleaning and analysis using your preferred analytics tools.

A typical workflow is:

```text
Webpage
   ↓
Sankalan
   ↓
CSV / JSON / Excel
   ↓
Python / Pandas / SQL / Excel
   ↓
Data Cleaning
   ↓
Exploratory Data Analysis
   ↓
Visualization / Power BI / Machine Learning
   ↓
Insights
```

---

## Installation

### Microsoft Edge

1. Clone or download this repository.
2. Open:

```text
edge://extensions
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the Sankalan project folder.
6. Pin the extension if required.

### Google Chrome

Open:

```text
chrome://extensions
```

Enable **Developer mode**, click **Load unpacked**, and select the Sankalan project folder.

For local HTML testing, enable:

```text
Allow access to file URLs
```

from the extension details page.

---

## What I Learned

Building Sankalan helped me improve my understanding of:

- Browser extension development
- JavaScript DOM manipulation
- HTML structure analysis
- Webpage data extraction
- Dynamic field discovery
- Repeated pattern detection
- Semantic field classification
- HTML table processing
- CSV and JSON generation
- Excel workbook generation
- SheetJS
- Raw-data preservation
- Debugging dynamic webpages
- Data acquisition workflows

Most importantly, this project helped me connect **web development with Data Analytics**.

Instead of always asking:

> “Where can I download a dataset?”

I started asking:

> “Can I collect the data I need directly from the source?”

That question became the main idea behind Sankalan.

---

## Current Limitations

Websites do not follow one universal HTML structure.

Some modern websites:

- Load data dynamically
- Replace DOM elements while scrolling
- Use virtualized lists
- Render content using JavaScript
- Require authentication
- Use infinite scrolling
- Change their HTML structure over time

Because of this, Sankalan may not extract every webpage perfectly.

The project focuses on **generic DOM and semantic detection** instead of hardcoding support for specific websites.

---

## Project Status

Current version:

```text
v0.2
```

Sankalan is currently under active development.

Support for highly dynamic webpages and more complex record structures will continue to improve.

---

## Future Improvements

- Better support for dynamically rendered websites
- Improved repeated-record detection
- Smarter semantic field discovery
- Automatic pagination
- Multi-page extraction
- Infinite-scroll support
- Dataset filtering before export
- Better duplicate detection
- Improved JavaScript-rendered content support
- Browser-store publishing
- More real-world website testing

---

## License

This project is **proprietary**, with **all rights reserved**.

Reuse, modification, redistribution, publishing, or hosting requires prior written permission. See [LICENSE.md](LICENSE.md) for details.

The Sankalan project is publicly visible for **demonstration, evaluation, learning, and portfolio purposes**, not for unrestricted reuse.

Do not assume that publicly accessible source code is free to copy, modify, republish, redistribute, or include in another project.

If you wish to use any original part of this project, **request permission first**.

Third-party libraries and dependencies retain their respective licenses.

---

## Contributions

Public contributions are not currently accepted.

For collaboration, educational discussion, Data Analytics ideas, or licensing inquiries, feel free to contact me.

---

## Project Owner

**Dinesh Singh Dhami**

- **Website:** [dineshsinghdhami.com.np](https://dineshsinghdhami.com.np/)
- **GitHub:** [dineshsinghdhami](https://github.com/dineshsinghdhami)
- **LinkedIn:** [dineshsinghdhami2](https://www.linkedin.com/in/dineshsinghdhami2/)
- **Email:** [dineshdhamidn@gmail.com](mailto:dineshdhamidn@gmail.com)