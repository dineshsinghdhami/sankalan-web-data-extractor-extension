const scanBtn =
  document.getElementById("scanBtn");

const scanBtnText =
  document.getElementById("scanBtnText");

const scanSpinner =
  document.getElementById("scanSpinner");

const tableTab =
  document.getElementById("tableTab");

const groupTab =
  document.getElementById("groupTab");

const tablePanel =
  document.getElementById("tablePanel");

const groupPanel =
  document.getElementById("groupPanel");

const extractTableBtn =
  document.getElementById("extractTableBtn");

const extractTableBtnText =
  document.getElementById("extractTableBtnText");

const extractTableSpinner =
  document.getElementById("extractTableSpinner");

const extractGroupBtn =
  document.getElementById("extractGroupBtn");

const extractGroupBtnText =
  document.getElementById("extractGroupBtnText");

const extractGroupSpinner =
  document.getElementById("extractGroupSpinner");

const csvBtn =
  document.getElementById("csvBtn");

const jsonBtn =
  document.getElementById("jsonBtn");

const excelBtn =
  document.getElementById("excelBtn");

const exportProgress =
  document.getElementById("exportProgress");

const exportProgressText =
  document.getElementById("exportProgressText");

const statusBox =
  document.getElementById("statusBox");

const statusIcon =
  document.getElementById("statusIcon");

const statusTitle =
  document.getElementById("statusTitle");

const statusMessage =
  document.getElementById("statusMessage");

const overviewSection =
  document.getElementById("overviewSection");

const dataSourceSection =
  document.getElementById("dataSourceSection");

const previewSection =
  document.getElementById("previewSection");

const exportSection =
  document.getElementById("exportSection");

const tableCount =
  document.getElementById("tableCount");

const groupCount =
  document.getElementById("groupCount");

const linkCount =
  document.getElementById("linkCount");

const imageCount =
  document.getElementById("imageCount");

const listCount =
  document.getElementById("listCount");

const tableSelect =
  document.getElementById("tableSelect");

const groupSelect =
  document.getElementById("groupSelect");

const groupHintTitle =
  document.getElementById("groupHintTitle");

const groupHintText =
  document.getElementById("groupHintText");

const previewEyebrow =
  document.getElementById("previewEyebrow");

const previewTitle =
  document.getElementById("previewTitle");

const rowCount =
  document.getElementById("rowCount");

const previewEmpty =
  document.getElementById("previewEmpty");

const previewTableContainer =
  document.getElementById("previewTableContainer");


let extractedData = [];

let currentExtractionType = "";

let detectedGroups = [];

let currentPageInfo = {
  title: "",
  hostname: ""
};


tableTab.addEventListener(
  "click",
  function () {
    setSourceTab("table");
  }
);


groupTab.addEventListener(
  "click",
  function () {
    setSourceTab("group");
  }
);


groupSelect.addEventListener(
  "change",
  function () {
    updateGroupHint();
  }
);


scanBtn.addEventListener(
  "click",
  async function () {

    setScanLoading(true);

    extractedData = [];
    detectedGroups = [];
    currentExtractionType = "";

    hideSection(overviewSection);
    hideSection(dataSourceSection);
    hideSection(previewSection);
    hideSection(exportSection);

    tableSelect.innerHTML = "";
    groupSelect.innerHTML = "";
    previewTableContainer.innerHTML = "";

    showStatus(
      "loading",
      "Scanning page",
      "Detecting visible tables, repeated records, cards, listings, and other structured content."
    );

    try {

      const tab =
        await getActiveTab();

      const results =
        await chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          function: scanPage
        });

      const pageData =
        results[0]?.result;

      if (!pageData) {

        throw new Error(
          "The webpage returned no scan data."
        );

      }

      currentPageInfo = {
        title: pageData.title || "",
        hostname: pageData.hostname || ""
      };

      detectedGroups =
        pageData.groups || [];

      tableCount.textContent =
        formatNumber(
          pageData.tables.length
        );

      groupCount.textContent =
        formatNumber(
          pageData.groups.length
        );

      linkCount.textContent =
        formatNumber(
          pageData.links
        );

      imageCount.textContent =
        formatNumber(
          pageData.images
        );

      listCount.textContent =
        formatNumber(
          pageData.lists
        );

      populateTables(
        pageData.tables
      );

      populateGroups(
        pageData.groups
      );

      showSection(
        overviewSection
      );

      showSection(
        dataSourceSection
      );

      if (
        pageData.tables.length > 0
      ) {

        setSourceTab(
          "table"
        );

      } else {

        setSourceTab(
          "group"
        );

      }

      showStatus(
        "success",
        "Scan complete",
        buildScanSummary(
          pageData
        )
      );

    } catch (error) {

      showStatus(
        "error",
        "Unable to scan this page",
        getFriendlyErrorMessage(
          error
        )
      );

    } finally {

      setScanLoading(
        false
      );

    }

  }
);


extractTableBtn.addEventListener(
  "click",
  async function () {

    const selectedIndex =
      Number(
        tableSelect.value
      );

    if (
      Number.isNaN(
        selectedIndex
      )
    ) {
      return;
    }

    setTableExtractionLoading(
      true
    );

    try {

      const tab =
        await getActiveTab();

      const results =
        await chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          function:
            extractSelectedTable,
          args: [
            selectedIndex
          ]
        });

      const result =
        results[0]?.result;

      if (
        !result ||
        !Array.isArray(
          result.rows
        ) ||
        result.rows.length === 0
      ) {

        throw new Error(
          "No table data was found."
        );

      }

      extractedData =
        result.rows;

      currentExtractionType =
        "table";

      renderPreview(
        result.rows,
        {
          eyebrow:
            result.type === "key-value"
              ? "KEY-VALUE PREVIEW"
              : "TABLE PREVIEW",

          title:
            result.title ||
            "Extracted table"
        }
      );

      showSection(
        exportSection
      );

      showStatus(
        "success",
        "Table extracted",
        `${Math.max(result.rows.length - 1, 0)} rows are ready to export.`
      );

    } catch (error) {

      showStatus(
        "error",
        "Table extraction failed",
        getFriendlyErrorMessage(
          error
        )
      );

    } finally {

      setTableExtractionLoading(
        false
      );

    }

  }
);


