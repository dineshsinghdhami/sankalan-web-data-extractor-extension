(function () {

  globalThis.Sankalan =
    globalThis.Sankalan || {};


  globalThis.Sankalan.recordExtractor = {
    extract: extractRecords
  };


  function extractRecords(
    items,
    fields
  ) {

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      !Array.isArray(fields) ||
      fields.length === 0
    ) {

      return {
        headers: [],
        rows: []
      };

    }


    let selectedFields =
      selectBestSemanticFields(
        fields
      );


    selectedFields =
      removeRatingDuplicateNumberFields(
        items,
        selectedFields
      );


    let headers =
      makeUniqueHeaders(
        selectedFields
      );


    let rows =
      items.map(
        function (item) {

          const recordMap =
            buildRecordMap(
              item
            );


          return selectedFields.map(
            function (field) {

              let rawValue;


              if (
                normalizeFieldName(
                  field.name
                ) === "rating" &&
                globalThis.Sankalan
                  ?.ratingExtractor
              ) {

                try {

                  rawValue =
                    globalThis.Sankalan
                      .ratingExtractor
                      .extract(
                        item
                      )
                      ?.rating ||
                    "";

                } catch (error) {

                  rawValue =
                    "";

                }

              } else if (
                normalizeFieldName(
                  field.name
                ) === "reviews" &&
                globalThis.Sankalan
                  ?.ratingExtractor
              ) {

                try {

                  rawValue =
                    globalThis.Sankalan
                      .ratingExtractor
                      .extract(
                        item
                      )
                      ?.reviews ||
                    "";

                } catch (error) {

                  rawValue =
                    "";

                }

              } else {

                rawValue =
                  extractFieldValue(
                    field,
                    recordMap,
                    item
                  );

              }


              return validateSemanticValue(
                field,
                rawValue
              );

            }
          );

        }
      );


    /*
      Remove fields that are completely empty
      across every extracted record.

      Example:
      Link 2 may be discovered structurally,
      but after URL deduplication every row may
      contain an empty value.

      Such a column should not be exported.
    */

    const cleaned =
      removeCompletelyEmptyColumns(
        headers,
        rows
      );


    headers =
      cleaned.headers;


    rows =
      cleaned.rows;


    return {
      headers: headers,
      rows: rows
    };

  }


  /*
    ==================================================
    REMOVE EMPTY COLUMNS
    ==================================================
  */


  function removeCompletelyEmptyColumns(
    headers,
    rows
  ) {

    if (
      !Array.isArray(headers) ||
      headers.length === 0
    ) {

      return {
        headers: [],
        rows: rows || []
      };

    }


    const keepIndexes =
      [];


    headers.forEach(
      function (
        header,
        columnIndex
      ) {

        const hasAnyValue =
          rows.some(
            function (row) {

              return (
                normalizeValue(
                  row[
                    columnIndex
                  ]
                ) !== ""
              );

            }
          );


        if (
          hasAnyValue
        ) {

          keepIndexes.push(
            columnIndex
          );

        }

      }
    );


    return {

      headers:
        keepIndexes.map(
          function (index) {

            return headers[
              index
            ];

          }
        ),

      rows:
        rows.map(
          function (row) {

            return keepIndexes.map(
              function (index) {

                return row[
                  index
                ] ?? "";

              }
            );

          }
        )

    };

  }


  /*
    ==================================================
    REMOVE GENERIC NUMBER IF IT DUPLICATES RATING
    ==================================================
  */


  function removeRatingDuplicateNumberFields(
    items,
    fields
  ) {

    if (
      !globalThis.Sankalan
        ?.ratingExtractor
    ) {
      return fields;
    }


    const ratingValues =
      items.map(
        function (item) {

          try {

            return normalizeNumeric(
              globalThis.Sankalan
                .ratingExtractor
                .extract(
                  item
                )
                ?.rating
            );

          } catch (error) {

            return "";

          }

        }
      );


    const usableRatings =
      ratingValues
        .filter(Boolean)
        .length;


    if (
      usableRatings <
      Math.max(
        2,
        Math.ceil(
          items.length *
          0.15
        )
      )
    ) {
      return fields;
    }


    return fields.filter(
      function (field) {

        if (
          normalizeFieldName(
            field.name
          ) !== "number"
        ) {
          return true;
        }


        let compared =
          0;

        let equal =
          0;


        for (
          let index = 0;
          index < items.length;
          index++
        ) {

          const rating =
            ratingValues[
              index
            ];


          if (!rating) {
            continue;
          }


          const recordMap =
            buildRecordMap(
              items[
                index
              ]
            );


          const value =
            normalizeNumeric(
              extractFieldValue(
                field,
                recordMap,
                items[
                  index
                ]
              )
            );


          if (!value) {
            continue;
          }


          compared++;


          if (
            value === rating
          ) {
            equal++;
          }

        }


        if (
          compared < 2
        ) {
          return true;
        }


        return (
          equal /
          compared
        ) < 0.75;

      }
    );

  }


  /*
    ==================================================
    SEMANTIC VALUE VALIDATION
    ==================================================
  */


  function validateSemanticValue(
    field,
    value
  ) {

    let text =
      normalizeValue(
        value
      );


    if (!text) {
      return "";
    }


    const name =
      normalizeFieldName(
        field.name
      );


    if (
      isIdentityFieldName(
        name
      )
    ) {

      return cleanIdentityValue(
        text
      );

    }


    if (
      name === "discount"
    ) {

      return isValidDiscount(
        text
      )
        ? text
        : "";

    }


    if (
      name === "savings"
    ) {

      return isValidSavings(
        text
      )
        ? text
        : "";

    }


    if (
      name === "sold"
    ) {

      return /^[\d,.]+(?:[KkMm])?\+?\s*sold$/i
        .test(text)
        ? text
        : "";

    }


    if (
      name === "reviews"
    ) {

      if (
        /^\(\s*[\d,.]+(?:\.\d+)?[KkMm]?\s*\)$/
          .test(text) ||
        /^[\d,.]+(?:\.\d+)?[KkMm]?\s*(?:reviews?|ratings?|votes?)$/i
          .test(text) ||
        /^[\d,.]+(?:\.\d+)?[KkMm]?$/
          .test(text)
      ) {
        return text;
      }


      return "";

    }


    if (
      name === "rating"
    ) {

      const number =
        Number(
          text
        );


      if (
        Number.isFinite(number) &&
        number >= 0 &&
        number <= 10
      ) {
        return text;
      }


      return "";

    }


    if (
      name === "availability"
    ) {

      return /^(?:in stock|out of stock|available|unavailable|sold out|pre-order|preorder)$/i
        .test(text)
        ? text
        : "";

    }


    if (
      name === "action"
    ) {

      return /^(?:add to cart|add to basket|buy now|shop now|view details|read more|watch now|book now)$/i
        .test(text)
        ? text
        : "";

    }


    if (
      name === "price" ||
      name === "current price" ||
      name === "original price"
    ) {

      if (
        isStandaloneCurrency(
          text
        )
      ) {
        return "";
      }


      return isValidPrice(
        text
      )
        ? text
        : "";

    }


    if (
      name === "certificate"
    ) {

      if (
        /^(?:18|19|20|21)\d{2}$/
          .test(text)
      ) {
        return "";
      }


      return text;

    }


    return text;

  }


  /*
    ==================================================
    IDENTITY NORMALIZATION
    ==================================================
  */


  function cleanIdentityValue(
    value
  ) {

    let text =
      normalizeValue(
        value
      );


    const prefixPatterns = [

      /^see\s+more\s+information\s+about\s+/i,

      /^more\s+information\s+about\s+/i,

      /^view\s+(?:more\s+)?(?:information|details)\s+(?:about|for)\s+/i,

      /^view\s+details\s+(?:about|for)\s+/i,

      /^open\s+(?:details\s+)?(?:about|for)\s+/i,

      /^read\s+more\s+about\s+/i,

      /*
        IMDb-style accessibility label:

        View title page for The Shawshank Redemption
        → The Shawshank Redemption

        This is generic because it is based on
        language structure, not hostname/classes.
      */

      /^view\s+title\s+page\s+for\s+/i,

      /^open\s+title\s+page\s+for\s+/i,

      /^go\s+to\s+title\s+page\s+for\s+/i

    ];


    for (
      const pattern
      of prefixPatterns
    ) {

      text =
        text.replace(
          pattern,
          ""
        );

    }


    let match =
      text.match(
        /^mark\s+(.+?)\s+as\s+(?:watched|read|seen|favorite|favourite|saved)$/i
      );


    if (match) {

      text =
        match[
          1
        ];

    }


    match =
      text.match(
        /^(?:add|save)\s+(.+?)\s+to\s+(?:watchlist|wishlist|favorites|favourites|list)$/i
      );


    if (match) {

      text =
        match[
          1
        ];

    }


    return normalizeValue(
      text
    );

  }


  function isIdentityFieldName(
    name
  ) {

    return /^(?:title|name|product title|product name|movie title|movie name|book title|book name|job title)$/
      .test(name);

  }


  /*
    ==================================================
    FIELD VALIDATORS
    ==================================================
  */


  function isValidDiscount(
    value
  ) {

    const text =
      normalizeValue(
        value
      );


    if (
      isStandaloneCurrency(
        text
      )
    ) {
      return false;
    }


    return (
      /^-?\s*\d+(?:\.\d+)?\s*%$/i
        .test(text) ||
      /^-?\s*\d+(?:\.\d+)?\s*%\s*off$/i
        .test(text)
    );

  }


  function isValidSavings(
    value
  ) {

    const text =
      normalizeValue(
        value
      );


    if (
      isStandaloneCurrency(
        text
      )
    ) {
      return false;
    }


    return (
      /\b(?:save|saving|savings)\b/i
        .test(text) &&
      (
        /(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)\s*\d/i
          .test(text) ||
        /\d[\d,.]*\s*(?:npr|rs\.?|usd|eur|inr|gbp)/i
          .test(text)
      )
    );

  }


  function isStandaloneCurrency(
    value
  ) {

    return /^(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)$/i
      .test(
        normalizeValue(
          value
        )
      );

  }


  function isValidPrice(
    value
  ) {

    const text =
      normalizeValue(
        value
      );


    if (
      isStandaloneCurrency(
        text
      )
    ) {
      return false;
    }


    return (
      /^(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)?\s*\d[\d,.]*(?:\.\d+)?$/i
        .test(text) ||
      /^\d[\d,.]*(?:\.\d+)?\s*(?:npr|rs\.?|usd|eur|inr|gbp)$/i
        .test(text)
    );

  }


  /*
    ==================================================
    SEMANTIC FIELD MERGING
    ==================================================
  */


  function selectBestSemanticFields(
    fields
  ) {

    const groups =
      new Map();


    fields.forEach(
      function (field) {

        const key =
          semanticFieldKey(
            field
          );


        if (
          isTechnicalField(
            field
          )
        ) {

          groups.set(
            "__unique__" +
            field.path,
            [
              field
            ]
          );


          return;

        }


        if (
          !groups.has(
            key
          )
        ) {

          groups.set(
            key,
            []
          );

        }


        groups
          .get(
            key
          )
          .push(
            field
          );

      }
    );


    const selected =
      [];


    groups.forEach(
      function (group) {

        if (
          group.length === 1
        ) {

          selected.push(
            group[
              0
            ]
          );

          return;

        }


        const name =
          normalizeFieldName(
            group[
              0
            ].name
          );


        if (
          !isStrongSemanticName(
            name
          ) &&
          !isIdentityFieldName(
            name
          )
        ) {

          group.forEach(
            function (field) {

              selected.push(
                field
              );

            }
          );


          return;

        }


        const winner =
          [...group]
            .sort(
              function (
                a,
                b
              ) {

                return (
                  calculateSemanticQuality(
                    b
                  ) -
                  calculateSemanticQuality(
                    a
                  )
                );

              }
            )[
              0
            ];


        selected.push(
          winner
        );

      }
    );


    selected.sort(
      function (
        a,
        b
      ) {

        return (
          fields.indexOf(
            a
          ) -
          fields.indexOf(
            b
          )
        );

      }
    );


    return selected;

  }


  function semanticFieldKey(
    field
  ) {

    const name =
      normalizeFieldName(
        field.name
      );


    if (
      isIdentityFieldName(
        name
      )
    ) {

      return "__identity__";

    }


    return name;

  }


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


  function isStrongSemanticName(
    name
  ) {

    return new Set([

      "title",
      "name",

      "product title",
      "product name",

      "movie title",
      "movie name",

      "book title",
      "book name",

      "job title",

      "price",
      "current price",
      "original price",

      "discount",
      "savings",

      "rating",
      "reviews",

      "sold",

      "availability",

      "location",

      "brand",

      "category",

      "runtime",

      "certificate",

      "year",

      "date",

      "delivery",

      "author",

      "director",

      "company",

      "salary",

      "status",

      "action"

    ])
      .has(name);

  }


  function calculateSemanticQuality(
    field
  ) {

    let score =
      Number(
        field.score ||
        0
      );


    score +=
      Number(
        field.presence ||
        0
      ) *
      2;


    const fieldName =
      normalizeFieldName(
        field.name
      );


    if (
      /title$/
        .test(
          fieldName
        )
    ) {
      score +=
        40;
    }


    const examples =
      Array.isArray(
        field.examples
      )
        ? field.examples
        : [];


    if (
      examples.length === 0
    ) {
      return score;
    }


    let totalLength =
      0;

    let truncatedCount =
      0;

    let actionWrapperCount =
      0;

    let usefulCount =
      0;


    examples.forEach(
      function (value) {

        const text =
          normalizeValue(
            value
          );


        if (!text) {
          return;
        }


        totalLength +=
          cleanIdentityValue(
            text
          ).length;


        usefulCount++;


        if (
          containsTruncation(
            text
          )
        ) {

          truncatedCount++;

        }


        if (
          isAccessibilityActionLabel(
            text
          )
        ) {

          actionWrapperCount++;

        }

      }
    );


    if (
      usefulCount > 0
    ) {

      score +=
        Math.min(
          totalLength /
          usefulCount,
          300
        ) *
        2;


      score -=
        truncatedCount *
        150;


      score -=
        actionWrapperCount *
        25;

    }


    return score;

  }


  function isAccessibilityActionLabel(
    value
  ) {

    return (
      /^see\s+more\s+information\s+about\s+/i
        .test(value) ||

      /^mark\s+.+\s+as\s+(?:watched|read|seen|saved)/i
        .test(value) ||

      /^view\s+(?:more\s+)?(?:information|details)/i
        .test(value) ||

      /^view\s+title\s+page\s+for\s+/i
        .test(value)
    );

  }


  function containsTruncation(
    value
  ) {

    return (
      /\.\.\./
        .test(value) ||
      /…/
        .test(value)
    );

  }


  function isTechnicalField(
    field
  ) {

    return (

      field.type ===
        "url" ||

      field.type ===
        "image" ||

      /^link(?:\s+\d+)?$/i
        .test(
          field.name ||
          ""
        ) ||

      /^image url(?:\s+\d+)?$/i
        .test(
          field.name ||
          ""
        )

    );

  }


  /*
    ==================================================
    RECORD MAP
    ==================================================
  */


  function buildRecordMap(
    item
  ) {

    const map =
      new Map();


    inspectElement(
      item,
      "",
      map
    );


    walkChildren(
      item,
      "",
      map,
      0
    );


    addLinkFields(
      item,
      map
    );


    addImageFields(
      item,
      map
    );


    return map;

  }


  function walkChildren(
    parent,
    parentPath,
    map,
    depth
  ) {

    if (
      depth > 8
    ) {
      return;
    }


    const children =
      Array.from(
        parent.children
      );


    const tagCounters =
      {};


    children.forEach(
      function (child) {

        if (
          shouldIgnoreElement(
            child
          )
        ) {
          return;
        }


        const tag =
          child.tagName
            .toLowerCase();


        tagCounters[
          tag
        ] =
          (
            tagCounters[
              tag
            ] ||
            0
          ) +
          1;


        const childPath =
          buildRelativePathPart(
            child,
            tagCounters[
              tag
            ]
          );


        const fullPath =
          parentPath
            ? (
                parentPath +
                " > " +
                childPath
              )
            : childPath;


        inspectElement(
          child,
          fullPath,
          map
        );


        walkChildren(
          child,
          fullPath,
          map,
          depth +
          1
        );

      }
    );

  }


  function inspectElement(
    element,
    path,
    map
  ) {

    if (
      !isPotentialFieldElement(
        element
      )
    ) {
      return;
    }


    const selected =
      chooseBestElementValue(
        element
      );


    if (
      !selected ||
      isLikelyCode(
        selected.value
      )
    ) {
      return;
    }


    map.set(
      path ||
      ":self",
      {

        value:
          selected.value,

        type:
          selected.type,

        element:
          element

      }
    );

  }


  function chooseBestElementValue(
    element
  ) {

    const visible =
      normalizeValue(
        getOwnUsefulText(
          element
        )
      );


    const title =
      normalizeValue(
        element.getAttribute(
          "title"
        )
      );


    const aria =
      normalizeValue(
        element.getAttribute(
          "aria-label"
        )
      );


    const content =
      normalizeValue(
        element.getAttribute(
          "content"
        )
      );


    const value =
      normalizeValue(
        element.getAttribute(
          "value"
        )
      );


    if (
      title &&
      shouldPreferExpandedValue(
        title,
        visible
      )
    ) {

      return {
        value:
          title,
        type:
          "title"
      };

    }


    if (
      aria &&
      shouldPreferExpandedValue(
        aria,
        visible
      )
    ) {

      return {
        value:
          aria,
        type:
          "aria"
      };

    }


    if (visible) {

      return {
        value:
          visible,
        type:
          "text"
      };

    }


    if (title) {

      return {
        value:
          title,
        type:
          "title"
      };

    }


    if (aria) {

      return {
        value:
          aria,
        type:
          "aria"
      };

    }


    if (content) {

      return {
        value:
          content,
        type:
          "content"
      };

    }


    if (value) {

      return {
        value:
          value,
        type:
          "value"
      };

    }


    return null;

  }


  function shouldPreferExpandedValue(
    candidate,
    visible
  ) {

    if (!candidate) {
      return false;
    }


    if (!visible) {
      return true;
    }


    if (
      candidate === visible ||
      candidate.length <=
        visible.length
    ) {
      return false;
    }


    const candidateNormalized =
      normalizeComparable(
        candidate
      );


    if (
      visible.includes(
        "..."
      )
    ) {

      const prefix =
        normalizeComparable(
          visible.replace(
            /\.\.\.+$/g,
            ""
          )
        );


      if (
        prefix.length >= 3 &&
        candidateNormalized
          .startsWith(
            prefix
          )
      ) {
        return true;
      }

    }


    if (
      visible.includes(
        "…"
      )
    ) {

      const prefix =
        normalizeComparable(
          visible.replace(
            /…+$/g,
            ""
          )
        );


      if (
        prefix.length >= 3 &&
        candidateNormalized
          .startsWith(
            prefix
          )
      ) {
        return true;
      }

    }


    const visibleNormalized =
      normalizeComparable(
        visible
      );


    return (
      visibleNormalized.length >=
        4 &&
      candidateNormalized.includes(
        visibleNormalized
      )
    );

  }


  /*
    ==================================================
    FIELD EXTRACTION
    ==================================================
  */


  function extractFieldValue(
    field,
    recordMap,
    item
  ) {

    if (
      field.path.startsWith(
        "@link:"
      )
    ) {

      return extractLinkByIndex(
        item,
        field.path
      );

    }


    if (
      field.path.startsWith(
        "@image:"
      )
    ) {

      return extractImageByIndex(
        item,
        field.path
      );

    }


    if (
      field.path ===
      "@semantic:rating"
    ) {

      try {

        return (
          globalThis.Sankalan
            ?.ratingExtractor
            ?.extract(
              item
            )
            ?.rating ||
          ""
        );

      } catch (error) {

        return "";

      }

    }


    if (
      field.path ===
      "@semantic:reviews"
    ) {

      try {

        return (
          globalThis.Sankalan
            ?.ratingExtractor
            ?.extract(
              item
            )
            ?.reviews ||
          ""
        );

      } catch (error) {

        return "";

      }

    }


    const direct =
      recordMap.get(
        field.path
      );


    if (
      direct &&
      direct.value
    ) {

      return normalizeValue(
        direct.value
      );

    }


    return findSimilarPathValue(
      field.path,
      recordMap
    );

  }


  function findSimilarPathValue(
    targetPath,
    recordMap
  ) {

    const normalizedTarget =
      normalizePath(
        targetPath
      );


    let bestValue =
      "";

    let bestScore =
      0;


    recordMap.forEach(
      function (
        info,
        path
      ) {

        const normalizedCandidate =
          normalizePath(
            path
          );


        const score =
          comparePaths(
            normalizedTarget,
            normalizedCandidate
          );


        if (
          score > bestScore &&
          score >= 0.75
        ) {

          bestScore =
            score;


          bestValue =
            normalizeValue(
              info.value
            );

        }

      }
    );


    return bestValue;

  }


  function comparePaths(
    first,
    second
  ) {

    const firstParts =
      first.split(
        " > "
      );


    const secondParts =
      second.split(
        " > "
      );


    const maxLength =
      Math.max(
        firstParts.length,
        secondParts.length
      );


    if (
      maxLength === 0
    ) {
      return 0;
    }


    let matches =
      0;


    const minLength =
      Math.min(
        firstParts.length,
        secondParts.length
      );


    for (
      let i = 0;
      i < minLength;
      i++
    ) {

      if (
        firstParts[
          i
        ] ===
        secondParts[
          i
        ]
      ) {
        matches++;
      }

    }


    return (
      matches /
      maxLength
    );

  }


  function normalizePath(
    path
  ) {

    return String(
      path
    )
      .replace(
        /:nth-of-type\(\d+\)/g,
        ""
      )
      .replace(
        /\.[a-zA-Z0-9_-]+/g,
        function (match) {

          return match
            .toLowerCase();

        }
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  }


  /*
    ==================================================
    LINKS
    ==================================================
  */


  function addLinkFields(
    item,
    map
  ) {

    const links =
      collectLinks(
        item
      );


    links.forEach(
      function (
        href,
        index
      ) {

        map.set(
          "@link:" +
          index,
          {

            value:
              href,

            type:
              "url",

            element:
              null

          }
        );

      }
    );

  }


  function extractLinkByIndex(
    item,
    path
  ) {

    const index =
      Number(
        path.split(
          ":"
        )[
          1
        ]
      );


    const links =
      collectLinks(
        item
      );


    return (
      links[
        index
      ] ||
      ""
    );

  }


  function collectLinks(
    item
  ) {

    const links =
      [];


    if (
      item.matches(
        "a[href]"
      )
    ) {

      links.push(
        item
      );

    }


    item
      .querySelectorAll(
        "a[href]"
      )
      .forEach(
        function (link) {

          links.push(
            link
          );

        }
      );


    const unique =
      [];

    const seen =
      new Set();


    links.forEach(
      function (link) {

        const href =
          normalizeURL(
            link.href ||
            link.getAttribute(
              "href"
            )
          );


        if (!href) {
          return;
        }


        const comparisonKey =
          normalizeLinkForComparison(
            href
          );


        if (
          seen.has(
            comparisonKey
          )
        ) {
          return;
        }


        seen.add(
          comparisonKey
        );


        unique.push(
          href
        );

      }
    );


    return unique.slice(
      0,
      5
    );

  }


  function normalizeLinkForComparison(
    value
  ) {

    try {

      const url =
        new URL(
          value
        );


      const ignoredParams =
        new Set([

          "ref",
          "ref_",
          "referrer",

          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_term",
          "utm_content"

        ]);


      Array.from(
        url.searchParams.keys()
      )
        .forEach(
          function (key) {

            if (
              ignoredParams.has(
                key.toLowerCase()
              ) ||
              /^ref_/i
                .test(key)
            ) {

              url.searchParams.delete(
                key
              );

            }

          }
        );


      return (
        url.origin +
        url.pathname +
        (
          url.search
            ? url.search
            : ""
        )
      )
        .replace(
          /\/+$/,
          ""
        )
        .toLowerCase();

    } catch (error) {

      return String(
        value ||
        ""
      )
        .toLowerCase();

    }

  }


  /*
    ==================================================
    IMAGES
    ==================================================
  */


  function addImageFields(
    item,
    map
  ) {

    const images =
      collectImages(
        item
      );


    images.forEach(
      function (
        src,
        index
      ) {

        map.set(
          "@image:" +
          index,
          {

            value:
              src,

            type:
              "image",

            element:
              null

          }
        );

      }
    );

  }


  function extractImageByIndex(
    item,
    path
  ) {

    const index =
      Number(
        path.split(
          ":"
        )[
          1
        ]
      );


    const images =
      collectImages(
        item
      );


    return (
      images[
        index
      ] ||
      ""
    );

  }


  function collectImages(
    item
  ) {

    const images =
      [];


    if (
      item.matches(
        "img"
      )
    ) {

      images.push(
        item
      );

    }


    item
      .querySelectorAll(
        "img"
      )
      .forEach(
        function (image) {

          images.push(
            image
          );

        }
      );


    const urls =
      [];

    const seen =
      new Set();


    images.forEach(
      function (image) {

        const candidates = [

          image.getAttribute(
            "data-src"
          ),

          image.getAttribute(
            "data-original"
          ),

          image.getAttribute(
            "data-lazy-src"
          ),

          image.getAttribute(
            "data-ks-lazyload"
          ),

          image.getAttribute(
            "data-image"
          ),

          image.getAttribute(
            "src"
          ),

          image.currentSrc

        ];


        for (
          const candidate
          of candidates
        ) {

          const normalized =
            normalizeURL(
              candidate
            );


          if (
            normalized &&
            !seen.has(
              normalized
            )
          ) {

            seen.add(
              normalized
            );


            urls.push(
              normalized
            );


            break;

          }

        }

      }
    );


    return urls.slice(
      0,
      5
    );

  }


  /*
    ==================================================
    HEADERS
    ==================================================
  */


  function makeUniqueHeaders(
    fields
  ) {

    const used =
      new Map();


    return fields.map(
      function (
        field,
        index
      ) {

        let base =
          normalizeHeaderName(
            field.name
          );


        if (
          isIdentityFieldName(
            normalizeFieldName(
              base
            )
          )
        ) {

          base =
            "Title";

        }


        if (
          !base ||
          /^field$/i
            .test(
              base
            )
        ) {

          base =
            "Field " +
            (
              index +
              1
            );

        }


        const count =
          used.get(
            base
          ) ||
          0;


        used.set(
          base,
          count +
          1
        );


        if (
          count === 0
        ) {
          return base;
        }


        return (
          base +
          " " +
          (
            count +
            1
          )
        );

      }
    );

  }


  function normalizeHeaderName(
    value
  ) {

    return String(
      value ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  }


  /*
    ==================================================
    ELEMENTS
    ==================================================
  */


  function shouldIgnoreElement(
    element
  ) {

    const ignoredTags =
      new Set([

        "script",
        "style",
        "noscript",
        "template",
        "meta",
        "link",
        "head",
        "svg",
        "path"

      ]);


    return ignoredTags.has(
      element.tagName
        .toLowerCase()
    );

  }


  function isPotentialFieldElement(
    element
  ) {

    if (
      shouldIgnoreElement(
        element
      )
    ) {
      return false;
    }


    const children =
      Array.from(
        element.children
      )
        .filter(
          function (child) {

            return !shouldIgnoreElement(
              child
            );

          }
        );


    return (
      children.length <= 5
    );

  }


  function getOwnUsefulText(
    element
  ) {

    let text =
      "";


    element.childNodes
      .forEach(
        function (node) {

          if (
            node.nodeType ===
            Node.TEXT_NODE
          ) {

            text +=
              " " +
              node.textContent;

          }

        }
      );


    text =
      normalizeValue(
        text
      );


    if (text) {
      return text;
    }


    if (
      element.children.length <= 1
    ) {

      return normalizeValue(
        element.innerText
      );

    }


    return "";

  }


  function buildRelativePathPart(
    element,
    index
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
          function (className) {

            return (
              className.length <= 60 &&
              !/\d{5,}/
                .test(
                  className
                )
            );

          }
        )
        .slice(
          0,
          3
        );


    let part =
      tag;


    classes.forEach(
      function (className) {

        part +=
          "." +
          escapeClass(
            className
          );

      }
    );


    part +=
      ":nth-of-type(" +
      index +
      ")";


    return part;

  }


  function escapeClass(
    value
  ) {

    return String(
      value
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

  }


  /*
    ==================================================
    HELPERS
    ==================================================
  */


  function normalizeValue(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }


    return String(
      value
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


  function normalizeComparable(
    value
  ) {

    return normalizeValue(
      value
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );

  }


  function normalizeNumeric(
    value
  ) {

    const text =
      normalizeValue(
        value
      );


    if (
      !/^-?\d+(?:\.\d+)?$/
        .test(
          text
        )
    ) {
      return "";
    }


    const number =
      Number(
        text
      );


    if (
      !Number.isFinite(
        number
      )
    ) {
      return "";
    }


    return String(
      Math.round(
        number *
        100
      ) /
      100
    );

  }


  function normalizeURL(
    value
  ) {

    if (!value) {
      return "";
    }


    let url =
      String(
        value
      )
        .trim();


    if (
      /^data:|^blob:|^javascript:/i
        .test(
          url
        )
    ) {
      return "";
    }


    try {

      url =
        new URL(
          url,
          window.location.href
        ).href;

    } catch (error) {

      return "";

    }


    return /^https?:\/\//i
      .test(
        url
      )
      ? url
      : "";

  }


  function isLikelyCode(
    value
  ) {

    if (
      value.length > 1000
    ) {
      return true;
    }


    const patterns = [

      /function\s*\(/,
      /=>\s*{/,
      /window\.[a-zA-Z_$]/,
      /document\.[a-zA-Z_$]/,
      /var\s+[a-zA-Z_$]/,
      /const\s+[a-zA-Z_$]/,
      /let\s+[a-zA-Z_$]/,
      /\{\s*["'][a-zA-Z0-9_$-]+["']\s*:/

    ];


    const matches =
      patterns.filter(
        function (pattern) {

          return pattern.test(
            value
          );

        }
      ).length;


    return (
      matches >= 2
    );

  }

})();