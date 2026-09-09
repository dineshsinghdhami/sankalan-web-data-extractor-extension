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

    setSourceTab(
      "table"
    );

  }
);


groupTab.addEventListener(
  "click",
  function () {

    setSourceTab(
      "group"
    );

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

    setScanLoading(
      true
    );


    extractedData = [];

    detectedGroups = [];

    currentExtractionType =
      "";


    hideSection(
      overviewSection
    );

    hideSection(
      dataSourceSection
    );

    hideSection(
      previewSection
    );

    hideSection(
      exportSection
    );


    tableSelect.innerHTML =
      "";

    groupSelect.innerHTML =
      "";

    previewTableContainer.innerHTML =
      "";


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

            tabId:
              tab.id

          },

          function:
            scanPage

        });


      const pageData =
        results[0]?.result;


      if (
        !pageData
      ) {

        throw new Error(
          "The webpage returned no scan data."
        );

      }


      currentPageInfo = {

        title:
          pageData.title ||
          "",

        hostname:
          pageData.hostname ||
          ""

      };


      detectedGroups =
        pageData.groups ||
        [];


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
        pageData.tables.length >
        0
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

        pageData.tables.length +
        " table(s) and " +
        pageData.groups.length +
        " visible repeated group(s) detected."

      );

    } catch (error) {

      showStatus(

        "error",

        "Unable to scan page",

        error.message

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

    const tableIndex =
      Number(
        tableSelect.value
      );


    if (
      !Number.isInteger(
        tableIndex
      )
    ) {

      showStatus(

        "error",

        "No table selected",

        "Choose a table first."

      );

      return;

    }


    setTableExtractLoading(
      true
    );


    resetExtractionOutput();


    showStatus(

      "loading",

      "Extracting table",

      "Reading table headers and rows."

    );


    try {

      const tab =
        await getActiveTab();


      const results =
        await chrome.scripting.executeScript({

          target: {

            tabId:
              tab.id

          },

          function:
            extractRawTable,

          args: [
            tableIndex
          ]

        });


      const data =
        results[0]?.result ||
        [];


      if (
        data.length === 0
      ) {

        throw new Error(
          "No readable table data was found."
        );

      }


      extractedData =
        data;


      currentExtractionType =
        "table";


      showRawPreview(

        extractedData,

        "Extracted table"

      );


      showStatus(

        "success",

        "Table extracted",

        data.length +
        " row(s) collected."

      );

    } catch (error) {

      showStatus(

        "error",

        "Table extraction failed",

        error.message

      );

    } finally {

      setTableExtractLoading(
        false
      );

    }

  }
);


extractGroupBtn.addEventListener(
  "click",
  async function () {

    const groupIndex =
      Number(
        groupSelect.value
      );


    if (
      !Number.isInteger(
        groupIndex
      ) ||
      !detectedGroups[
        groupIndex
      ]
    ) {

      showStatus(

        "error",

        "No repeated group selected",

        "Choose a repeated group first."

      );

      return;

    }


    const selectedGroup =
      detectedGroups[
        groupIndex
      ];


    setGroupExtractLoading(
      true
    );


    resetExtractionOutput();


    showStatus(

      "loading",

      "Discovering fields",

      "Analyzing repeated records and automatically discovering the dataset schema."

    );


    try {

      const tab =
        await getActiveTab();


      /*
        Load the dynamic extraction modules
        into the webpage.

        field-discovery.js:
        discovers what fields exist.

        products.js:
        extracts those fields for all rows.
      */

      await chrome.scripting.executeScript({

        target: {

          tabId:
            tab.id

        },

        files: [

          "extractors/field-discovery.js",

          "extractors/products.js"

        ]

      });


      const results =
        await chrome.scripting.executeScript({

          target: {

            tabId:
              tab.id

          },

          function:
            extractDynamicRepeatedGroup,

          args: [
            selectedGroup
          ]

        });


      const result =
        results[0]?.result;


      if (
        !result
      ) {

        throw new Error(
          "The dynamic extraction engine returned no result."
        );

      }


      if (
        !result.headers ||
        result.headers.length ===
          0
      ) {

        throw new Error(
          "No useful fields could be discovered in this repeated group."
        );

      }


      if (
        !result.rows ||
        result.rows.length ===
          0
      ) {

        throw new Error(
          "Fields were discovered, but no records could be extracted."
        );

      }


      extractedData = [

        result.headers,

        ...result.rows

      ];


      currentExtractionType =
        "dynamic-records";


      showRawPreview(

        extractedData,

        "Automatically discovered dataset"

      );


      const fieldNames =
        result.headers
          .slice(
            0,
            6
          )
          .join(
            ", "
          );


      const extraFields =
        result.headers.length >
          6
          ? (
              " +" +
              (
                result.headers.length -
                6
              ) +
              " more"
            )
          : "";


      showStatus(

        "success",

        "Dynamic dataset created",

        result.rows.length +
        " record(s), " +
        result.headers.length +
        " field(s): " +
        fieldNames +
        extraFields

      );

    } catch (error) {

      showStatus(

        "error",

        "Dynamic extraction failed",

        error.message

      );

    } finally {

      setGroupExtractLoading(
        false
      );

    }

  }
);


