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
      items.map(
        function (item) {

          return buildRecordMap(item);

        }
      );


    const fieldMap =
      new Map();


    recordMaps.forEach(
      function (
        recordMap,
        recordIndex
      ) {

        recordMap.forEach(
          function (
            nodeInfo,
            path
          ) {

            if (
              !fieldMap.has(path)
            ) {

              fieldMap.set(
                path,
                {
                  path: path,

                  occurrences: 0,

                  values: [],

                  valuesByRecord:
                    new Map(),

                  nodeTypes:
                    new Set(),

                  tagNames:
                    new Set(),

                  classes:
                    new Set(),

                  attributes:
                    new Map(),

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


            nodeInfo.classes.forEach(
              function (className) {

                field.classes.add(
                  className
                );

              }
            );


            nodeInfo.attributes.forEach(
              function (
                value,
                name
              ) {

                if (
                  !field.attributes.has(name)
                ) {

                  field.attributes.set(
                    name,
                    new Set()
                  );

                }


                field.attributes
                  .get(name)
                  .add(value);

              }
            );


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
              normalized !== "" &&
              field.examples.length < 6
            ) {

              field.examples.push(
                normalized
              );

            }

          }
        );

      }
    );


    const totalRecords =
      items.length;


    let candidates =
      [];


    fieldMap.forEach(
      function (field) {

        const presenceRatio =
          field.occurrences /
          totalRecords;


        /*
          Keep optional fields.

          Something appearing in only part
          of the records can still be useful:
          discount, badge, location,
          availability, review count, etc.
        */

        if (
          presenceRatio < 0.15
        ) {

          return;

        }


        const values =
          field.values
            .map(
              function (entry) {

                return normalizeValue(
                  entry.value
                );

              }
            )
            .filter(
              function (value) {

                return value !== "";

              }
            );


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


        const score =
          calculateFieldScore(
            field,
            presenceRatio,
            variationRatio,
            semanticType,
            name
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
            score,

          examples:
            Array.from(
              uniqueValues
            ).slice(
              0,
              3
            ),

          _valuesByRecord:
            field.valuesByRecord,

          _tagNames:
            field.tagNames

        });

      }
    );


    /*
      Remove parent/container values such as:

      Product name Rs.500 20% Off 8 sold

      when the child fields already contain:

      Product name
      Rs.500
      20% Off
      8 sold
    */

    candidates =
      removeAggregateParentFields(
        candidates,
        totalRecords
      );


    /*
      Remove fields that contain virtually
      the same value across records.
    */

    candidates =
      removeEquivalentFields(
        candidates
      );


    candidates.sort(
      function (a, b) {

        return (
          b.score -
          a.score
        );

      }
    );


    /*
      Internal metadata is needed only
      during discovery.

      Do not expose it to popup.js.
    */

    return candidates.map(
      function (field) {

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

      }
    );

  }


  /*
    ==================================================
    RECORD MAP
    ==================================================
  */


  function buildRecordMap(item) {

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
          shouldIgnoreElement(child)
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


        const part =
          buildRelativePathPart(
            child,
            tagCounters[tag]
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


    const candidateValues = [

      {
        value:
          getOwnUsefulText(
            element
          ),
        type:
          "text"
      },

      {
        value:
          element.getAttribute(
            "aria-label"
          ),
        type:
          "aria"
      },

      {
        value:
          element.getAttribute(
            "title"
          ),
        type:
          "title"
      },

      {
        value:
          element.getAttribute(
            "value"
          ),
        type:
          "value"
      },

      {
        value:
          element.getAttribute(
            "content"
          ),
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

      const value =
        normalizeValue(
          candidate.value
        );


      if (
        value === ""
      ) {

        continue;

      }


      if (
        isLikelyCode(value)
      ) {

        continue;

      }


      selected = {
        value: value,
        type: candidate.type
      };


      break;

    }


    if (
      !selected
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
      [];


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
      .forEach(
        function (link) {

          links.push(link);

        }
      );


    const seen =
      new Set();


    let index =
      0;


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
      [];


    if (
      item.matches(
        "img"
      )
    ) {

      images.push(item);

    }


    item
      .querySelectorAll(
        "img"
      )
      .forEach(
        function (image) {

          images.push(image);

        }
      );


    const seen =
      new Set();


    let index =
      0;


    for (
      const image
      of images
    ) {

      const values = [

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


      let chosen =
        "";


      for (
        const value
        of values
      ) {

        const url =
          normalizeURL(value);


        if (
          url &&
          !seen.has(url)
        ) {

          chosen =
            url;

          break;

        }

      }


      if (
        chosen === ""
      ) {

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
    SEMANTIC TYPE
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
      values.slice(
        0,
        40
      );


    const scores = {

      currency: 0,
      savings: 0,
      discount: 0,
      sold: 0,
      reviews: 0,
      rating: 0,
      location: 0,
      availability: 0,
      action: 0,
      year: 0,
      duration: 0,
      certificate: 0,
      percentage: 0,
      number: 0,
      date: 0,
      boolean: 0

    };


    sample.forEach(
      function (value) {

        if (
          containsCurrency(value)
        ) {

          scores.currency++;

        }


        if (
          /\b(?:save|saving|savings)\b/i
            .test(value) &&
          containsCurrency(value)
        ) {

          scores.savings++;

        }


        if (
          (
            /\b\d+(?:\.\d+)?\s*%\s*off\b/i
              .test(value)
          ) ||
          (
            /^-\s*\d+(?:\.\d+)?\s*%/
              .test(value)
          )
        ) {

          scores.discount++;

        }


        if (
          /^\s*[\d,.]+\+?\s*sold\s*$/i
            .test(value)
        ) {

          scores.sold++;

        }


        if (
          /^\(\s*[\d,.]+[KkMm]?\s*\)$/
            .test(value)
        ) {

          scores.reviews++;

        }


        if (
          /(?:rating|rated)\s*[:\-]?\s*[0-5](?:\.\d+)?/i
            .test(value) ||
          /^[0-5](?:\.\d+)?\s*\/\s*5$/
            .test(value)
        ) {

          scores.rating++;

        }


        if (
          isLocationLike(value)
        ) {

          scores.location++;

        }


        if (
          /^(?:in stock|out of stock|available|unavailable|sold out|pre-order|preorder)$/i
            .test(value)
        ) {

          scores.availability++;

        }


        if (
          /^(?:add to cart|add to basket|buy now|shop now|view details|read more|watch now|book now)$/i
            .test(value)
        ) {

          scores.action++;

        }


        if (
          /^(?:18|19|20|21)\d{2}$/
            .test(value)
        ) {

          scores.year++;

        }


        if (
          /^\d+\s*h(?:\s*\d+\s*m)?$/i
            .test(value) ||
          /^\d+\s*(?:min|mins|minutes)$/i
            .test(value)
        ) {

          scores.duration++;

        }


        if (
          isCertificateLike(value)
        ) {

          scores.certificate++;

        }


        if (
          /^-?\s*\d+(?:\.\d+)?\s*%/
            .test(value)
        ) {

          scores.percentage++;

        }


        if (
          /^-?\d+(?:[,.]\d+)*$/
            .test(value)
        ) {

          scores.number++;

        }


        if (
          /^\d{4}-\d{1,2}-\d{1,2}/
            .test(value) ||
          /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/
            .test(value)
        ) {

          scores.date++;

        }


        if (
          /^(?:yes|no|true|false)$/i
            .test(value)
        ) {

          scores.boolean++;

        }

      }
    );


    const total =
      sample.length;


    if (
      ratio(
        scores.savings,
        total
      ) >= 0.5
    ) {

      return "savings";

    }


    if (
      ratio(
        scores.discount,
        total
      ) >= 0.5
    ) {

      return "discount";

    }


    if (
      ratio(
        scores.sold,
        total
      ) >= 0.5
    ) {

      return "sold";

    }


    if (
      ratio(
        scores.availability,
        total
      ) >= 0.5
    ) {

      return "availability";

    }


    if (
      ratio(
        scores.action,
        total
      ) >= 0.5
    ) {

      return "action";

    }


    if (
      ratio(
        scores.year,
        total
      ) >= 0.75
    ) {

      return "year";

    }


    if (
      ratio(
        scores.duration,
        total
      ) >= 0.5
    ) {

      return "duration";

    }


    if (
      ratio(
        scores.certificate,
        total
      ) >= 0.6
    ) {

      return "certificate";

    }


    if (
      ratio(
        scores.location,
        total
      ) >= 0.5
    ) {

      return "location";

    }


    if (
      ratio(
        scores.rating,
        total
      ) >= 0.5
    ) {

      return "rating";

    }


    if (
      ratio(
        scores.reviews,
        total
      ) >= 0.6
    ) {

      return "count";

    }


    if (
      ratio(
        scores.currency,
        total
      ) >= 0.6
    ) {

      return "currency";

    }


    if (
      ratio(
        scores.date,
        total
      ) >= 0.6
    ) {

      return "date";

    }


    if (
      ratio(
        scores.percentage,
        total
      ) >= 0.6
    ) {

      return "percentage";

    }


    if (
      ratio(
        scores.boolean,
        total
      ) >= 0.7
    ) {

      return "boolean";

    }


    if (
      ratio(
        scores.number,
        total
      ) >= 0.75
    ) {

      return "number";

    }


    return "text";

  }


  /*
    ==================================================
    FIELD NAME
    ==================================================
  */


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
        : (
            "Link " +
            (index + 1)
          );

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
        : (
            "Image URL " +
            (index + 1)
          );

    }


    const descriptor =
      getFieldDescriptor(field);


    /*
      Strong content-based semantics
      come before random CSS class names.
    */


    if (
      semanticType ===
      "savings"
    ) {

      return "Savings";

    }


    if (
      semanticType ===
      "discount"
    ) {

      return "Discount";

    }


    if (
      semanticType ===
      "sold"
    ) {

      return "Sold";

    }


    if (
      semanticType ===
      "availability"
    ) {

      return "Availability";

    }


    if (
      semanticType ===
      "action"
    ) {

      return "Action";

    }


    if (
      semanticType ===
      "year"
    ) {

      return "Year";

    }


    if (
      semanticType ===
      "duration"
    ) {

      return "Runtime";

    }


    if (
      semanticType ===
      "certificate"
    ) {

      return "Certificate";

    }


    if (
      semanticType ===
      "location"
    ) {

      return "Location";

    }


    if (
      semanticType ===
      "rating"
    ) {

      return "Rating";

    }


    if (
      semanticType ===
      "currency"
    ) {

      if (
        /old|original|previous|list-price|regular-price|before/i
          .test(descriptor)
      ) {

        return "Original Price";

      }


      if (
        /sale|current|discounted|final|offer/i
          .test(descriptor)
      ) {

        return "Current Price";

      }


      return "Price";

    }


    if (
      semanticType ===
      "percentage"
    ) {

      return "Percentage";

    }


    if (
      semanticType ===
      "date"
    ) {

      return "Date";

    }


    /*
      Parenthesized counts.

      If the DOM itself suggests reviews
      or ratings, use Reviews.

      Otherwise remain generic as Count.
    */

    if (
      semanticType ===
      "count"
    ) {

      if (
        /review|rating|rate|star/i
          .test(descriptor)
      ) {

        return "Reviews";

      }


      return "Count";

    }


    /*
      Semantic attributes supplied directly
      by the website.
    */

    const semanticAttributes = [

      "itemprop",
      "data-field",
      "data-name",
      "data-label",
      "name"

    ];


    for (
      const attribute
      of semanticAttributes
    ) {

      const attributeValues =
        field.attributes.get(
          attribute
        );


      if (
        !attributeValues ||
        attributeValues.size === 0
      ) {

        continue;

      }


      const candidate =
        humanizeName(
          Array.from(
            attributeValues
          )[0]
        );


      if (
        isUsefulFieldName(
          candidate
        )
      ) {

        return normalizeSemanticName(
          candidate
        );

      }

    }


    /*
      ARIA label can contain a useful
      semantic label, but don't use the
      complete product value as a header.
    */

    const ariaValues =
      field.attributes.get(
        "aria-label"
      );


    if (
      ariaValues &&
      ariaValues.size === 1
    ) {

      const aria =
        Array.from(
          ariaValues
        )[0];


      if (
        aria.length <= 40
      ) {

        const candidate =
          humanizeName(
            aria
          );


        if (
          isUsefulFieldName(
            candidate
          )
        ) {

          return normalizeSemanticName(
            candidate
          );

        }

      }

    }


    /*
      Headings are usually a record title.
    */

    if (
      Array.from(
        field.tagNames
      ).some(
        function (tag) {

          return /^h[1-6]$/
            .test(tag);

        }
      )
    ) {

      return "Title";

    }


    /*
      Class / DOM semantic keywords.
    */

    const keywordName =
      inferNameFromDescriptor(
        descriptor
      );


    if (
      keywordName !== ""
    ) {

      return keywordName;

    }


    /*
      Anchor text with strong variation is
      frequently the record's main title:
      book title, movie title, article title,
      product title, job title, etc.
    */

    if (
      field.tagNames.has("a") &&
      valuesLookLikeTitles(values)
    ) {

      return "Title";

    }


    /*
      A highly variable textual field
      containing substantial text is often
      the record title even if the site uses
      meaningless generated class names.
    */

    if (
      semanticType === "text" &&
      valuesLookLikeTitles(values)
    ) {

      return "Title";

    }


    if (
      semanticType ===
      "number"
    ) {

      return "Number";

    }


    if (
      semanticType ===
      "boolean"
    ) {

      return "Status";

    }


    return "Field";

  }


  function inferNameFromDescriptor(
    descriptor
  ) {

    const tests = [

      {
        regex:
          /product[-_ ]?(?:title|name)|(?:title|name)[-_ ]?product/i,
        name:
          "Product Title"
      },

      {
        regex:
          /movie[-_ ]?(?:title|name)|film[-_ ]?(?:title|name)/i,
        name:
          "Movie Title"
      },

      {
        regex:
          /book[-_ ]?(?:title|name)/i,
        name:
          "Book Title"
      },

      {
        regex:
          /job[-_ ]?(?:title|name)/i,
        name:
          "Job Title"
      },

      {
        regex:
          /(?:^|[\s_.-])title(?:$|[\s_.-])/i,
        name:
          "Title"
      },

      {
        regex:
          /(?:^|[\s_.-])name(?:$|[\s_.-])/i,
        name:
          "Name"
      },

      {
        regex:
          /discount/i,
        name:
          "Discount"
      },

      {
        regex:
          /(?:^|[-_. ])sold(?:$|[-_. ])/i,
        name:
          "Sold"
      },

      {
        regex:
          /review/i,
        name:
          "Reviews"
      },

      {
        regex:
          /rating|stars?/i,
        name:
          "Rating"
      },

      {
        regex:
          /availability|instock|in-stock|stock-status/i,
        name:
          "Availability"
      },

      {
        regex:
          /location|province|region|city|district|state/i,
        name:
          "Location"
      },

      {
        regex:
          /brand/i,
        name:
          "Brand"
      },

      {
        regex:
          /category|genre/i,
        name:
          "Category"
      },

      {
        regex:
          /runtime|duration|length/i,
        name:
          "Runtime"
      },

      {
        regex:
          /certificate|content-rating|age-rating/i,
        name:
          "Certificate"
      },

      {
        regex:
          /year/i,
        name:
          "Year"
      },

      {
        regex:
          /author/i,
        name:
          "Author"
      },

      {
        regex:
          /director/i,
        name:
          "Director"
      },

      {
        regex:
          /company/i,
        name:
          "Company"
      },

      {
        regex:
          /salary/i,
        name:
          "Salary"
      },

      {
        regex:
          /delivery|shipping/i,
        name:
          "Delivery"
      },

      {
        regex:
          /badge/i,
        name:
          "Badge"
      },

      {
        regex:
          /description|summary/i,
        name:
          "Description"
      },

      {
        regex:
          /(?:price.*color|color.*price)/i,
        name:
          "Price"
      },

      {
        regex:
          /(?:^|[-_. ])price(?:$|[-_. ])/i,
        name:
          "Price"
      }

    ];


    for (
      const test
      of tests
    ) {

      if (
        test.regex.test(
          descriptor
        )
      ) {

        return test.name;

      }

    }


    return "";

  }


  /*
    ==================================================
    AGGREGATE FIELD REMOVAL
    ==================================================
  */


  function removeAggregateParentFields(
    fields,
    totalRecords
  ) {

    return fields.filter(
      function (field) {

        if (
          field.path.startsWith("@")
        ) {

          return true;

        }


        const children =
          fields.filter(
            function (candidate) {

              return (
                candidate !== field &&
                isDescendantPath(
                  field.path,
                  candidate.path
                ) &&
                !candidate.path.startsWith("@")
              );

            }
          );


        if (
          children.length < 2
        ) {

          return true;

        }


        let recordsChecked =
          0;

        let aggregateMatches =
          0;


        for (
          let recordIndex = 0;
          recordIndex < totalRecords;
          recordIndex++
        ) {

          const parentValue =
            normalizeComparable(
              field
                ._valuesByRecord
                .get(recordIndex)
            );


          if (
            parentValue.length < 10
          ) {

            continue;

          }


          recordsChecked++;


          let containedChildren =
            0;


          for (
            const child
            of children
          ) {

            const childValue =
              normalizeComparable(
                child
                  ._valuesByRecord
                  .get(recordIndex)
              );


            if (
              childValue.length < 2
            ) {

              continue;

            }


            if (
              childValue ===
              parentValue
            ) {

              continue;

            }


            if (
              parentValue.includes(
                childValue
              )
            ) {

              containedChildren++;

            }

          }


          if (
            containedChildren >= 2
          ) {

            aggregateMatches++;

          }

        }


        if (
          recordsChecked === 0
        ) {

          return true;

        }


        const ratio =
          aggregateMatches /
          recordsChecked;


        /*
          Parent is mostly just a concatenated
          representation of useful children.
        */

        return ratio < 0.6;

      }
    );

  }


  /*
    ==================================================
    DUPLICATE FIELD REMOVAL
    ==================================================
  */


  function removeEquivalentFields(
    fields
  ) {

    const sorted =
      [...fields]
        .sort(
          function (a, b) {

            return (
              fieldQualityScore(b) -
              fieldQualityScore(a)
            );

          }
        );


    const result =
      [];


    for (
      const field
      of sorted
    ) {

      let duplicate =
        false;


      for (
        const existing
        of result
      ) {

        const equality =
          fieldEqualityRatio(
            field,
            existing
          );


        if (
          equality >= 0.85
        ) {

          duplicate =
            true;

          break;

        }

      }


      if (
        !duplicate
      ) {

        result.push(field);

      }

    }


    return result;

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


    let comparable =
      0;

    let equal =
      0;


    indexes.forEach(
      function (index) {

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
          a === "" ||
          b === ""
        ) {

          return;

        }


        comparable++;


        if (
          a === b
        ) {

          equal++;

        }

      }
    );


    if (
      comparable === 0
    ) {

      return 0;

    }


    return (
      equal /
      comparable
    );

  }


  function fieldQualityScore(
    field
  ) {

    let score =
      field.score;


    if (
      field.path.startsWith("@link:")
    ) {

      score += 100;

    }


    if (
      field.path.startsWith("@image:")
    ) {

      score += 100;

    }


    if (
      field.name !== "Field" &&
      field.name !== "Number"
    ) {

      score += 30;

    }


    score +=
      pathDepth(
        field.path
      ) * 2;


    return score;

  }


  /*
    ==================================================
    SCORING
    ==================================================
  */


  function calculateFieldScore(
    field,
    presenceRatio,
    variationRatio,
    semanticType,
    name
  ) {

    let score =
      0;


    score +=
      presenceRatio *
      100;


    score +=
      Math.min(
        variationRatio,
        1
      ) *
      25;


    if (
      semanticType !==
      "text"
    ) {

      score += 30;

    }


    if (
      name !== "Field" &&
      name !== "Number"
    ) {

      score += 25;

    }


    if (
      field.path.startsWith(
        "@link:"
      ) ||
      field.path.startsWith(
        "@image:"
      )
    ) {

      score += 40;

    }


    if (
      field.tagNames.has("h1") ||
      field.tagNames.has("h2") ||
      field.tagNames.has("h3") ||
      field.tagNames.has("h4")
    ) {

      score += 30;

    }


    if (
      field.tagNames.has("a")
    ) {

      score += 10;

    }


    return Math.round(
      score
    );

  }


  /*
    ==================================================
    ELEMENT FILTERING
    ==================================================
  */


  function shouldIgnoreElement(
    element
  ) {

    const ignored =
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


    return ignored.has(
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


    /*
      Still allow small containers.

      Large parent containers are the main
      source of combined duplicate text.
    */

    if (
      children.length > 5
    ) {

      return false;

    }


    return true;

  }


  function getOwnUsefulText(
    element
  ) {

    let direct =
      "";


    element.childNodes.forEach(
      function (node) {

        if (
          node.nodeType ===
          Node.TEXT_NODE
        ) {

          direct +=
            " " +
            node.textContent;

        }

      }
    );


    direct =
      normalizeValue(
        direct
      );


    if (
      direct !== ""
    ) {

      return direct;

    }


    /*
      Near-leaf nodes can safely use their
      complete visible text.
    */

    if (
      element.children.length <= 1
    ) {

      return normalizeValue(
        element.innerText
      );

    }


    return "";

  }


  /*
    ==================================================
    ATTRIBUTES
    ==================================================
  */


  function collectUsefulAttributes(
    element
  ) {

    const result =
      new Map();


    const allowed = [

      "itemprop",
      "name",
      "aria-label",
      "data-field",
      "data-name",
      "data-label",
      "role",
      "data-testid",
      "data-test-id"

    ];


    allowed.forEach(
      function (attribute) {

        const value =
          element.getAttribute(
            attribute
          );


        if (
          value
        ) {

          result.set(
            attribute,
            value
          );

        }

      }
    );


    return result;

  }


  /*
    ==================================================
    PATH
    ==================================================
  */


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


    let result =
      tag;


    classes.forEach(
      function (className) {

        result +=
          "." +
          escapePathClass(
            className
          );

      }
    );


    result +=
      ":nth-of-type(" +
      index +
      ")";


    return result;

  }


  function escapePathClass(
    className
  ) {

    return String(
      className
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

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
      parent +
      " > "
    );

  }


  function pathDepth(
    path
  ) {

    if (
      path.startsWith("@")
    ) {

      return 1;

    }


    return path
      .split(" > ")
      .length;

  }


  /*
    ==================================================
    DESCRIPTORS / NAMING
    ==================================================
  */


  function getFieldDescriptor(
    field
  ) {

    const parts = [

      field.path

    ];


    field.classes.forEach(
      function (className) {

        parts.push(
          className
        );

      }
    );


    field.attributes.forEach(
      function (
        values,
        name
      ) {

        parts.push(
          name
        );


        values.forEach(
          function (value) {

            parts.push(
              value
            );

          }
        );

      }
    );


    return parts
      .join(" ")
      .toLowerCase();

  }


  function normalizeSemanticName(
    value
  ) {

    const lower =
      value.toLowerCase();


    if (
      /price/.test(lower)
    ) {

      return "Price";

    }


    if (
      /title|product name|movie name|book name/
        .test(lower)
    ) {

      return "Title";

    }


    if (
      /review/.test(lower)
    ) {

      return "Reviews";

    }


    if (
      /rating|stars?/
        .test(lower)
    ) {

      return "Rating";

    }


    if (
      /discount/.test(lower)
    ) {

      return "Discount";

    }


    if (
      /sold/.test(lower)
    ) {

      return "Sold";

    }


    return value;

  }


  function humanizeName(
    value
  ) {

    return String(
      value
    )
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      )
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .replace(
        /\b\w/g,
        function (letter) {

          return letter
            .toUpperCase();

        }
      );

  }


  function isUsefulFieldName(
    value
  ) {

    if (
      !value ||
      value.length < 2 ||
      value.length > 60
    ) {

      return false;

    }


    if (
      /^(?:div|span|p|a|li|field|content|container|wrapper|box|row|column)$/i
        .test(value)
    ) {

      return false;

    }


    return true;

  }


  /*
    ==================================================
    CONTENT INFERENCE
    ==================================================
  */


  function containsCurrency(
    value
  ) {

    return (

      /(?:rs\.?|npr|₨|रू|रु|₹|\$|€|£|¥)\s*\d/i
        .test(value) ||

      /\d[\d,.]*\s*(?:npr|rs\.?|usd|eur|inr|gbp)/i
        .test(value)

    );

  }


  function isLocationLike(
    value
  ) {

    if (
      /\b(?:province|district|state|region|municipality|city|county)\b/i
        .test(value)
    ) {

      return true;

    }


    if (
      /^(?:overseas|international|local)$/i
        .test(value)
    ) {

      return true;

    }


    return false;

  }


  function isCertificateLike(
    value
  ) {

    return /^(?:G|PG|PG-13|R|NC-17|TV-Y|TV-Y7|TV-G|TV-PG|TV-14|TV-MA|U|UA|U\/A|A|12A|15|18)$/i
      .test(
        value.trim()
      );

  }


  function valuesLookLikeTitles(
    values
  ) {

    if (
      values.length < 2
    ) {

      return false;

    }


    const sample =
      values.slice(
        0,
        30
      );


    const unique =
      new Set(
        sample
      );


    const variation =
      unique.size /
      sample.length;


    if (
      variation < 0.6
    ) {

      return false;

    }


    const suitable =
      sample.filter(
        function (value) {

          if (
            value.length < 3 ||
            value.length > 300
          ) {

            return false;

          }


          if (
            containsCurrency(value)
          ) {

            return false;

          }


          if (
            /^-?\d+(?:[,.]\d+)*$/
              .test(value)
          ) {

            return false;

          }


          if (
            /^\(\s*\d+\s*\)$/
              .test(value)
          ) {

            return false;

          }


          if (
            /^\d+\s*h(?:\s*\d+\s*m)?$/i
              .test(value)
          ) {

            return false;

          }


          if (
            /^(?:in stock|out of stock|add to basket|add to cart|buy now)$/i
              .test(value)
          ) {

            return false;

          }


          return true;

        }
      );


    return (
      suitable.length /
      sample.length >= 0.75
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


  function normalizeURL(
    value
  ) {

    if (
      !value
    ) {

      return "";

    }


    let result =
      String(
        value
      ).trim();


    if (
      /^data:|^blob:|^javascript:/i
        .test(result)
    ) {

      return "";

    }


    try {

      result =
        new URL(
          result,
          window.location.href
        ).href;

    } catch (error) {

      return "";

    }


    return /^https?:\/\//i
      .test(result)
      ? result
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

      /\bwindow\.[a-zA-Z_$]/,

      /\bdocument\.[a-zA-Z_$]/,

      /\bvar\s+[a-zA-Z_$]/,

      /\bconst\s+[a-zA-Z_$]/,

      /\blet\s+[a-zA-Z_$]/,

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


  function ratio(
    value,
    total
  ) {

    if (
      total <= 0
    ) {

      return 0;

    }


    return (
      value /
      total
    );

  }


  function createFieldId(
    path
  ) {

    let hash =
      0;


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