extractGroupBtn.addEventListener(
  "click",
  async function () {

    const selectedIndex =
      Number(
        groupSelect.value
      );

    if (
      Number.isNaN(
        selectedIndex
      ) ||
      !detectedGroups[
        selectedIndex
      ]
    ) {
      return;
    }

    setGroupExtractionLoading(
      true
    );

    try {

      const tab =
        await getActiveTab();

      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: [
          "extractors/field-discovery.js",
          "extractors/ratings.js",
          "extractors/products.js"
        ]
      });

      const group =
        detectedGroups[
          selectedIndex
        ];

      const results =
        await chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          function:
            extractDynamicRepeatedGroup,
          args: [
            group
          ]
        });

      const result =
        results[0]?.result;

      if (
        !result ||
        !Array.isArray(
          result.headers
        ) ||
        !Array.isArray(
          result.rows
        ) ||
        result.rows.length === 0
      ) {

        throw new Error(
          "No repeated record data was found."
        );

      }

      extractedData = [
        result.headers,
        ...result.rows
      ];

      currentExtractionType =
        "group";

      renderPreview(
        extractedData,
        {
          eyebrow:
            "DATA PREVIEW",

          title:
            "Automatically discovered dataset"
        }
      );

      showSection(
        exportSection
      );

      showStatus(
        "success",
        "Repeated records extracted",
        `${result.rows.length} records and ${result.headers.length} fields are ready to export.`
      );

    } catch (error) {

      showStatus(
        "error",
        "Record extraction failed",
        getFriendlyErrorMessage(
          error
        )
      );

    } finally {

      setGroupExtractionLoading(
        false
      );

    }

  }
);


csvBtn.addEventListener(
  "click",
  function () {

    if (
      extractedData.length === 0
    ) {
      return;
    }

    startExportProgress(
      "Preparing CSV..."
    );

    const csv =
      extractedData
        .map(
          function (row) {

            return row
              .map(
                escapeCSV
              )
              .join(",");

          }
        )
        .join("\n");

    const content =
      "\uFEFF" +
      csv;

    downloadBlob(
      content,
      "text/csv;charset=utf-8;",
      buildFilename(
        "csv"
      )
    );

    finishExportProgress(
      "CSV exported"
    );

  }
);


jsonBtn.addEventListener(
  "click",
  function () {

    if (
      extractedData.length === 0
    ) {
      return;
    }

    startExportProgress(
      "Preparing JSON..."
    );

    let data;

    if (
      extractedData.length > 1
    ) {

      const headers =
        extractedData[0];

      data =
        extractedData
          .slice(1)
          .map(
            function (row) {

              const object =
                {};

              headers.forEach(
                function (
                  header,
                  index
                ) {

                  object[
                    header
                  ] =
                    row[index] ??
                    "";

                }
              );

              return object;

            }
          );

    } else {

      data =
        extractedData;

    }

    downloadBlob(
      JSON.stringify(
        data,
        null,
        2
      ),
      "application/json;charset=utf-8;",
      buildFilename(
        "json"
      )
    );

    finishExportProgress(
      "JSON exported"
    );

  }
);


excelBtn.addEventListener(
  "click",
  function () {

    if (
      extractedData.length === 0
    ) {
      return;
    }

    startExportProgress(
      "Preparing spreadsheet..."
    );

    const html =
      buildExcelHTML(
        extractedData
      );

    downloadBlob(
      html,
      "application/vnd.ms-excel",
      buildFilename(
        "xls"
      )
    );

    finishExportProgress(
      "Spreadsheet exported"
    );

  }
);


async function getActiveTab() {

  const tabs =
    await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

  if (
    !tabs ||
    tabs.length === 0
  ) {

    throw new Error(
      "No active browser tab was found."
    );

  }

  const tab =
    tabs[0];

  if (
    !tab.id
  ) {

    throw new Error(
      "The active tab has no valid tab ID."
    );

  }

  if (
    !isInjectableURL(
      tab.url
    )
  ) {

    throw new Error(
      "Sankalan cannot run on browser-internal pages. Open a normal website and try again."
    );

  }

  return tab;

}


function isInjectableURL(
  value
) {

  return /^https?:\/\//i
    .test(
      String(
        value ||
        ""
      )
    );

}


function setSourceTab(
  type
) {

  const tableActive =
    type ===
    "table";

  tableTab.classList.toggle(
    "active",
    tableActive
  );

  groupTab.classList.toggle(
    "active",
    !tableActive
  );

  tableTab.setAttribute(
    "aria-selected",
    String(
      tableActive
    )
  );

  groupTab.setAttribute(
    "aria-selected",
    String(
      !tableActive
    )
  );

  tablePanel.classList.toggle(
    "hidden",
    !tableActive
  );

  groupPanel.classList.toggle(
    "hidden",
    tableActive
  );

}


function populateTables(
  tables
) {

  tableSelect.innerHTML =
    "";

  if (
    !Array.isArray(
      tables
    ) ||
    tables.length === 0
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.textContent =
      "No visible tables found";

    option.value =
      "";

    tableSelect.appendChild(
      option
    );

    extractTableBtn.disabled =
      true;

    return;

  }

  tables.forEach(
    function (
      table,
      index
    ) {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(
          index
        );

      option.textContent =
        `Table ${index + 1} · ${table.rows} rows × ${table.columns} columns`;

      tableSelect.appendChild(
        option
      );

    }
  );

  extractTableBtn.disabled =
    false;

}


function populateGroups(
  groups
) {

  groupSelect.innerHTML =
    "";

  if (
    !Array.isArray(
      groups
    ) ||
    groups.length === 0
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.textContent =
      "No repeated records found";

    option.value =
      "";

    groupSelect.appendChild(
      option
    );

    extractGroupBtn.disabled =
      true;

    groupHintTitle.textContent =
      "No repeated records detected";

    groupHintText.textContent =
      "Try another webpage section or use a visible HTML table instead.";

    return;

  }

  groups.forEach(
    function (
      group,
      index
    ) {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(
          index
        );

      option.textContent =
        `Group ${index + 1} · ${capitalize(
          group.likelyType
        )} · ${group.count} items`;

      groupSelect.appendChild(
        option
      );

    }
  );

  extractGroupBtn.disabled =
    false;

  groupSelect.value =
    "0";

  updateGroupHint();

}


function updateGroupHint() {

  const index =
    Number(
      groupSelect.value
    );

  const group =
    detectedGroups[
      index
    ];

  if (!group) {
    return;
  }

  groupHintTitle.textContent =
    `${capitalize(
      group.likelyType
    )} · ${group.count} repeated items`;

  groupHintText.textContent =
    [
      `Images/item: ${group.averageImages}`,
      `Links/item: ${group.averageLinks}`,
      `Avg text: ${group.averageTextLength} chars`,
      group.sample
        ? `Example: ${truncateText(
            group.sample,
            80
          )}`
        : ""
    ]
      .filter(Boolean)
      .join(" · ");

}