csvBtn.addEventListener(
  "click",
  async function () {

    if (
      !hasExtractedData()
    ) {

      return;

    }


    setExportLoading(

      true,

      "Preparing CSV file..."

    );


    try {

      const csv =
        convertToCSV(
          extractedData
        );


      await downloadRawFile(

        "\uFEFF" +
        csv,

        buildFileName(
          "csv"
        ),

        "text/csv;charset=utf-8;"

      );


      showStatus(

        "success",

        "CSV ready",

        "Choose where you want to save the dataset."

      );

    } catch (error) {

      showStatus(

        "error",

        "CSV export failed",

        error.message

      );

    } finally {

      setExportLoading(
        false
      );

    }

  }
);


jsonBtn.addEventListener(
  "click",
  async function () {

    if (
      !hasExtractedData()
    ) {

      return;

    }


    setExportLoading(

      true,

      "Preparing JSON file..."

    );


    try {

      /*
        Dynamic repeated datasets are much
        more useful as JSON objects:

        {
          "Title": "...",
          "Price": "...",
          ...
        }

        Tables remain compatible too.
      */

      const jsonData =
        convertRowsToObjects(
          extractedData
        );


      const json =
        JSON.stringify(
          jsonData,
          null,
          2
        );


      await downloadRawFile(

        json,

        buildFileName(
          "json"
        ),

        "application/json;charset=utf-8;"

      );


      showStatus(

        "success",

        "JSON ready",

        "The dataset was exported as structured JSON records."

      );

    } catch (error) {

      showStatus(

        "error",

        "JSON export failed",

        error.message

      );

    } finally {

      setExportLoading(
        false
      );

    }

  }
);


excelBtn.addEventListener(
  "click",
  async function () {

    if (
      !hasExtractedData()
    ) {

      return;

    }


    setExportLoading(

      true,

      "Preparing spreadsheet..."

    );


    try {

      const content =
        convertToExcelHTML(
          extractedData
        );


      await downloadRawFile(

        content,

        buildFileName(
          "xls"
        ),

        "application/vnd.ms-excel;charset=utf-8;"

      );


      showStatus(

        "success",

        "Spreadsheet ready",

        "Choose where you want to save the spreadsheet."

      );

    } catch (error) {

      showStatus(

        "error",

        "Spreadsheet export failed",

        error.message

      );

    } finally {

      setExportLoading(
        false
      );

    }

  }
);


async function getActiveTab() {

  const tabs =
    await chrome.tabs.query({

      active:
        true,

      currentWindow:
        true

    });


  const tab =
    tabs[0];


  if (
    !tab ||
    !tab.id
  ) {

    throw new Error(
      "No active browser tab was found."
    );

  }


  return tab;

}


