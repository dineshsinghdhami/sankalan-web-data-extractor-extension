(function () {

  globalThis.Sankalan =
    globalThis.Sankalan || {};

  globalThis.Sankalan.fieldDiscovery = {
    discover: discoverFields
  };


  function discoverFields(items) {

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return [];
    }


    const recordMaps =
      items.map(function (item) {
        return buildRecordMap(item);
      });


    const fieldMap =
      new Map();


    recordMaps.forEach(function (recordMap, recordIndex) {

      recordMap.forEach(function (nodeInfo, path) {

        if (!fieldMap.has(path)) {

          fieldMap.set(
            path,
            {
              path: path,
              occurrences: 0,
              values: [],
              valuesByRecord: new Map(),
              nodeTypes: new Set(),
              tagNames: new Set(),
              classes: new Set(),
              attributes: new Map(),
              examples: []
            }
          );

        }


        const field =
          fieldMap.get(path);


        field.occurrences++;


        field.nodeTypes.add(
          nodeInfo.type
        );


        field.tagNames.add(
          nodeInfo.tagName
        );


        nodeInfo.classes.forEach(function (className) {

          field.classes.add(
            className
          );

        });


        nodeInfo.attributes.forEach(function (value, name) {

          if (!field.attributes.has(name)) {

            field.attributes.set(
              name,
              new Set()
            );

          }


          field.attributes
            .get(name)
            .add(value);

        });


        const normalized =
          normalizeValue(
            nodeInfo.value
          );


        field.values.push({
          recordIndex: recordIndex,
          value: normalized,
          type: nodeInfo.type
        });


        field.valuesByRecord.set(
          recordIndex,
          normalized
        );


        if (
          normalized &&
          field.examples.length < 6
        ) {

          field.examples.push(
            normalized
          );

        }

      });

    });


    const totalRecords =
      items.length;


    let candidates =
      [];


    fieldMap.forEach(function (field) {

      const presenceRatio =
        field.occurrences /
        totalRecords;


      if (
        presenceRatio < 0.15
      ) {
        return;
      }


      const values =
        field.values
          .map(function (entry) {
            return normalizeValue(
              entry.value
            );
          })
          .filter(function (value) {
            return value !== "";
          });


      if (
        values.length === 0
      ) {
        return;
      }


      const uniqueValues =
        new Set(values);


      const variationRatio =
        uniqueValues.size /
        values.length;


      const semanticType =
        inferSemanticType(
          values,
          field
        );


      const name =
        inferFieldName(
          field,
          semanticType,
          values
        );


      candidates.push({

        id:
          createFieldId(
            field.path
          ),

        name:
          name,

        path:
          field.path,

        type:
          semanticType,

        presence:
          Math.round(
            presenceRatio * 100
          ),

        score:
          calculateFieldScore(
            field,
            presenceRatio,
            variationRatio,
            semanticType,
            name
          ),

        examples:
          Array.from(
            uniqueValues
          ).slice(0, 3),

        _valuesByRecord:
          field.valuesByRecord

      });

    });


    candidates =
      removeAggregateParentFields(
        candidates,
        totalRecords
      );


    candidates =
      removeEquivalentFields(
        candidates
      );


    /*
      ================================================
      DYNAMIC NON-TEXT SEMANTIC FIELDS
      ================================================

      Rating is NOT permanently added.

      We inspect the repeated records first.

      If enough records genuinely expose a rating
      through text, attributes, classes, stars,
      structured metadata, etc., Rating becomes
      a discovered field.
    */


    const ratingField =
      discoverRatingField(
        items
      );


    if (ratingField) {

      const alreadyHasRating =
        candidates.some(function (field) {

          return (
            normalizeFieldName(
              field.name
            ) === "rating"
          );

        });


      if (!alreadyHasRating) {

        candidates.push(
          ratingField
        );

      }

    }


    candidates.sort(
      compareFieldsForExport
    );


    return candidates.map(function (field) {

      return {

        id:
          field.id,

        name:
          field.name,

        path:
          field.path,

        type:
          field.type,

        presence:
          field.presence,

        score:
          field.score,

        examples:
          field.examples

      };

    });

  }


  /*
    ==================================================
    DYNAMIC RATING DISCOVERY
    ==================================================
  */


  function discoverRatingField(
    items
  ) {

    const values =
      [];


    let found =
      0;


    items.forEach(function (item) {

      const rating =
        extractSemanticRating(
          item
        );


      values.push(
        rating
      );


      if (
        rating !== ""
      ) {
        found++;
      }

    });


    const ratio =
      found /
      items.length;


    /*
      Optional fields are allowed.

      15% lets us preserve ratings when only some
      cards have ratings/reviews yet.
    */

    if (
      ratio < 0.15
    ) {
      return null;
    }


    const examples =
      values
        .filter(Boolean)
        .slice(0, 3);


    return {

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
          ratio * 100
        ),

      score:
        220,

      examples:
        examples

    };

  }


  function extractSemanticRating(
    item
  ) {

    /*
      1. schema.org / structured rating
    */

    const structured =
      item.querySelector(
        "[itemprop='ratingValue']"
      );


    if (structured) {

      const value =
        firstNumber(
          structured.getAttribute(
            "content"
          ) ||
          structured.getAttribute(
            "value"
          ) ||
          structured.textContent
        );


      if (
        isReasonableRating(
          value
        )
      ) {
        return formatNumber(
          value
        );
      }

    }


    /*
      2. Explicit rating attributes
    */

    const attributeElements =
      item.querySelectorAll(
        [
          "[data-rating]",
          "[data-rating-value]",
          "[data-score]",
          "[data-stars]",
          "[data-star-rating]",
          "[aria-valuenow]",
          "[aria-label]",
          "[title]"
        ].join(",")
      );


    for (
      const element
      of attributeElements
    ) {

      const descriptor =
        buildElementDescriptor(
          element
        );


      const attributes = [

        "data-rating",
        "data-rating-value",
        "data-score",
        "data-stars",
        "data-star-rating"

      ];


      for (
        const attribute
        of attributes
      ) {

        const raw =
          element.getAttribute(
            attribute
          );


        if (!raw) {
          continue;
        }


        const number =
          firstNumber(raw);


        if (
          /rating|score|star/i
            .test(descriptor) &&
          isReasonableRating(
            number
          )
        ) {

          return formatNumber(
            number
          );

        }

      }


      const ariaValue =
        element.getAttribute(
          "aria-valuenow"
        );


      if (
        ariaValue &&
        /rating|score|star/i
          .test(descriptor)
      ) {

        const number =
          firstNumber(
            ariaValue
          );


        if (
          isReasonableRating(
            number
          )
        ) {

          return formatNumber(
            number
          );

        }

      }


      const label =
        (
          element.getAttribute(
            "aria-label"
          ) ||
          element.getAttribute(
            "title"
          ) ||
          ""
        );


      const textual =
        extractRatingFromText(
          label
        );


      if (
        textual !== ""
      ) {
        return textual;
      }

    }


    /*
      3. Class-based star rating.

      Example:

      star-rating Three
      star-rating One
      star-rating Five

      This is generic:
      we only interpret number words when the
      same class descriptor clearly represents
      a rating/star component.
    */

    const ratingElements =
      item.querySelectorAll(
        "[class*='rating' i], [class*='star' i], [class*='score' i], [class*='rate' i]"
      );


    const wordValues = {

      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5

    };


    for (
      const element
      of ratingElements
    ) {

      const descriptor =
        buildElementDescriptor(
          element
        )
          .toLowerCase();


      if (
        !/rating|stars?|score|rate/
          .test(descriptor)
      ) {
        continue;
      }


      for (
        const [word, number]
        of Object.entries(
          wordValues
        )
      ) {

        const pattern =
          new RegExp(
            "(?:^|[\\s_-])" +
            word +
            "(?:$|[\\s_-])",
            "i"
          );


        if (
          pattern.test(
            descriptor
          )
        ) {

          return String(
            number
          );

        }

      }


      const numericClassPatterns = [

        /(?:rating|score|stars?)[-_ ]([0-9]+(?:\.[0-9]+)?)/i,

        /(?:rating|score|stars?)[-_ ]?([0-9]+(?:\.[0-9]+)?)$/i

      ];


      for (
        const pattern
        of numericClassPatterns
      ) {

        const match =
          descriptor.match(
            pattern
          );


        if (!match) {
          continue;
        }


        const number =
          Number(
            match[1]
          );


        if (
          isReasonableRating(
            number
          )
        ) {

          return formatNumber(
            number
          );

        }

      }

    }


    /*
      4. Unicode stars.
    */

    const textNodes =
      item.querySelectorAll(
        "span, p, div, small"
      );


    for (
      const element
      of textNodes
    ) {

      const text =
        normalizeValue(
          element.textContent
        );


      const starMatch =
        text.match(
          /[★☆]{3,10}/
        );


      if (
        starMatch
      ) {

        const group =
          starMatch[0];


        const filled =
          (
            group.match(/★/g) ||
            []
          ).length;


        if (
          filled > 0
        ) {

          return String(
            filled
          );

        }

      }


      const textual =
        extractRatingFromText(
          text
        );


      if (
        textual !== ""
      ) {
        return textual;
      }

    }


    /*
      5. CSS percentage overlay.

      Useful for many visual star widgets.
      Example:
      width: 86%

      Interpreted as a five-star component
      only when rating/star semantics exist.
    */

    for (
      const element
      of ratingElements
    ) {

      const descriptor =
        buildElementDescriptor(
          element
        );


      if (
        !/rating|star|score|rate/i
          .test(descriptor)
      ) {
        continue;
      }


      const style =
        element.getAttribute(
          "style"
        ) || "";


      const match =
        style.match(
          /(?:width|max-width)\s*:\s*(\d+(?:\.\d+)?)%/i
        );


      if (
        match
      ) {

        const percentage =
          Number(
            match[1]
          );


        if (
          percentage > 0 &&
          percentage <= 100
        ) {

          return formatNumber(
            percentage / 20
          );

        }

      }

    }


    return "";

  }


  function extractRatingFromText(
    value
  ) {

    const text =
      normalizeValue(
        value
      );


    if (
      !text ||
      text.length > 120
    ) {
      return "";
    }


    const patterns = [

      /(?:rating|rated|score)\s*[:\-]?\s*([0-9]+(?:\.\d+)?)/i,

      /([0-9]+(?:\.\d+)?)\s*out\s+of\s*(?:5|10|100)/i,

      /([0-9]+(?:\.\d+)?)\s*\/\s*(?:5|10|100)/i,

      /([0-9]+(?:\.\d+)?)\s*stars?\b/i,

      /([0-9]+(?:\.\d+)?)\s*★/i

    ];


    for (
      const pattern
      of patterns
    ) {

      const match =
        text.match(
          pattern
        );


      if (!match) {
        continue;
      }


      const number =
        Number(
          match[1]
        );


      if (
        isReasonableRating(
          number
        )
      ) {

        return formatNumber(
          number
        );

      }

    }


    return "";

  }


  function buildElementDescriptor(
    element
  ) {

    return [

      getClassName(
        element
      ),

      element.id,

      element.getAttribute(
        "itemprop"
      ),

      element.getAttribute(
        "aria-label"
      ),

      element.getAttribute(
        "title"
      ),

      element.getAttribute(
        "data-rating"
      ),

      element.getAttribute(
        "data-score"
      ),

      element.getAttribute(
        "data-stars"
      )

    ]
      .filter(Boolean)
      .join(" ");

  }


  function getClassName(
    element
  ) {

    if (
      typeof element.className ===
      "string"
    ) {

      return element.className;

    }


    if (
      element.className &&
      element.className.baseVal
    ) {

      return element.className.baseVal;

    }


    return (
      element.getAttribute(
        "class"
      ) ||
      ""
    );

  }


  function firstNumber(
    value
  ) {

    const match =
      String(
        value ||
        ""
      )
        .match(
          /-?\d+(?:\.\d+)?/
        );


    if (!match) {
      return NaN;
    }


    return Number(
      match[0]
    );

  }


  function isReasonableRating(
    value
  ) {

    const number =
      Number(value);


    return (
      Number.isFinite(number) &&
      number >= 0 &&
      number <= 100
    );

  }


  function formatNumber(
    value
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {
      return "";
    }


    return String(
      Math.round(
        number * 100
      ) / 100
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


    const counters =
      {};


    children.forEach(function (child) {

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


      counters[tag] =
        (
          counters[tag] ||
          0
        ) + 1;


      const part =
        buildRelativePathPart(
          child,
          counters[tag]
        );


      const path =
        parentPath
          ? (
              parentPath +
              " > " +
              part
            )
          : part;


      inspectElement(
        child,
        path,
        map
      );


      walkChildren(
        child,
        path,
        map,
        depth + 1
      );

    });

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
      path || ":self",
      {

        value:
          selected.value,

        type:
          selected.type,

        tagName:
          element.tagName
            .toLowerCase(),

        classes:
          Array.from(
            element.classList ||
            []
          ),

        attributes:
          collectUsefulAttributes(
            element
          )

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
        value: title,
        type: "title"
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
        value: aria,
        type: "aria"
      };

    }


    if (visible) {

      return {
        value: visible,
        type: "text"
      };

    }


    if (title) {

      return {
        value: title,
        type: "title"
      };

    }


    if (aria) {

      return {
        value: aria,
        type: "aria"
      };

    }


    if (content) {

      return {
        value: content,
        type: "content"
      };

    }


    if (value) {

      return {
        value: value,
        type: "value"
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


    const shortVisible =
      normalizeComparable(
        visible
          .replace(/\.\.\.+$/g, "")
          .replace(/…+$/g, "")
      );


    if (
      shortVisible.length >= 3 &&
      candidateNormalized.startsWith(
        shortVisible
      )
    ) {
      return true;
    }


    return (
      shortVisible.length >= 4 &&
      candidateNormalized.includes(
        shortVisible
      )
    );

  }


  /*
    ==================================================
    LINKS / IMAGES
    ==================================================
  */


  function addLinkFields(
    item,
    map
  ) {

    const links = [];


    if (
      item.matches(
        "a[href]"
      )
    ) {
      links.push(item);
    }


    item
      .querySelectorAll(
        "a[href]"
      )
      .forEach(function (link) {
        links.push(link);
      });


    const seen =
      new Set();


    let index = 0;


    for (
      const link
      of links
    ) {

      const href =
        normalizeURL(
          link.href ||
          link.getAttribute(
            "href"
          )
        );


      if (
        !href ||
        seen.has(href)
      ) {
        continue;
      }


      seen.add(href);


      map.set(
        "@link:" + index,
        {
          value: href,
          type: "url",
          tagName: "a",
          classes: [],
          attributes:
            new Map()
        }
      );


      index++;


      if (
        index >= 5
      ) {
        break;
      }

    }

  }


  function addImageFields(
    item,
    map
  ) {

    const images = [];


    if (
      item.matches("img")
    ) {
      images.push(item);
    }


    item
      .querySelectorAll("img")
      .forEach(function (image) {
        images.push(image);
      });


    const seen =
      new Set();


    let index = 0;


    for (
      const image
      of images
    ) {

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
          "src"
        ),

        image.currentSrc

      ];


      let chosen = "";


      for (
        const candidate
        of candidates
      ) {

        const url =
          normalizeURL(
            candidate
          );


        if (
          url &&
          !seen.has(url)
        ) {

          chosen = url;
          break;

        }

      }


      if (!chosen) {
        continue;
      }


      seen.add(chosen);


      map.set(
        "@image:" + index,
        {
          value: chosen,
          type: "image",
          tagName: "img",
          classes: [],
          attributes:
            new Map()
        }
      );


      index++;


      if (
        index >= 5
      ) {
        break;
      }

    }

  }


  /*
    ==================================================
    SEMANTIC TYPE + NAME
    ==================================================
  */


  function inferSemanticType(
    values,
    field
  ) {

    if (
      field.path.startsWith(
        "@image:"
      )
    ) {
      return "image";
    }


    if (
      field.path.startsWith(
        "@link:"
      )
    ) {
      return "url";
    }


    const sample =
      values.slice(0, 40);


    const count = {
      currency: 0,
      savings: 0,
      discount: 0,
      sold: 0,
      reviews: 0,
      location: 0,
      availability: 0,
      action: 0,
      year: 0,
      duration: 0,
      certificate: 0,
      percentage: 0,
      number: 0
    };


    sample.forEach(function (value) {

      if (
        containsCurrency(value)
      ) {
        count.currency++;
      }


      if (
        /\b(?:save|saving|savings)\b/i
          .test(value) &&
        containsCurrency(value)
      ) {
        count.savings++;
      }


      if (
        /\d+(?:\.\d+)?\s*%\s*off/i
          .test(value)
      ) {
        count.discount++;
      }


      if (
        /^[\d,.]+\+?\s*sold$/i
          .test(value)
      ) {
        count.sold++;
      }


      if (
        /^\(\s*[\d,.]+[KkMm]?\s*\)$/
          .test(value)
      ) {
        count.reviews++;
      }


      if (
        isLocationLike(value)
      ) {
        count.location++;
      }


      if (
        /^(?:in stock|out of stock|available|unavailable|sold out|pre-order|preorder)$/i
          .test(value)
      ) {
        count.availability++;
      }


      if (
        /^(?:add to cart|add to basket|buy now|shop now|view details|read more|watch now|book now)$/i
          .test(value)
      ) {
        count.action++;
      }


      if (
        /^(?:18|19|20|21)\d{2}$/
          .test(value)
      ) {
        count.year++;
      }


      if (
        /^\d+\s*h(?:\s*\d+\s*m)?$/i
          .test(value)
      ) {
        count.duration++;
      }


      if (
        isCertificateLike(value)
      ) {
        count.certificate++;
      }


      if (
        /^-?\d+(?:\.\d+)?\s*%/
          .test(value)
      ) {
        count.percentage++;
      }


      if (
        /^-?\d+(?:[,.]\d+)*$/
          .test(value)
      ) {
        count.number++;
      }

    });


    const total =
      sample.length;


    if (
      ratio(
        count.savings,
        total
      ) >= 0.5
    ) {
      return "savings";
    }


    if (
      ratio(
        count.discount,
        total
      ) >= 0.5
    ) {
      return "discount";
    }


    if (
      ratio(
        count.sold,
        total
      ) >= 0.5
    ) {
      return "sold";
    }


    if (
      ratio(
        count.availability,
        total
      ) >= 0.5
    ) {
      return "availability";
    }


    if (
      ratio(
        count.action,
        total
      ) >= 0.5
    ) {
      return "action";
    }


    if (
      ratio(
        count.year,
        total
      ) >= 0.75
    ) {
      return "year";
    }


    if (
      ratio(
        count.duration,
        total
      ) >= 0.5
    ) {
      return "duration";
    }


    if (
      ratio(
        count.certificate,
        total
      ) >= 0.6
    ) {
      return "certificate";
    }


    if (
      ratio(
        count.location,
        total
      ) >= 0.5
    ) {
      return "location";
    }


    if (
      ratio(
        count.reviews,
        total
      ) >= 0.6
    ) {
      return "count";
    }


    if (
      ratio(
        count.currency,
        total
      ) >= 0.6
    ) {
      return "currency";
    }


    if (
      ratio(
        count.percentage,
        total
      ) >= 0.6
    ) {
      return "percentage";
    }


    if (
      ratio(
        count.number,
        total
      ) >= 0.75
    ) {
      return "number";
    }


    return "text";

  }


  function inferFieldName(
    field,
    semanticType,
    values
  ) {

    if (
      field.path.startsWith(
        "@link:"
      )
    ) {

      const index =
        Number(
          field.path.split(":")[1]
        );


      return index === 0
        ? "Link"
        : "Link " + (index + 1);

    }


    if (
      field.path.startsWith(
        "@image:"
      )
    ) {

      const index =
        Number(
          field.path.split(":")[1]
        );


      return index === 0
        ? "Image URL"
        : "Image URL " + (index + 1);

    }


    const descriptor =
      getFieldDescriptor(
        field
      );


    if (
      semanticType === "savings"
    ) {
      return "Savings";
    }


    if (
      semanticType === "discount"
    ) {
      return "Discount";
    }


    if (
      semanticType === "sold"
    ) {
      return "Sold";
    }


    if (
      semanticType === "availability"
    ) {
      return "Availability";
    }


    if (
      semanticType === "action"
    ) {
      return "Action";
    }


    if (
      semanticType === "year"
    ) {
      return "Year";
    }


    if (
      semanticType === "duration"
    ) {
      return "Runtime";
    }


    if (
      semanticType === "certificate"
    ) {
      return "Certificate";
    }


    if (
      semanticType === "location"
    ) {
      return "Location";
    }


    if (
      semanticType === "currency"
    ) {
      return "Price";
    }


    if (
      semanticType === "count" &&
      /review|rating|star|rate/i
        .test(descriptor)
    ) {
      return "Reviews";
    }


    if (
      Array.from(
        field.tagNames
      ).some(function (tag) {

        return /^h[1-6]$/
          .test(tag);

      })
    ) {
      return "Title";
    }


    const semanticName =
      inferNameFromDescriptor(
        descriptor
      );


    if (semanticName) {
      return semanticName;
    }


    if (
      field.tagNames.has("a") &&
      valuesLookLikeTitles(
        values
      )
    ) {
      return "Title";
    }


    if (
      semanticType === "text" &&
      valuesLookLikeTitles(
        values
      )
    ) {
      return "Title";
    }


    if (
      semanticType === "number"
    ) {
      return "Number";
    }


    return "Field";

  }


  function inferNameFromDescriptor(
    descriptor
  ) {

    const mappings = [

      [/product[-_ ]?(?:title|name)/i, "Product Title"],

      [/movie[-_ ]?(?:title|name)/i, "Movie Title"],

      [/book[-_ ]?(?:title|name)/i, "Book Title"],

      [/job[-_ ]?(?:title|name)/i, "Job Title"],

      [/(?:^|[\s_.-])title(?:$|[\s_.-])/i, "Title"],

      [/(?:^|[\s_.-])name(?:$|[\s_.-])/i, "Name"],

      [/discount/i, "Discount"],

      [/\bsold\b/i, "Sold"],

      [/review/i, "Reviews"],

      [/availability|instock|in-stock|stock-status/i, "Availability"],

      [/location|province|region|city|district|state/i, "Location"],

      [/brand/i, "Brand"],

      [/category|genre/i, "Category"],

      [/runtime|duration/i, "Runtime"],

      [/certificate|content-rating|age-rating/i, "Certificate"],

      [/\byear\b/i, "Year"],

      [/delivery|shipping/i, "Delivery"],

      [/price/i, "Price"]

    ];


    for (
      const [regex, name]
      of mappings
    ) {

      if (
        regex.test(
          descriptor
        )
      ) {
        return name;
      }

    }


    return "";

  }


  /*
    ==================================================
    ORDER
    ==================================================
  */


  function compareFieldsForExport(
    a,
    b
  ) {

    const first =
      getExportPriority(a);


    const second =
      getExportPriority(b);


    if (
      first !== second
    ) {
      return first - second;
    }


    return (
      b.score -
      a.score
    );

  }


  function getExportPriority(
    field
  ) {

    const name =
      normalizeFieldName(
        field.name
      );


    if (
      /^(?:product title|movie title|book title|job title|title|name)$/
        .test(name)
    ) {
      return 0;
    }


    if (
      name === "price"
    ) {
      return 10;
    }


    if (
      name === "rating"
    ) {
      return 15;
    }


    if (
      /^(?:discount|savings|reviews|sold|year|runtime|certificate|category|brand|availability|location|delivery|date|status|number)$/
        .test(name)
    ) {
      return 20;
    }


    if (
      name === "action"
    ) {
      return 60;
    }


    if (
      field.type === "url"
    ) {
      return 90;
    }


    if (
      field.type === "image"
    ) {
      return 100;
    }


    return 40;

  }


  /*
    ==================================================
    DUPLICATE CLEANUP
    ==================================================
  */


  function removeAggregateParentFields(
    fields,
    totalRecords
  ) {

    return fields.filter(function (field) {

      if (
        field.path.startsWith("@")
      ) {
        return true;
      }


      const children =
        fields.filter(function (candidate) {

          return (
            candidate !== field &&
            isDescendantPath(
              field.path,
              candidate.path
            ) &&
            !candidate.path.startsWith("@")
          );

        });


      if (
        children.length < 2
      ) {
        return true;
      }


      let checked = 0;
      let matches = 0;


      for (
        let index = 0;
        index < totalRecords;
        index++
      ) {

        const parent =
          normalizeComparable(
            field
              ._valuesByRecord
              .get(index)
          );


        if (
          parent.length < 10
        ) {
          continue;
        }


        checked++;


        let contained = 0;


        children.forEach(function (child) {

          const value =
            normalizeComparable(
              child
                ._valuesByRecord
                .get(index)
            );


          if (
            value &&
            value !== parent &&
            parent.includes(value)
          ) {
            contained++;
          }

        });


        if (
          contained >= 2
        ) {
          matches++;
        }

      }


      if (
        checked === 0
      ) {
        return true;
      }


      return (
        matches /
        checked
      ) < 0.6;

    });

  }


  function removeEquivalentFields(
    fields
  ) {

    const output = [];


    const sorted =
      [...fields]
        .sort(function (a, b) {

          return (
            fieldQualityScore(b) -
            fieldQualityScore(a)
          );

        });


    for (
      const field
      of sorted
    ) {

      const duplicate =
        output.some(function (existing) {

          return (
            fieldEqualityRatio(
              field,
              existing
            ) >= 0.85
          );

        });


      if (!duplicate) {
        output.push(field);
      }

    }


    return output;

  }


  function fieldEqualityRatio(
    first,
    second
  ) {

    const indexes =
      new Set([

        ...first
          ._valuesByRecord
          .keys(),

        ...second
          ._valuesByRecord
          .keys()

      ]);


    let compared = 0;
    let equal = 0;


    indexes.forEach(function (index) {

      const a =
        normalizeComparable(
          first
            ._valuesByRecord
            .get(index)
        );


      const b =
        normalizeComparable(
          second
            ._valuesByRecord
            .get(index)
        );


      if (
        !a ||
        !b
      ) {
        return;
      }


      compared++;


      if (
        a === b
      ) {
        equal++;
      }

    });


    return compared
      ? equal / compared
      : 0;

  }


  function fieldQualityScore(
    field
  ) {

    return (
      Number(
        field.score || 0
      ) +
      (
        field.name !== "Field"
          ? 30
          : 0
      ) +
      pathDepth(
        field.path
      ) * 2
    );

  }


  function calculateFieldScore(
    field,
    presence,
    variation,
    type,
    name
  ) {

    let score =
      presence * 100;


    score +=
      Math.min(
        variation,
        1
      ) * 25;


    if (
      type !== "text"
    ) {
      score += 30;
    }


    if (
      name !== "Field"
    ) {
      score += 25;
    }


    if (
      field.path.startsWith("@")
    ) {
      score += 40;
    }


    return Math.round(
      score
    );

  }


  /*
    ==================================================
    GENERAL HELPERS
    ==================================================
  */


  function shouldIgnoreElement(
    element
  ) {

    return new Set([

      "script",
      "style",
      "noscript",
      "template",
      "meta",
      "link",
      "head",
      "svg",
      "path"

    ])
      .has(
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
        .filter(function (child) {

          return !shouldIgnoreElement(
            child
          );

        });


    return (
      children.length <= 5
    );

  }


  function getOwnUsefulText(
    element
  ) {

    let text = "";


    element.childNodes.forEach(function (node) {

      if (
        node.nodeType ===
        Node.TEXT_NODE
      ) {

        text +=
          " " +
          node.textContent;

      }

    });


    text =
      normalizeValue(text);


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


  function collectUsefulAttributes(
    element
  ) {

    const map =
      new Map();


    [

      "itemprop",
      "name",
      "aria-label",
      "title",
      "data-field",
      "data-name",
      "data-label",
      "role",
      "data-testid"

    ]
      .forEach(function (attribute) {

        const value =
          element.getAttribute(
            attribute
          );


        if (value) {

          map.set(
            attribute,
            value
          );

        }

      });


    return map;

  }


  function buildRelativePathPart(
    element,
    index
  ) {

    let part =
      element.tagName
        .toLowerCase();


    Array.from(
      element.classList ||
      []
    )
      .filter(function (name) {

        return (
          name.length <= 60 &&
          !/\d{5,}/
            .test(name)
        );

      })
      .slice(0, 3)
      .forEach(function (name) {

        part +=
          "." +
          name.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

      });


    return (
      part +
      ":nth-of-type(" +
      index +
      ")"
    );

  }


  function getFieldDescriptor(
    field
  ) {

    const parts = [
      field.path
    ];


    field.classes.forEach(function (value) {
      parts.push(value);
    });


    field.attributes.forEach(function (values, name) {

      parts.push(name);


      values.forEach(function (value) {
        parts.push(value);
      });

    });


    return parts
      .join(" ")
      .toLowerCase();

  }


  function valuesLookLikeTitles(
    values
  ) {

    const sample =
      values.slice(0, 30);


    if (
      sample.length < 2
    ) {
      return false;
    }


    const usable =
      sample.filter(function (value) {

        return (
          value.length >= 3 &&
          value.length <= 300 &&
          !containsCurrency(value) &&
          !/^-?\d+(?:[,.]\d+)*$/
            .test(value) &&
          !/^(?:in stock|out of stock|add to basket|add to cart|buy now)$/i
            .test(value)
        );

      });


    return (
      usable.length /
      sample.length >= 0.75
    );

  }


  function containsCurrency(
    value
  ) {

    return /(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)\s*\d/i
      .test(value);

  }


  function isLocationLike(
    value
  ) {

    return (
      /\b(?:province|district|state|region|municipality|city|county)\b/i
        .test(value) ||
      /^(?:overseas|international|local)$/i
        .test(value)
    );

  }


  function isCertificateLike(
    value
  ) {

    return /^(?:G|PG|PG-13|R|NC-17|TV-Y|TV-Y7|TV-G|TV-PG|TV-14|TV-MA|U|UA|U\/A|A|12A|15|18)$/i
      .test(value);
  }


  function isDescendantPath(
    parent,
    child
  ) {

    if (
      parent === ":self"
    ) {

      return (
        child !== ":self" &&
        !child.startsWith("@")
      );

    }


    return child.startsWith(
      parent + " > "
    );

  }


  function pathDepth(
    path
  ) {

    return path.startsWith("@")
      ? 1
      : path.split(" > ").length;

  }


  function normalizeFieldName(
    value
  ) {

    return String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+\d+$/,
        ""
      );

  }


  function normalizeValue(
    value
  ) {

    return String(
      value ?? ""
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
      .toLowerCase();

  }


  function normalizeURL(
    value
  ) {

    if (!value) {
      return "";
    }


    if (
      /^data:|^blob:|^javascript:/i
        .test(value)
    ) {
      return "";
    }


    try {

      const url =
        new URL(
          value,
          window.location.href
        ).href;


      return /^https?:\/\//i
        .test(url)
        ? url
        : "";

    } catch (error) {

      return "";

    }

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
      /\bwindow\./,
      /\bdocument\./,
      /\bconst\s+/,
      /\blet\s+/,
      /\bvar\s+/

    ];


    return (
      patterns.filter(function (pattern) {

        return pattern.test(
          value
        );

      }).length >= 2
    );

  }


  function ratio(
    value,
    total
  ) {

    return total
      ? value / total
      : 0;

  }


  function createFieldId(
    path
  ) {

    let hash = 0;


    for (
      let i = 0;
      i < path.length;
      i++
    ) {

      hash =
        (
          (
            hash << 5
          ) -
          hash
        ) +
        path.charCodeAt(i);


      hash |= 0;

    }


    return (
      "field_" +
      Math.abs(hash)
    );

  }

})();