function renderPreview(
  data,
  metadata
) {

  previewTableContainer.innerHTML =
    "";

  hideSection(
    previewEmpty
  );

  if (
    !Array.isArray(
      data
    ) ||
    data.length === 0
  ) {

    showSection(
      previewEmpty
    );

    hideSection(
      previewTableContainer
    );

    return;

  }

  showSection(
    previewTableContainer
  );

  previewEyebrow.textContent =
    metadata?.eyebrow ||
    "DATA PREVIEW";

  previewTitle.textContent =
    metadata?.title ||
    "Extracted dataset";

  const bodyRows =
    Math.max(
      data.length - 1,
      0
    );

  rowCount.textContent =
    `${formatNumber(
      bodyRows
    )} ${bodyRows === 1 ? "row" : "rows"}`;

  const previewData =
    data.slice(
      0,
      16
    );

  const table =
    document.createElement(
      "table"
    );

  const thead =
    document.createElement(
      "thead"
    );

  const tbody =
    document.createElement(
      "tbody"
    );

  if (
    previewData.length > 0
  ) {

    const headerRow =
      document.createElement(
        "tr"
      );

    previewData[0]
      .forEach(
        function (value) {

          const th =
            document.createElement(
              "th"
            );

          th.textContent =
            value;

          headerRow.appendChild(
            th
          );

        }
      );

    thead.appendChild(
      headerRow
    );

  }

  previewData
    .slice(1)
    .forEach(
      function (row) {

        const tr =
          document.createElement(
            "tr"
          );

        row.forEach(
          function (value) {

            const td =
              document.createElement(
                "td"
              );

            td.textContent =
              value;

            tr.appendChild(
              td
            );

          }
        );

        tbody.appendChild(
          tr
        );

      }
    );

  table.appendChild(
    thead
  );

  table.appendChild(
    tbody
  );

  previewTableContainer.appendChild(
    table
  );

  showSection(
    previewSection
  );

}


function showStatus(
  type,
  title,
  message
) {

  statusBox.classList.remove(
    "hidden",
    "loading",
    "success",
    "error"
  );

  statusBox.classList.add(
    type
  );

  statusTitle.textContent =
    title;

  statusMessage.textContent =
    message;

  if (
    type === "loading"
  ) {
    statusIcon.textContent =
      "…";
  }

  if (
    type === "success"
  ) {
    statusIcon.textContent =
      "✓";
  }

  if (
    type === "error"
  ) {
    statusIcon.textContent =
      "!";
  }

}


function buildScanSummary(
  pageData
) {

  const parts =
    [];

  if (
    pageData.tables.length > 0
  ) {

    parts.push(
      `${pageData.tables.length} table${pageData.tables.length === 1 ? "" : "s"}`
    );

  }

  if (
    pageData.groups.length > 0
  ) {

    parts.push(
      `${pageData.groups.length} repeated group${pageData.groups.length === 1 ? "" : "s"}`
    );

  }

  parts.push(
    `${pageData.links} links`
  );

  parts.push(
    `${pageData.images} images`
  );

  return (
    "Found " +
    parts.join(", ") +
    "."
  );

}


function setScanLoading(
  loading
) {

  scanBtn.disabled =
    loading;

  scanSpinner.classList.toggle(
    "hidden",
    !loading
  );

  scanBtnText.textContent =
    loading
      ? "Scanning..."
      : "Scan Current Page";

}


function setTableExtractionLoading(
  loading
) {

  extractTableBtn.disabled =
    loading;

  extractTableSpinner.classList.toggle(
    "hidden",
    !loading
  );

  extractTableBtnText.textContent =
    loading
      ? "Extracting..."
      : "Extract Table";

}


function setGroupExtractionLoading(
  loading
) {

  extractGroupBtn.disabled =
    loading;

  extractGroupSpinner.classList.toggle(
    "hidden",
    !loading
  );

  extractGroupBtnText.textContent =
    loading
      ? "Extracting..."
      : "Extract Item Fields";

}


function startExportProgress(
  message
) {

  exportProgress.classList.remove(
    "hidden"
  );

  exportProgressText.textContent =
    message;

}


function finishExportProgress(
  message
) {

  exportProgressText.textContent =
    message;

  setTimeout(
    function () {

      exportProgress.classList.add(
        "hidden"
      );

    },
    1200
  );

}


function showSection(
  element
) {

  element.classList.remove(
    "hidden"
  );

}


function hideSection(
  element
) {

  element.classList.add(
    "hidden"
  );

}


function formatNumber(
  value
) {

  return new Intl.NumberFormat()
    .format(
      Number(
        value
      ) ||
      0
    );

}


function capitalize(
  value
) {

  const text =
    String(
      value ||
      ""
    );

  return (
    text.charAt(0)
      .toUpperCase() +
    text.slice(1)
  );

}


function truncateText(
  value,
  maximum
) {

  const text =
    String(
      value ||
      ""
    );

  if (
    text.length <=
    maximum
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      maximum - 1
    ) +
    "…"
  );

}


function getFriendlyErrorMessage(
  error
) {

  const message =
    String(
      error?.message ||
      error ||
      ""
    );

  if (
    /cannot access|blocked|extensions gallery|edge:\/\//i
      .test(
        message
      )
  ) {

    return "This page blocks extension script injection. Open a normal website and try again.";

  }

  return (
    message ||
    "An unexpected error occurred."
  );

}


function escapeCSV(
  value
) {

  const text =
    String(
      value ??
      ""
    );

  return (
    '"' +
    text.replace(
      /"/g,
      '""'
    ) +
    '"'
  );

}