/*
  ------------------------------------------------
  PAGE SCANNER
  ------------------------------------------------
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
      );


  const tableInfo =
    tables.map(
      function (
        table,
        index
      ) {

        const rows =
          table.querySelectorAll(
            "tr"
          );


        let columns =
          0;


        rows.forEach(
          function (row) {

            columns =
              Math.max(

                columns,

                row.querySelectorAll(
                  "th, td"
                ).length

              );

          }
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


  const groups =
    detectRepeatedGroups();


  return {

    title:
      document.title,

    hostname:
      window.location.hostname,

    tables:
      tableInfo,

    groups:
      groups,

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


  function detectRepeatedGroups() {

    const candidates =
      [];


    const allParents =
      Array.from(
        document.querySelectorAll(
          "body *"
        )
      );


    const parents =
      allParents.slice(
        0,
        5000
      );


    for (
      const parent
      of parents
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
        children.length > 200
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


          if (
            visibleText === "" &&
            child.querySelectorAll(
              "img, a[href]"
            ).length === 0
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


          /*
            Reject code-heavy groups.
          */

          if (
            metrics.codeRatio >
            0.2
          ) {

            return;

          }


          /*
            Require some actual visible
            content.
          */

          if (
            metrics.averageTextLength <
              3 &&
            metrics.averageImages <
              0.2 &&
            metrics.averageLinks <
              0.2
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
        a,
        b
      ) {

        return (
          b.score -
          a.score
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
        candidate.parentPath +
        "|" +
        candidate.signature;


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


    return output;

  }


  function calculateMetrics(
    items
  ) {

    let textLength =
      0;

    let links =
      0;

    let images =
      0;

    let prices =
      0;

    let codeItems =
      0;

    let descendants =
      0;


    items.forEach(
      function (item) {

        const text =
          normalizeText(
            item.innerText
          );


        textLength +=
          text.length;


        links +=
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


        images +=
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


        descendants +=
          item.querySelectorAll(
            "*"
          ).length;


        if (
          containsPrice(
            text
          )
        ) {

          prices++;

        }


        if (
          isLikelyCode(
            text
          )
        ) {

          codeItems++;

        }

      }
    );


    return {

      averageTextLength:
        textLength /
        items.length,

      averageLinks:
        links /
        items.length,

      averageImages:
        images /
        items.length,

      averageDescendants:
        descendants /
        items.length,

      priceRatio:
        prices /
        items.length,

      codeRatio:
        codeItems /
        items.length

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
        60
      ) *
      2;


    score +=
      Math.min(
        metrics.averageTextLength,
        300
      ) *
      0.12;


    score +=
      Math.min(
        metrics.averageLinks,
        5
      ) *
      25;


    score +=
      Math.min(
        metrics.averageImages,
        5
      ) *
      40;


    score +=
      Math.min(
        metrics.averageDescendants,
        60
      ) *
      0.8;


    score +=
      metrics.priceRatio *
      80;


    score -=
      metrics.codeRatio *
      300;


    /*
      Strong repeated-card signal.
    */

    if (
      metrics.averageImages >=
        0.7 &&
      metrics.averageTextLength >=
        10
    ) {

      score +=
        100;

    }


    /*
      Navigation-like content penalty.
    */

    if (
      metrics.averageImages <
        0.1 &&
      metrics.averageTextLength <
        30 &&
      metrics.averageLinks >=
        1
    ) {

      score -=
        50;

    }


    return Math.round(
      score
    );

  }


  function guessType(
    metrics
  ) {

    if (
      metrics.averageImages >=
        0.7 &&
      metrics.priceRatio >=
        0.2
    ) {

      return "Product-like";

    }


    if (
      metrics.averageImages >=
        0.7 &&
      metrics.averageLinks >=
        0.5
    ) {

      return "Visual cards";

    }


    if (
      metrics.averageLinks >=
        1 &&
      metrics.averageTextLength <
        60
    ) {

      return "Link list";

    }


    if (
      metrics.averageTextLength >
      100
    ) {

      return "Content records";

    }


    return "Repeated records";

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
        text &&
        !isLikelyCode(
          text
        )
      ) {

        return text.slice(
          0,
          140
        );

      }

    }


    return "";

  }


  function containsPrice(
    text
  ) {

    return (

      /(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)\s*\d/i
        .test(
          text
        ) ||

      /\d[\d,.]*\s*(?:npr|rs\.?|usd|eur|inr)/i
        .test(
          text
        )

    );

  }


  function isLikelyCode(
    text
  ) {

    if (
      !text
    ) {

      return false;

    }


    if (
      text.length >
      1500
    ) {

      return true;

    }


    const patterns = [

      /function\s*\(/,

      /=>\s*{/,

      /\bwindow\.[a-zA-Z_$]/,

      /\bdocument\.[a-zA-Z_$]/,

      /\bconst\s+[a-zA-Z_$]/,

      /\blet\s+[a-zA-Z_$]/,

      /\bvar\s+[a-zA-Z_$]/,

      /\{\s*["'][a-zA-Z0-9_$-]+["']\s*:/

    ];


    const matches =
      patterns.filter(
        function (pattern) {

          return pattern.test(
            text
          );

        }
      ).length;


    return (
      matches >= 2
    );

  }


  function isVisibleElement(
    element
  ) {

    if (
      !element ||
      ignoredTags.has(
        element.tagName
      )
    ) {

      return false;

    }


    try {

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


      /*
        Keep off-screen lazy-loaded cards,
        but reject zero-size hidden nodes.
      */

      if (
        rect.width <= 0 ||
        rect.height <= 0
      ) {

        return false;

      }


      return true;

    } catch (error) {

      return false;

    }

  }


  function createSignature(
    element
  ) {

    const classes =
      Array.from(
        element.classList ||
        []
      )
        .filter(
          function (className) {

            return (
              className.length <=
                80 &&
              !/\d{6,}/
                .test(
                  className
                )
            );

          }
        )
        .sort()
        .slice(
          0,
          6
        )
        .join(
          "."
        );


    return (
      element.tagName
        .toLowerCase() +
      "|" +
      classes
    );

  }


  function buildElementPath(
    element
  ) {

    const parts =
      [];

    let current =
      element;


    while (
      current &&
      current !==
        document.body
    ) {

      const parent =
        current.parentElement;


      if (
        !parent
      ) {

        break;

      }


      const sameTag =
        Array.from(
          parent.children
        )
          .filter(
            function (sibling) {

              return (
                sibling.tagName ===
                current.tagName
              );

            }
          );


      const index =
        sameTag.indexOf(
          current
        ) + 1;


      parts.unshift(

        current.tagName
          .toLowerCase() +
        ":nth-of-type(" +
        index +
        ")"

      );


      current =
        parent;

    }


    return (
      "body > " +
      parts.join(
        " > "
      )
    );

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
  ------------------------------------------------
  DYNAMIC REPEATED RECORD EXTRACTION
  ------------------------------------------------
*/


async function extractDynamicRepeatedGroup(
  group
) {

  if (
    !globalThis.Sankalan ||
    !globalThis.Sankalan.fieldDiscovery ||
    !globalThis.Sankalan.recordExtractor
  ) {

    throw new Error(
      "Dynamic extraction modules were not loaded."
    );

  }


  const parent =
    document.querySelector(
      group.parentPath
    );


  if (
    !parent
  ) {

    throw new Error(
      "The selected repeated group is no longer available on the page."
    );

  }


  const items =
    Array.from(
      parent.children
    )
      .filter(
        function (child) {

          return (
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
      "No matching repeated records were found."
    );

  }


  /*
    Trigger lazy-loaded content before
    discovering the fields.
  */

  const originalX =
    window.scrollX;

  const originalY =
    window.scrollY;


  await loadLazyItems(
    items
  );


  window.scrollTo(
    originalX,
    originalY
  );


  await sleep(
    150
  );


  /*
    PHASE 1:
    discover schema automatically.
  */

  let fields =
    globalThis.Sankalan
      .fieldDiscovery
      .discover(
        items
      );


  if (
    !Array.isArray(
      fields
    )
  ) {

    fields =
      [];

  }


  /*
    Keep a reasonable number during this
    first implementation.

    Higher-value fields are already ranked
    first by field-discovery.js.
  */

  fields =
    fields.slice(
      0,
      40
    );


  /*
    PHASE 2:
    extract values using that schema.
  */

  const dataset =
    globalThis.Sankalan
      .recordExtractor
      .extract(
        items,
        fields
      );


  return {

    fields:
      fields,

    headers:
      dataset.headers,

    rows:
      dataset.rows

  };


  async function loadLazyItems(
    records
  ) {

    const batchSize =
      8;


    for (
      let i = 0;
      i < records.length;
      i += batchSize
    ) {

      const target =
        records[
          Math.min(
            i +
            batchSize -
            1,
            records.length -
            1
          )
        ];


      if (
        !target
      ) {

        continue;

      }


      try {

        target.scrollIntoView({

          behavior:
            "auto",

          block:
            "center",

          inline:
            "nearest"

        });

      } catch (error) {

      }


      await sleep(
        100
      );

    }


    await sleep(
      250
    );

  }


  function sleep(
    milliseconds
  ) {

    return new Promise(
      function (resolve) {

        setTimeout(
          resolve,
          milliseconds
        );

      }
    );

  }


  function createSignature(
    element
  ) {

    const classes =
      Array.from(
        element.classList ||
        []
      )
        .filter(
          function (className) {

            return (
              className.length <=
                80 &&
              !/\d{6,}/
                .test(
                  className
                )
            );

          }
        )
        .sort()
        .slice(
          0,
          6
        )
        .join(
          "."
        );


    return (
      element.tagName
        .toLowerCase() +
      "|" +
      classes
    );

  }

}


/*
  ------------------------------------------------
  RAW TABLE EXTRACTION
  ------------------------------------------------
*/


function extractRawTable(
  tableIndex
) {

  const tables =
    Array.from(
      document.querySelectorAll(
        "table"
      )
    )
      .filter(
        function (table) {

          try {

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

          } catch (error) {

            return false;

          }

        }
      );


  const table =
    tables[
      tableIndex
    ];


  if (
    !table
  ) {

    return [];

  }


  const rows =
    [];


  table
    .querySelectorAll(
      "tr"
    )
    .forEach(
      function (row) {

        const values =
          Array.from(
            row.querySelectorAll(
              "th, td"
            )
          )
            .map(
              function (cell) {

                return String(
                  cell.innerText ||
                  ""
                )
                  .replace(
                    /\s+/g,
                    " "
                  )
                  .trim();

              }
            );


        if (
          values.length >
          0
        ) {

          rows.push(
            values
          );

        }

      }
    );


  return rows;

}


/*
  ------------------------------------------------
  POPUP UI
  ------------------------------------------------
*/


function populateTables(
  tables
) {

  tableSelect.innerHTML =
    "";


  if (
    tables.length === 0
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      "";

    option.textContent =
      "No visible HTML tables detected";


    tableSelect.appendChild(
      option
    );


    extractTableBtn.disabled =
      true;


    return;

  }


  extractTableBtn.disabled =
    false;


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
        index;


      option.textContent =

        "Table " +
        (index + 1) +
        " · " +
        table.rows +
        " rows · " +
        table.columns +
        " columns";


      tableSelect.appendChild(
        option
      );

    }
  );

}


function populateGroups(
  groups
) {

  groupSelect.innerHTML =
    "";


  if (
    groups.length === 0
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      "";

    option.textContent =
      "No visible repeated groups detected";


    groupSelect.appendChild(
      option
    );


    extractGroupBtn.disabled =
      true;


    updateGroupHint();


    return;

  }


  extractGroupBtn.disabled =
    false;


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
        index;


      option.textContent =

        "Group " +
        (index + 1) +
        " · " +
        group.likelyType +
        " · " +
        group.count +
        " items";


      groupSelect.appendChild(
        option
      );

    }
  );


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


  if (
    !group
  ) {

    groupHintTitle.textContent =
      "No repeated group selected";


    groupHintText.textContent =
      "Scan a page containing repeated records, products, movies, jobs, articles, cards, or listings.";


    return;

  }


  groupHintTitle.textContent =

    group.likelyType +
    " · " +
    group.count +
    " repeated items";


  groupHintText.textContent =

    "Images/item: " +
    group.averageImages +
    " · Links/item: " +
    group.averageLinks +
    " · Avg text: " +
    group.averageTextLength +
    " chars · Example: " +
    (
      group.sample ||
      "No text preview"
    );

}


function setSourceTab(
  type
) {

  if (
    type === "table"
  ) {

    tableTab.classList.add(
      "active"
    );


    groupTab.classList.remove(
      "active"
    );


    tablePanel.classList.remove(
      "hidden"
    );


    groupPanel.classList.add(
      "hidden"
    );

  } else {

    groupTab.classList.add(
      "active"
    );


    tableTab.classList.remove(
      "active"
    );


    groupPanel.classList.remove(
      "hidden"
    );


    tablePanel.classList.add(
      "hidden"
    );

  }

}


function resetExtractionOutput() {

  extractedData =
    [];


  currentExtractionType =
    "";


  previewTableContainer.innerHTML =
    "";


  hideSection(
    previewSection
  );


  hideSection(
    exportSection
  );

}


function showRawPreview(
  data,
  title
) {

  previewTableContainer.innerHTML =
    "";


  previewEmpty.classList.add(
    "hidden"
  );


  previewEyebrow.textContent =
    "DATA PREVIEW";


  previewTitle.textContent =
    title;


  rowCount.textContent =
    formatNumber(
      Math.max(
        0,
        data.length -
        1
      )
    );


  const table =
    document.createElement(
      "table"
    );


  const preview =
    data.slice(
      0,
      15
    );


  preview.forEach(
    function (
      row,
      rowIndex
    ) {

      const tr =
        document.createElement(
          "tr"
        );


      row.forEach(
        function (value) {

          const cell =
            document.createElement(

              rowIndex ===
              0
                ? "th"
                : "td"

            );


          let text =
            String(
              value ??
              ""
            );


          if (
            text.length >
            400
          ) {

            text =
              text.slice(
                0,
                400
              ) +
              "…";

          }


          cell.textContent =
            text;


          tr.appendChild(
            cell
          );

        }
      );


      table.appendChild(
        tr
      );

    }
  );


  previewTableContainer.appendChild(
    table
  );


  showSection(
    previewSection
  );


  showSection(
    exportSection
  );

}


/*
  ------------------------------------------------
  EXPORT
  ------------------------------------------------
*/


function convertToCSV(
  data
) {

  return data
    .map(
      function (row) {

        return row
          .map(
            function (value) {

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
          )
          .join(
            ","
          );

      }
    )
    .join(
      "\r\n"
    );

}


function convertRowsToObjects(
  data
) {

  if (
    !data ||
    data.length <
      2
  ) {

    return [];

  }


  const headers =
    data[0];


  return data
    .slice(
      1
    )
    .map(
      function (row) {

        const record =
          {};


        headers.forEach(
          function (
            header,
            index
          ) {

            record[
              header
            ] =
              row[index] ??
              "";

          }
        );


        return record;

      }
    );

}


function convertToExcelHTML(
  data
) {

  let tableHTML =
    "<table>";


  data.forEach(
    function (
      row,
      rowIndex
    ) {

      tableHTML +=
        "<tr>";


      row.forEach(
        function (value) {

          const tag =
            rowIndex === 0
              ? "th"
              : "td";


          tableHTML +=

            "<" +
            tag +
            ">" +

            escapeHTML(
              value
            ) +

            "</" +
            tag +
            ">";

        }
      );


      tableHTML +=
        "</tr>";

    }
  );


  tableHTML +=
    "</table>";


  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body>
${tableHTML}
</body>
</html>`;

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


function buildFileName(
  extension
) {

  const host =
    sanitizeFileName(
      currentPageInfo.hostname ||
      "website"
    );


  const source =
    sanitizeFileName(
      currentExtractionType ||
      "data"
    );


  return (

    "sankalan-" +
    host +
    "-" +
    source +
    "-" +
    createTimestamp() +
    "." +
    extension

  );

}


function sanitizeFileName(
  value
) {

  return String(
    value
  )
    .replace(
      /^www\./i,
      ""
    )
    .replace(
      /[^a-zA-Z0-9.-]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/
    )
    .toLowerCase();

}


function createTimestamp() {

  const date =
    new Date();


  const pad =
    function (number) {

      return String(
        number
      ).padStart(
        2,
        "0"
      );

    };


  return (

    date.getFullYear() +
    "-" +
    pad(
      date.getMonth() +
      1
    ) +
    "-" +
    pad(
      date.getDate()
    ) +
    "_" +
    pad(
      date.getHours()
    ) +
    "-" +
    pad(
      date.getMinutes()
    ) +
    "-" +
    pad(
      date.getSeconds()
    )

  );

}


function downloadRawFile(
  content,
  fileName,
  mimeType
) {

  return new Promise(
    function (
      resolve,
      reject
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


      chrome.downloads.download(
        {

          url:
            url,

          filename:
            fileName,

          saveAs:
            true

        },

        function (
          downloadId
        ) {

          if (
            chrome.runtime.lastError
          ) {

            URL.revokeObjectURL(
              url
            );


            reject(
              new Error(
                chrome.runtime
                  .lastError
                  .message
              )
            );


            return;

          }


          setTimeout(
            function () {

              URL.revokeObjectURL(
                url
              );

            },
            3000
          );


          resolve(
            downloadId
          );

        }
      );

    }
  );

}


function hasExtractedData() {

  if (
    !extractedData ||
    extractedData.length <
      2
  ) {

    showStatus(

      "error",

      "Nothing to export",

      "Extract a dataset first."

    );


    return false;

  }


  return true;

}


/*
  ------------------------------------------------
  LOADING / STATUS
  ------------------------------------------------
*/


function setScanLoading(
  loading
) {

  scanBtn.disabled =
    loading;


  scanBtnText.textContent =
    loading
      ? "Scanning..."
      : "Scan Current Page";


  scanSpinner.classList.toggle(
    "hidden",
    !loading
  );

}


function setTableExtractLoading(
  loading
) {

  extractTableBtn.disabled =
    loading;


  extractTableBtnText.textContent =
    loading
      ? "Extracting..."
      : "Extract Raw Table";


  extractTableSpinner.classList.toggle(
    "hidden",
    !loading
  );

}


function setGroupExtractLoading(
  loading
) {

  extractGroupBtn.disabled =
    loading;


  extractGroupBtnText.textContent =
    loading
      ? "Discovering Fields..."
      : "Extract Item Fields";


  extractGroupSpinner.classList.toggle(
    "hidden",
    !loading
  );

}


function setExportLoading(
  loading,
  message = ""
) {

  csvBtn.disabled =
    loading;


  jsonBtn.disabled =
    loading;


  excelBtn.disabled =
    loading;


  if (
    loading
  ) {

    exportProgressText.textContent =
      message;


    exportProgress.classList.remove(
      "hidden"
    );

  } else {

    exportProgress.classList.add(
      "hidden"
    );

  }

}


function showStatus(
  type,
  title,
  message
) {

  statusBox.className =

    "status-box " +
    type +
    " fade-in";


  statusIcon.textContent =

    type === "success"
      ? "✓"
      : type === "error"
        ? "!"
        : "•";


  statusTitle.textContent =
    title;


  statusMessage.textContent =
    message;


  statusBox.classList.remove(
    "hidden"
  );

}


function showSection(
  section
) {

  section.classList.remove(
    "hidden"
  );


  section.classList.remove(
    "fade-in"
  );


  void section.offsetWidth;


  section.classList.add(
    "fade-in"
  );

}


function hideSection(
  section
) {

  section.classList.add(
    "hidden"
  );

}


function formatNumber(
  value
) {

  return Number(
    value ||
    0
  ).toLocaleString();

}