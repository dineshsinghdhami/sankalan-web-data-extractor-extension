(function () {

  globalThis.Sankalan =
    globalThis.Sankalan || {};


  globalThis.Sankalan.recordExtractor = {

    extract:
      extractRecords

  };


  function extractRecords(
    items,
    fields
  ) {

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return {
        headers: [],
        rows: []
      };

    }


    if (
      !Array.isArray(fields) ||
      fields.length === 0
    ) {

      return {
        headers: [],
        rows: []
      };

    }


    const headers =
      makeUniqueHeaders(
        fields
      );


    const rows =
      items.map(
        function (item) {

          const recordMap =
            buildRecordMap(
              item
            );


          return fields.map(
            function (field) {

              return extractFieldValue(
                field,
                recordMap,
                item
              );

            }
          );

        }
      );


    return {

      headers:
        headers,

      rows:
        rows

    };

  }


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


        tagCounters[tag] =
          (
            tagCounters[tag] ||
            0
          ) + 1;


        const childPath =
          buildRelativePathPart(
            child,
            tagCounters[tag]
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
          depth + 1
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


    const text =
      getOwnUsefulText(
        element
      );


    const aria =
      element.getAttribute(
        "aria-label"
      );


    const title =
      element.getAttribute(
        "title"
      );


    const valueAttribute =
      element.getAttribute(
        "value"
      );


    const content =
      element.getAttribute(
        "content"
      );


    const candidateValues = [

      {
        value:
          text,

        type:
          "text"
      },

      {
        value:
          aria,

        type:
          "aria"
      },

      {
        value:
          title,

        type:
          "title"
      },

      {
        value:
          valueAttribute,

        type:
          "value"
      },

      {
        value:
          content,

        type:
          "content"
      }

    ];


    let selected =
      null;


    for (
      const candidate
      of candidateValues
    ) {

      const normalized =
        normalizeValue(
          candidate.value
        );


      if (
        normalized === ""
      ) {

        continue;

      }


      if (
        isLikelyCode(
          normalized
        )
      ) {

        continue;

      }


      selected = {

        value:
          normalized,

        type:
          candidate.type

      };


      break;

    }


    if (!selected) {

      return;

    }


    const finalPath =
      path ||
      ":self";


    map.set(
      finalPath,
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


    /*
      Fallback:
      some dynamic sites slightly alter
      classes or wrappers between cards.

      Try to resolve a similar path.
    */

    const similar =
      findSimilarPathValue(
        field.path,
        recordMap
      );


    if (
      similar !== ""
    ) {

      return similar;

    }


    return "";

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
      first.split(" > ");

    const secondParts =
      second.split(" > ");


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
        firstParts[i] ===
        secondParts[i]
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


  function extractLinkByIndex(
    item,
    path
  ) {

    const index =
      Number(
        path.split(":")[1]
      );


    const links =
      collectLinks(
        item
      );


    return (
      links[index] ||
      ""
    );

  }


  function extractImageByIndex(
    item,
    path
  ) {

    const index =
      Number(
        path.split(":")[1]
      );


    const images =
      collectImages(
        item
      );


    return (
      images[index] ||
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


        if (
          !href ||
          seen.has(
            href
          )
        ) {

          return;

        }


        seen.add(
          href
        );


        unique.push(
          href
        );

      }
    );


    return unique
      .slice(
        0,
        5
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


    return urls
      .slice(
        0,
        5
      );

  }


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
          base === "" ||
          /^field$/i
            .test(
              base
            )
        ) {

          base =
            "Field " +
            (index + 1);

        }


        const count =
          used.get(
            base
          ) ||
          0;


        used.set(
          base,
          count + 1
        );


        if (
          count === 0
        ) {

          return base;

        }


        return (
          base +
          " " +
          (count + 1)
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


    if (
      children.length > 4
    ) {

      return false;

    }


    return true;

  }


  function getOwnUsefulText(
    element
  ) {

    let text =
      "";


    element.childNodes.forEach(
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


    if (
      text === "" &&
      element.children.length <= 1
    ) {

      text =
        normalizeValue(
          element.innerText
        );

    }


    return text;

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


    if (
      !/^https?:\/\//i
        .test(
          url
        )
    ) {

      return "";

    }


    return url;

  }


  function isLikelyCode(
    value
  ) {

    if (
      value.length >
      1000
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