function buildFilename(
  extension
) {

  const source =
    currentPageInfo.hostname ||
    "webpage";

  const safe =
    source
      .replace(
        /^www\./i,
        ""
      )
      .replace(
        /[^a-zA-Z0-9.-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      );

  return (
    `sankalan-${safe}-${timestamp}.${extension}`
  );

}


function downloadBlob(
  content,
  mimeType,
  filename
) {

  const blob =
    new Blob(
      [
        content
      ],
      {
        type:
          mimeType
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  chrome.downloads.download({
    url:
      url,
    filename:
      filename,
    saveAs:
      true
  });

  setTimeout(
    function () {

      URL.revokeObjectURL(
        url
      );

    },
    5000
  );

}


function buildExcelHTML(
  data
) {

  const rows =
    data.map(
      function (
        row,
        rowIndex
      ) {

        const tag =
          rowIndex === 0
            ? "th"
            : "td";

        const cells =
          row.map(
            function (value) {

              return (
                `<${tag}>` +
                escapeHTML(
                  value
                ) +
                `</${tag}>`
              );

            }
          )
          .join("");

        return (
          `<tr>${cells}</tr>`
        );

      }
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <table border="1">
          ${rows}
        </table>
      </body>
    </html>
  `;

}


function escapeHTML(
  value
) {

  return String(
    value ??
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/*
  ==================================================
  PAGE SCAN
  ==================================================
*/


function scanPage() {

  const ignoredTags =
    new Set([
      "SCRIPT",
      "STYLE",
      "NOSCRIPT",
      "TEMPLATE",
      "META",
      "LINK",
      "HEAD",
      "SVG",
      "PATH"
    ]);


  const tables =
    Array.from(
      document.querySelectorAll(
        "table"
      )
    )
      .filter(
        function (table) {

          return isVisibleElement(
            table
          );

        }
      )
      .map(
        function (
          table,
          index
        ) {

          const rows =
            getDirectRows(
              table
            );

          const columns =
            estimateTableColumnCount(
              rows
            );

          return {
            index:
              index,

            rows:
              rows.length,

            columns:
              columns
          };

        }
      );


  const parentSet =
    new Set();


  const preferredSelectors = [

    "main",

    "section",

    "article",

    "ul",

    "ol",

    "[role='list']",

    "[role='grid']",

    "[role='feed']",

    "[role='listbox']",

    "[data-testid]",

    "[class*='list' i]",

    "[class*='grid' i]",

    "[class*='result' i]",

    "[class*='card' i]",

    "[class*='item' i]"

  ];


  preferredSelectors
    .forEach(
      function (selector) {

        try {

          document
            .querySelectorAll(
              selector
            )
            .forEach(
              function (element) {

                parentSet.add(
                  element
                );

              }
            );

        } catch (error) {

          // Ignore unsupported selectors.

        }

      }
    );


  Array.from(
    document.body
      ?.querySelectorAll(
        "*"
      ) ||
    []
  )
    .forEach(
      function (element) {

        if (
          element.children.length >= 3
        ) {

          parentSet.add(
            element
          );

        }

      }
    );


  const candidateParents =
    Array.from(
      parentSet
    );


  const candidates =
    [];


  for (
    const parent
    of candidateParents
  ) {

    if (
      ignoredTags.has(
        parent.tagName
      )
    ) {
      continue;
    }


    if (
      !isVisibleElement(
        parent
      )
    ) {
      continue;
    }


    const children =
      Array.from(
        parent.children
      )
        .filter(
          function (child) {

            return (
              !ignoredTags.has(
                child.tagName
              ) &&
              isVisibleElement(
                child
              )
            );

          }
        );


    if (
      children.length < 3 ||
      children.length > 1000
    ) {
      continue;
    }


    const signatures =
      new Map();


    children.forEach(
      function (child) {

        const visibleText =
          normalizeText(
            child.innerText
          );


        const mediaCount =
          child.querySelectorAll(
            "img, a[href]"
          ).length;


        if (
          visibleText === "" &&
          mediaCount === 0
        ) {
          return;
        }


        const signature =
          createSignature(
            child
          );


        if (
          !signatures.has(
            signature
          )
        ) {

          signatures.set(
            signature,
            []
          );

        }


        signatures
          .get(
            signature
          )
          .push(
            child
          );

      }
    );


    signatures.forEach(
      function (
        items,
        signature
      ) {

        if (
          items.length < 3
        ) {
          return;
        }


        const metrics =
          calculateMetrics(
            items
          );


        if (
          metrics.codeRatio >
          0.2
        ) {
          return;
        }


        if (
          metrics.averageTextLength < 3 &&
          metrics.averageImages < 0.2 &&
          metrics.averageLinks < 0.2
        ) {
          return;
        }


        if (
          items.length <= 6 &&
          metrics.averageLinks < 0.2 &&
          metrics.averageImages < 0.2 &&
          metrics.averageDescendants < 4 &&
          metrics.averageTextLength < 50
        ) {
          return;
        }


        if (
          items.length <= 8 &&
          metrics.averageLinks < 0.25 &&
          metrics.averageImages < 0.25 &&
          metrics.averageTextLength < 35
        ) {
          return;
        }


        const score =
          calculateScore(
            items,
            metrics
          );


        if (
          score <= 0
        ) {
          return;
        }


        const sample =
          findUsefulSample(
            items
          );


        candidates.push({

          parentPath:
            buildElementPath(
              parent
            ),

          signature:
            signature,

          count:
            items.length,

          score:
            score,

          likelyType:
            guessType(
              metrics
            ),

          averageTextLength:
            Math.round(
              metrics.averageTextLength
            ),

          averageLinks:
            roundOne(
              metrics.averageLinks
            ),

          averageImages:
            roundOne(
              metrics.averageImages
            ),

          sample:
            sample

        });

      }
    );

  }


  candidates.sort(
    function (
      first,
      second
    ) {

      return (
        second.score -
        first.score
      );

    }
  );


  const output =
    [];

  const seen =
    new Set();


  for (
    const candidate
    of candidates
  ) {

    const key =
      [
        candidate.parentPath,
        candidate.signature
      ]
        .join("|");


    if (
      seen.has(
        key
      )
    ) {
      continue;
    }


    seen.add(
      key
    );


    output.push(
      candidate
    );


    if (
      output.length >= 40
    ) {
      break;
    }

  }


  return {

    title:
      document.title ||
      "",

    hostname:
      location.hostname ||
      "",

    tables:
      tables,

    groups:
      output,

    links:
      document.querySelectorAll(
        "a[href]"
      ).length,

    images:
      document.querySelectorAll(
        "img"
      ).length,

    lists:
      document.querySelectorAll(
        "ul, ol"
      ).length

  };


  function getDirectRows(
    table
  ) {

    return Array.from(
      table.querySelectorAll(
        "tr"
      )
    )
      .filter(
        function (row) {

          return (
            row.closest(
              "table"
            ) === table
          );

        }
      );

  }


  function estimateTableColumnCount(
    rows
  ) {

    let maximum =
      0;


    rows.forEach(
      function (row) {

        const cells =
          Array.from(
            row.children
          )
            .filter(
              function (cell) {

                return (
                  (
                    cell.tagName === "TH" ||
                    cell.tagName === "TD"
                  ) &&
                  cell.closest(
                    "table"
                  ) ===
                    row.closest(
                      "table"
                    )
                );

              }
            );


        const count =
          cells.reduce(
            function (
              total,
              cell
            ) {

              const colspan =
                Math.max(
                  parseInt(
                    cell.getAttribute(
                      "colspan"
                    ) ||
                    "1",
                    10
                  ) ||
                  1,
                  1
                );


              return (
                total +
                colspan
              );

            },
            0
          );


        maximum =
          Math.max(
            maximum,
            count
          );

      }
    );


    return maximum;

  }


  function isVisibleElement(
    element
  ) {

    if (
      !(element instanceof Element)
    ) {
      return false;
    }


    const style =
      window.getComputedStyle(
        element
      );


    if (
      style.display ===
        "none" ||
      style.visibility ===
        "hidden" ||
      Number(
        style.opacity
      ) === 0
    ) {
      return false;
    }


    const rect =
      element.getBoundingClientRect();


    return (
      rect.width > 0 &&
      rect.height > 0
    );

  }


  function createSignature(
    element
  ) {

    const tag =
      element.tagName
        .toLowerCase();


    const classes =
      Array.from(
        element.classList ||
        []
      )
        .filter(
          function (name) {

            return (
              name.length <= 80 &&
              !/\d{5,}/
                .test(
                  name
                )
            );

          }
        )
        .sort()
        .slice(
          0,
          6
        );


    return (
      tag +
      "|" +
      classes.join(".")
    );

  }


  function calculateMetrics(
    items
  ) {

    let textTotal =
      0;

    let linksTotal =
      0;

    let imagesTotal =
      0;

    let descendantsTotal =
      0;

    let prices =
      0;

    let codeLike =
      0;

    let headingCount =
      0;


    items.forEach(
      function (item) {

        const text =
          normalizeText(
            item.innerText
          );


        textTotal +=
          text.length;


        linksTotal +=
          item.querySelectorAll(
            "a[href]"
          ).length +
          (
            item.matches(
              "a[href]"
            )
              ? 1
              : 0
          );


        imagesTotal +=
          item.querySelectorAll(
            "img"
          ).length +
          (
            item.matches(
              "img"
            )
              ? 1
              : 0
          );


        descendantsTotal +=
          item.querySelectorAll(
            "*"
          ).length;


        if (
          item.querySelector(
            "h1, h2, h3, h4, h5, h6"
          )
        ) {

          headingCount++;

        }


        if (
          /(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)\s*\d/i
            .test(
              text
            )
        ) {

          prices++;

        }


        if (
          isLikelyCodeText(
            text
          )
        ) {

          codeLike++;

        }

      }
    );


    const count =
      Math.max(
        items.length,
        1
      );


    return {

      averageTextLength:
        textTotal /
        count,

      averageLinks:
        linksTotal /
        count,

      averageImages:
        imagesTotal /
        count,

      averageDescendants:
        descendantsTotal /
        count,

      priceRatio:
        prices /
        count,

      codeRatio:
        codeLike /
        count,

      headingRatio:
        headingCount /
        count

    };

  }


  function calculateScore(
    items,
    metrics
  ) {

    let score =
      0;


    score +=
      Math.min(
        items.length,
        300
      ) *
      1.7;


    score +=
      Math.min(
        metrics.averageImages,
        3
      ) *
      32;


    score +=
      Math.min(
        metrics.averageLinks,
        5
      ) *
      24;


    score +=
      Math.min(
        metrics.averageDescendants,
        80
      ) *
      0.8;


    score +=
      metrics.priceRatio *
      80;


    score +=
      metrics.headingRatio *
      35;


    if (
      metrics.averageTextLength >= 10
    ) {
      score += 15;
    }


    if (
      metrics.averageTextLength >= 30
    ) {
      score += 20;
    }


    if (
      metrics.averageTextLength >= 60
    ) {
      score += 20;
    }


    if (
      metrics.averageTextLength >= 100
    ) {
      score += 20;
    }


    if (
      metrics.averageLinks >= 1 &&
      metrics.averageTextLength >= 40
    ) {

      score += 35;

    }


    if (
      metrics.averageImages >= 0.8 &&
      metrics.averageLinks >= 0.8
    ) {

      score += 50;

    }


    if (
      items.length >= 20
    ) {
      score += 25;
    }


    if (
      items.length >= 50
    ) {
      score += 35;
    }


    if (
      items.length >= 100
    ) {
      score += 45;
    }


    if (
      metrics.averageTextLength < 30 &&
      metrics.averageImages < 0.5 &&
      metrics.averageLinks < 0.5
    ) {

      score -= 90;

    }


    if (
      items.length <= 6 &&
      metrics.averageImages === 0 &&
      metrics.averageLinks === 0
    ) {

      score -= 80;

    }


    if (
      metrics.averageDescendants < 3 &&
      metrics.averageLinks < 0.5 &&
      metrics.averageImages < 0.5
    ) {

      score -= 50;

    }


    return score;

  }


  function guessType(
    metrics
  ) {

    if (
      metrics.priceRatio >=
      0.4
    ) {
      return "products";
    }


    if (
      metrics.averageImages >= 0.8 &&
      metrics.averageLinks >= 0.8
    ) {
      return "cards";
    }


    if (
      metrics.averageLinks >= 1 &&
      metrics.averageTextLength >= 40
    ) {
      return "records";
    }


    if (
      metrics.averageLinks >= 1
    ) {
      return "links";
    }


    return "repeated records";

  }


  function findUsefulSample(
    items
  ) {

    for (
      const item
      of items
    ) {

      const text =
        normalizeText(
          item.innerText
        );


      if (
        text.length >= 3 &&
        !isLikelyCodeText(
          text
        )
      ) {

        return text.slice(
          0,
          160
        );

      }

    }


    return "";

  }


  function normalizeText(
    value
  ) {

    return String(
      value ||
      ""
    )
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  }


  function isLikelyCodeText(
    value
  ) {

    if (
      value.length >
      1500
    ) {
      return true;
    }


    const patterns = [

      /function\s*\(/,

      /=>\s*{/,

      /\bwindow\./,

      /\bdocument\./,

      /\bconst\s+/,

      /\blet\s+/,

      /\bvar\s+/

    ];


    return (
      patterns.filter(
        function (pattern) {

          return pattern.test(
            value
          );

        }
      ).length >= 2
    );

  }


  function buildElementPath(
    element
  ) {

    if (
      element ===
      document.body
    ) {
      return "body";
    }


    const parts =
      [];


    let current =
      element;


    while (
      current &&
      current !== document.body &&
      current.nodeType === 1
    ) {

      let part =
        current.tagName
          .toLowerCase();


      const id =
        current.id;


      if (
        id &&
        /^[a-zA-Z][\w\-:.]*$/
          .test(
            id
          )
      ) {

        part +=
          "#" +
          safeEscape(
            id
          );


        parts.unshift(
          part
        );


        break;

      }


      const classes =
        Array.from(
          current.classList ||
          []
        )
          .filter(
            function (name) {

              return (
                name.length <= 60 &&
                !/\d{5,}/
                  .test(
                    name
                  )
              );

            }
          )
          .slice(
            0,
            2
          );


      classes.forEach(
        function (className) {

          part +=
            "." +
            safeEscape(
              className
            );

        }
      );


      const siblings =
        current.parentElement
          ? Array.from(
              current.parentElement.children
            )
              .filter(
                function (sibling) {

                  return (
                    sibling.tagName ===
                    current.tagName
                  );

                }
              )
          : [];


      if (
        siblings.length > 1
      ) {

        const index =
          siblings.indexOf(
            current
          ) + 1;


        part +=
          `:nth-of-type(${index})`;

      }


      parts.unshift(
        part
      );


      current =
        current.parentElement;

    }


    return (
      "body > " +
      parts.join(
        " > "
      )
    );

  }


  function safeEscape(
    value
  ) {

    if (
      window.CSS &&
      typeof CSS.escape ===
        "function"
    ) {

      return CSS.escape(
        value
      );

    }


    return String(
      value
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "\\$&"
      );

  }


  function roundOne(
    value
  ) {

    return (
      Math.round(
        value *
        10
      ) /
      10
    );

  }

}


/*
  ==================================================
  ADVANCED TABLE EXTRACTION
  ==================================================
*/


function extractSelectedTable(
  selectedIndex
) {

  const visibleTables =
    Array.from(
      document.querySelectorAll(
        "table"
      )
    )
      .filter(
        function (table) {

          const style =
            window.getComputedStyle(
              table
            );

          const rect =
            table.getBoundingClientRect();

          return (
            style.display !==
              "none" &&
            style.visibility !==
              "hidden" &&
            rect.width > 0 &&
            rect.height > 0
          );

        }
      );


  const table =
    visibleTables[
      selectedIndex
    ];


  if (!table) {
    return null;
  }


  const sourceRows =
    Array.from(
      table.querySelectorAll(
        "tr"
      )
    )
      .filter(
        function (row) {

          return (
            row.closest(
              "table"
            ) === table
          );

        }
      );


  if (
    sourceRows.length === 0
  ) {
    return null;
  }


  const grid =
    [];

  const activeRowspans =
    new Map();


  sourceRows.forEach(
    function (row) {

      const outputRow =
        [];


      activeRowspans.forEach(
        function (
          entry,
          columnIndex
        ) {

          outputRow[
            columnIndex
          ] =
            entry.value;

        }
      );


      const cells =
        Array.from(
          row.children
        )
          .filter(
            function (cell) {

              return (
                (
                  cell.tagName === "TH" ||
                  cell.tagName === "TD"
                ) &&
                cell.closest(
                  "table"
                ) === table
              );

            }
          );


      let columnIndex =
        0;


      cells.forEach(
        function (cell) {

          while (
            outputRow[
              columnIndex
            ] !== undefined
          ) {

            columnIndex++;

          }


          const colspan =
            Math.max(
              parseInt(
                cell.getAttribute(
                  "colspan"
                ) ||
                "1",
                10
              ) ||
              1,
              1
            );


          const rowspan =
            Math.max(
              parseInt(
                cell.getAttribute(
                  "rowspan"
                ) ||
                "1",
                10
              ) ||
              1,
              1
            );


          const value =
            getCellText(
              cell
            );


          outputRow[
            columnIndex
          ] =
            value;


          for (
            let offset = 1;
            offset < colspan;
            offset++
          ) {

            outputRow[
              columnIndex +
              offset
            ] =
              "";

          }


          if (
            rowspan > 1
          ) {

            for (
              let offset = 0;
              offset < colspan;
              offset++
            ) {

              activeRowspans.set(
                columnIndex +
                  offset,
                {
                  value:
                    offset === 0
                      ? value
                      : "",

                  remaining:
                    rowspan -
                    1
                }
              );

            }

          }


          columnIndex +=
            colspan;

        }
      );


      grid.push(
        outputRow
      );


      Array.from(
        activeRowspans.entries()
      )
        .forEach(
          function (
            [
              column,
              entry
            ]
          ) {

            entry.remaining--;


            if (
              entry.remaining <= 0
            ) {

              activeRowspans.delete(
                column
              );

            }

          }
        );

    }
  );


  const maximumColumns =
    grid.reduce(
      function (
        maximum,
        row
      ) {

        return Math.max(
          maximum,
          row.length
        );

      },
      0
    );


  let normalizedRows =
    grid.map(
      function (row) {

        const result =
          [];


        for (
          let index = 0;
          index < maximumColumns;
          index++
        ) {

          result.push(
            normalizeCellValue(
              row[
                index
              ]
            )
          );

        }


        return result;

      }
    );


  normalizedRows =
    normalizedRows.filter(
      function (row) {

        return row.some(
          function (value) {

            return (
              value !== ""
            );

          }
        );

      }
    );


  if (
    normalizedRows.length === 0
  ) {
    return null;
  }


  normalizedRows =
    removeEmptyColumns(
      normalizedRows
    );


  const keyValueScore =
    calculateKeyValueScore(
      normalizedRows
    );


  let finalRows =
    normalizedRows;

  let tableType =
    "table";


  if (
    keyValueScore >= 0.5
  ) {

    finalRows =
      convertKeyValueTable(
        normalizedRows
      );

    tableType =
      "key-value";

  } else {

    finalRows =
      ensureTableHeader(
        normalizedRows
      );

  }


  const caption =
    normalizeCellValue(
      table.caption
        ?.innerText ||
      ""
    );


  const nearbyHeading =
    findNearbyHeading(
      table
    );


  return {

    title:
      caption ||
      nearbyHeading ||
      `Table ${selectedIndex + 1}`,

    type:
      tableType,

    rows:
      finalRows

  };


  function getCellText(
    cell
  ) {

    const clone =
      cell.cloneNode(
        true
      );


    clone
      .querySelectorAll(
        "table"
      )
      .forEach(
        function (nestedTable) {

          nestedTable.remove();

        }
      );


    clone
      .querySelectorAll(
        "style, script, noscript, svg"
      )
      .forEach(
        function (element) {

          element.remove();

        }
      );


    clone
      .querySelectorAll(
        "br"
      )
      .forEach(
        function (br) {

          br.replaceWith(
            document.createTextNode(
              " "
            )
          );

        }
      );


    const walker =
      document.createTreeWalker(
        clone,
        NodeFilter.SHOW_TEXT
      );


    const pieces =
      [];


    let node =
      walker.nextNode();


    while (node) {

      const text =
        String(
          node.nodeValue ||
          ""
        )
          .replace(
            /\u00a0/g,
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();


      if (text) {

        pieces.push(
          text
        );

      }


      node =
        walker.nextNode();

    }


    return normalizeJoinedText(
      pieces.join(
        " "
      )
    );

  }


  function normalizeJoinedText(
    value
  ) {

    return String(
      value ||
      ""
    )
      .replace(
        /\u00a0/g,
        " "
      )
      .replace(
        /\s+([,.;:!?%\)\]])/g,
        "$1"
      )
      .replace(
        /([\(\[])\s+/g,
        "$1"
      )
      .replace(
        /\s+\[(\d+(?:\]\[\d+)*)\]/g,
        "[$1]"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  }


  function normalizeCellValue(
    value
  ) {

    return normalizeJoinedText(
      value
    );

  }


  function removeEmptyColumns(
    rows
  ) {

    const maximum =
      rows.reduce(
        function (
          value,
          row
        ) {

          return Math.max(
            value,
            row.length
          );

        },
        0
      );


    const keep =
      [];


    for (
      let column = 0;
      column < maximum;
      column++
    ) {

      const hasValue =
        rows.some(
          function (row) {

            return (
              normalizeCellValue(
                row[
                  column
                ]
              ) !== ""
            );

          }
        );


      if (
        hasValue
      ) {

        keep.push(
          column
        );

      }

    }


    return rows.map(
      function (row) {

        return keep.map(
          function (column) {

            return normalizeCellValue(
              row[
                column
              ]
            );

          }
        );

      }
    );

  }


  function calculateKeyValueScore(
    rows
  ) {

    if (
      rows.length < 4
    ) {
      return 0;
    }


    let usefulRows =
      0;

    let compatibleRows =
      0;


    rows.forEach(
      function (row) {

        const nonEmpty =
          row
            .map(
              normalizeCellValue
            )
            .filter(Boolean);


        if (
          nonEmpty.length === 0
        ) {
          return;
        }


        usefulRows++;


        if (
          nonEmpty.length === 1 ||
          nonEmpty.length === 2
        ) {

          compatibleRows++;

        }

      }
    );


    if (
      usefulRows === 0
    ) {
      return 0;
    }


    return (
      compatibleRows /
      usefulRows
    );

  }


  function convertKeyValueTable(
    rows
  ) {

    const output = [
      [
        "Field",
        "Value"
      ]
    ];


    let currentSection =
      "";


    for (
      let rowIndex = 0;
      rowIndex < rows.length;
      rowIndex++
    ) {

      const row =
        rows[
          rowIndex
        ];


      const nonEmpty =
        row
          .map(
            normalizeCellValue
          )
          .filter(Boolean);


      if (
        nonEmpty.length === 0
      ) {
        continue;
      }


      if (
        nonEmpty.length === 1
      ) {

        const candidate =
          nonEmpty[
            0
          ];


        const next =
          findNextUsefulRow(
            rows,
            rowIndex +
            1
          );


        if (
          next &&
          startsWithSubField(
            next[
              0
            ]
          )
        ) {

          currentSection =
            candidate;

        }


        continue;

      }


      let key =
        nonEmpty[
          0
        ];


      const value =
        nonEmpty
          .slice(
            1
          )
          .join(
            " | "
          );


      if (
        startsWithSubField(
          key
        )
      ) {

        key =
          removeSubFieldMarker(
            key
          );


        if (
          currentSection
        ) {

          key =
            `${currentSection} - ${key}`;

        }


        output.push(
          [
            key,
            value
          ]
        );


        continue;

      }


      output.push(
        [
          key,
          value
        ]
      );


      const next =
        findNextUsefulRow(
          rows,
          rowIndex +
          1
        );


      if (
        next &&
        startsWithSubField(
          next[
            0
          ]
        )
      ) {

        currentSection =
          key;

      } else {

        currentSection =
          "";

      }

    }


    return output;

  }


  function findNextUsefulRow(
    rows,
    startIndex
  ) {

    for (
      let index = startIndex;
      index < rows.length;
      index++
    ) {

      const nonEmpty =
        rows[
          index
        ]
          .map(
            normalizeCellValue
          )
          .filter(Boolean);


      if (
        nonEmpty.length > 0
      ) {

        return nonEmpty;

      }

    }


    return null;

  }


  function startsWithSubField(
    value
  ) {

    return /^[•·▪◦‣∙\-–—]\s*/
      .test(
        normalizeCellValue(
          value
        )
      );

  }


  function removeSubFieldMarker(
    value
  ) {

    return normalizeCellValue(
      value
    )
      .replace(
        /^[•·▪◦‣∙\-–—]\s*/,
        ""
      )
      .trim();

  }


  function ensureTableHeader(
    rows
  ) {

    if (
      rows.length === 0
    ) {
      return rows;
    }


    const firstSourceRow =
      sourceRows[
        0
      ];


    const directCells =
      firstSourceRow
        ? Array.from(
            firstSourceRow.children
          )
            .filter(
              function (cell) {

                return (
                  cell.tagName === "TH" ||
                  cell.tagName === "TD"
                );

              }
            )
        : [];


    const hasHeaderCells =
      directCells.some(
        function (cell) {

          return (
            cell.tagName === "TH"
          );

        }
      );


    if (
      hasHeaderCells
    ) {

      return rows;

    }


    const columnCount =
      rows[
        0
      ].length;


    const headers =
      [];


    for (
      let index = 0;
      index < columnCount;
      index++
    ) {

      headers.push(
        `Column ${index + 1}`
      );

    }


    return [
      headers,
      ...rows
    ];

  }


  function findNearbyHeading(
    element
  ) {

    let current =
      element.previousElementSibling;


    let attempts =
      0;


    while (
      current &&
      attempts < 5
    ) {

      if (
        /^H[1-6]$/
          .test(
            current.tagName
          )
      ) {

        const text =
          normalizeCellValue(
            current.innerText
          );


        if (text) {
          return text;
        }

      }


      const heading =
        current.querySelector(
          "h1, h2, h3, h4, h5, h6"
        );


      if (heading) {

        const text =
          normalizeCellValue(
            heading.innerText
          );


        if (text) {
          return text;
        }

      }


      current =
        current.previousElementSibling;


      attempts++;

    }


    return "";

  }

}


/*
  ==================================================
  DYNAMIC REPEATED GROUP EXTRACTION
  ==================================================
*/


async function extractDynamicRepeatedGroup(
  group
) {

  if (
    !globalThis.Sankalan
      ?.fieldDiscovery ||
    !globalThis.Sankalan
      ?.ratingExtractor ||
    !globalThis.Sankalan
      ?.recordExtractor
  ) {

    throw new Error(
      "Sankalan extraction modules did not load correctly."
    );

  }


  const parent =
    document.querySelector(
      group.parentPath
    );


  if (!parent) {

    throw new Error(
      "The selected repeated group is no longer available. Rescan the page."
    );

  }


  function createSignature(
    element
  ) {

    const tag =
      element.tagName
        .toLowerCase();


    const classes =
      Array.from(
        element.classList ||
        []
      )
        .filter(
          function (name) {

            return (
              name.length <= 80 &&
              !/\d{5,}/
                .test(
                  name
                )
            );

          }
        )
        .sort()
        .slice(
          0,
          6
        );


    return (
      tag +
      "|" +
      classes.join(".")
    );

  }


  function isVisible(
    element
  ) {

    const style =
      getComputedStyle(
        element
      );


    if (
      style.display ===
        "none" ||
      style.visibility ===
        "hidden"
    ) {

      return false;

    }


    const rect =
      element.getBoundingClientRect();


    return (
      rect.width > 0 &&
      rect.height > 0
    );

  }


  let items =
    Array.from(
      parent.children
    )
      .filter(
        function (child) {

          return (
            isVisible(
              child
            ) &&
            createSignature(
              child
            ) ===
              group.signature
          );

        }
      );


  if (
    items.length === 0
  ) {

    throw new Error(
      "No matching repeated items were found."
    );

  }


  const originalX =
    window.scrollX;

  const originalY =
    window.scrollY;


  const scrollTargets =
    [];


  if (
    items.length <= 60
  ) {

    scrollTargets.push(
      ...items
    );

  } else {

    const steps =
      40;


    for (
      let index = 0;
      index < steps;
      index++
    ) {

      const position =
        Math.floor(
          (
            index /
            (
              steps -
              1
            )
          ) *
          (
            items.length -
            1
          )
        );


      scrollTargets.push(
        items[
          position
        ]
      );

    }

  }


  for (
    const item
    of scrollTargets
  ) {

    try {

      item.scrollIntoView({
        block:
          "center",
        inline:
          "nearest"
      });


      await new Promise(
        function (resolve) {

          setTimeout(
            resolve,
            15
          );

        }
      );

    } catch (error) {

      // Ignore scroll failures.

    }

  }


  window.scrollTo(
    originalX,
    originalY
  );


  items =
    Array.from(
      parent.children
    )
      .filter(
        function (child) {

          return (
            isVisible(
              child
            ) &&
            createSignature(
              child
            ) ===
              group.signature
          );

        }
      );


  let fields =
    globalThis.Sankalan
      .fieldDiscovery
      .discover(
        items
      );


  const ratingResults =
    items.map(
      function (item) {

        const result =
          globalThis.Sankalan
            .ratingExtractor
            .extract(
              item
            );


        return {

          rating:
            result?.rating ||
            "",

          reviews:
            result?.reviews ||
            ""

        };

      }
    );


  const ratingPresence =
    ratingResults
      .filter(
        function (result) {

          return (
            result.rating !==
            ""
          );

        }
      )
      .length /
    items.length;


  const reviewsPresence =
    ratingResults
      .filter(
        function (result) {

          return (
            result.reviews !==
            ""
          );

        }
      )
      .length /
    items.length;


  const hasRating =
    fields.some(
      function (field) {

        return (
          normalizeFieldName(
            field.name
          ) ===
          "rating"
        );

      }
    );


  if (
    !hasRating &&
    ratingPresence >= 0.15
  ) {

    fields.push({

      id:
        "semantic_rating",

      name:
        "Rating",

      path:
        "@semantic:rating",

      type:
        "rating",

      presence:
        Math.round(
          ratingPresence *
          100
        ),

      score:
        220,

      examples:
        ratingResults
          .map(
            function (result) {

              return result.rating;

            }
          )
          .filter(Boolean)
          .slice(
            0,
            3
          )

    });

  }


  const hasReviews =
    fields.some(
      function (field) {

        return (
          normalizeFieldName(
            field.name
          ) ===
          "reviews"
        );

      }
    );


  if (
    !hasReviews &&
    reviewsPresence >= 0.15
  ) {

    fields.push({

      id:
        "semantic_reviews",

      name:
        "Reviews",

      path:
        "@semantic:reviews",

      type:
        "count",

      presence:
        Math.round(
          reviewsPresence *
          100
        ),

      score:
        210,

      examples:
        ratingResults
          .map(
            function (result) {

              return result.reviews;

            }
          )
          .filter(Boolean)
          .slice(
            0,
            3
          )

    });

  }


  fields.sort(
    function (
      first,
      second
    ) {

      return (
        getDynamicFieldPriority(
          first
        ) -
        getDynamicFieldPriority(
          second
        ) ||
        (
          Number(
            second.score ||
            0
          ) -
          Number(
            first.score ||
            0
          )
        )
      );

    }
  );


  fields =
    fields.slice(
      0,
      40
    );


  const extracted =
    globalThis.Sankalan
      .recordExtractor
      .extract(
        items,
        fields
      );


  const ratingIndex =
    extracted.headers
      .findIndex(
        function (header) {

          return (
            normalizeFieldName(
              header
            ) ===
            "rating"
          );

        }
      );


  const reviewsIndex =
    extracted.headers
      .findIndex(
        function (header) {

          return (
            normalizeFieldName(
              header
            ) ===
            "reviews"
          );

        }
      );


  if (
    ratingIndex >= 0
  ) {

    extracted.rows
      .forEach(
        function (
          row,
          index
        ) {

          if (
            ratingResults[
              index
            ]
              ?.rating
          ) {

            row[
              ratingIndex
            ] =
              ratingResults[
                index
              ].rating;

          }

        }
      );

  }


  if (
    reviewsIndex >= 0
  ) {

    extracted.rows
      .forEach(
        function (
          row,
          index
        ) {

          if (
            ratingResults[
              index
            ]
              ?.reviews
          ) {

            row[
              reviewsIndex
            ] =
              ratingResults[
                index
              ].reviews;

          }

        }
      );

  }


  return extracted;


  function normalizeFieldName(
    value
  ) {

    return String(
      value ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+\d+$/,
        ""
      );

  }


  function getDynamicFieldPriority(
    field
  ) {

    const name =
      normalizeFieldName(
        field.name
      );


    if (
      /^(?:product title|movie title|book title|job title|title|name)$/
        .test(
          name
        )
    ) {
      return 0;
    }


    if (
      name ===
      "price"
    ) {
      return 10;
    }


    if (
      name ===
      "rating"
    ) {
      return 15;
    }


    if (
      /^(?:reviews|discount|savings|sold|year|runtime|certificate|category|brand|availability|location|delivery|date|status|number)$/
        .test(
          name
        )
    ) {
      return 20;
    }


    if (
      name ===
      "action"
    ) {
      return 60;
    }


    if (
      field.type ===
      "url"
    ) {
      return 90;
    }


    if (
      field.type ===
      "image"
    ) {
      return 100;
    }


    return 40;

  }

}