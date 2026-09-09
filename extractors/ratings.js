(function () {

  globalThis.Sankalan =
    globalThis.Sankalan || {};


  globalThis.Sankalan.ratingExtractor = {

    extract:
      extractRatingData

  };


  function extractRatingData(
    item
  ) {

    if (!item) {

      return {
        rating: "",
        reviews: ""
      };

    }


    /*
      Detection order matters.

      Prefer explicit/structured values
      before trying visual inference.
    */

    const structured =
      detectStructuredRating(
        item
      );


    const attributes =
      detectAttributeRating(
        item
      );


    const numeric =
      detectNumericRating(
        item
      );


    const unicode =
      detectUnicodeStars(
        item
      );


    const classBased =
      detectClassBasedRating(
        item
      );


    const cssOverlay =
      detectCssOverlayRating(
        item
      );


    const iconBased =
      detectIconRating(
        item
      );


    const rating =
      firstValidRating([

        structured.rating,
        attributes,
        numeric,
        unicode,
        classBased,
        cssOverlay,
        iconBased

      ]);


    const reviews =
      structured.reviews !== ""
        ? structured.reviews
        : detectReviewCount(
            item
          );


    return {

      rating:
        rating,

      reviews:
        reviews

    };

  }


  function detectStructuredRating(
    item
  ) {

    let rating =
      "";

    let reviews =
      "";


    const ratingElements =
      item.querySelectorAll(
        "[itemprop='ratingValue']"
      );


    for (
      const element
      of ratingElements
    ) {

      const value =
        element.getAttribute(
          "content"
        ) ||
        element.getAttribute(
          "value"
        ) ||
        element.innerText ||
        element.textContent;


      rating =
        validateRating(
          extractNumber(
            value
          )
        );


      if (
        rating !== ""
      ) {

        break;

      }

    }


    const reviewElements =
      item.querySelectorAll(
        "[itemprop='reviewCount'], [itemprop='ratingCount']"
      );


    for (
      const element
      of reviewElements
    ) {

      reviews =
        extractWholeNumber(
          element.getAttribute(
            "content"
          ) ||
          element.getAttribute(
            "value"
          ) ||
          element.innerText ||
          element.textContent
        );


      if (
        reviews !== ""
      ) {

        break;

      }

    }


    if (
      rating !== "" ||
      reviews !== ""
    ) {

      return {

        rating:
          rating,

        reviews:
          reviews

      };

    }


    const scripts =
      item.querySelectorAll(
        "script[type='application/ld+json']"
      );


    for (
      const script
      of scripts
    ) {

      try {

        const parsed =
          JSON.parse(
            script.textContent
          );


        const result =
          searchJsonLd(
            parsed
          );


        if (
          result.rating !== "" ||
          result.reviews !== ""
        ) {

          return result;

        }

      } catch (error) {

      }

    }


    return {

      rating: "",
      reviews: ""

    };

  }


  function searchJsonLd(
    value
  ) {

    if (!value) {

      return {

        rating: "",
        reviews: ""

      };

    }


    if (
      Array.isArray(
        value
      )
    ) {

      for (
        const entry
        of value
      ) {

        const result =
          searchJsonLd(
            entry
          );


        if (
          result.rating !== "" ||
          result.reviews !== ""
        ) {

          return result;

        }

      }


      return {

        rating: "",
        reviews: ""

      };

    }


    if (
      typeof value !==
      "object"
    ) {

      return {

        rating: "",
        reviews: ""

      };

    }


    if (
      value.aggregateRating
    ) {

      const aggregate =
        value.aggregateRating;


      return {

        rating:
          validateRating(
            extractNumber(
              aggregate.ratingValue
            )
          ),

        reviews:
          extractWholeNumber(
            aggregate.reviewCount ||
            aggregate.ratingCount
          )

      };

    }


    if (
      value.ratingValue
    ) {

      return {

        rating:
          validateRating(
            extractNumber(
              value.ratingValue
            )
          ),

        reviews:
          extractWholeNumber(
            value.reviewCount ||
            value.ratingCount
          )

      };

    }


    for (
      const key
      of Object.keys(
        value
      )
    ) {

      if (
        value[key] &&
        typeof value[key] ===
          "object"
      ) {

        const result =
          searchJsonLd(
            value[key]
          );


        if (
          result.rating !== "" ||
          result.reviews !== ""
        ) {

          return result;

        }

      }

    }


    return {

      rating: "",
      reviews: ""

    };

  }


  function detectAttributeRating(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    const ratingAttributes = [

      "data-rating",
      "data-score",
      "data-stars",
      "data-star-rating",
      "data-rating-value",
      "aria-valuenow",
      "aria-label",
      "title"

    ];


    for (
      const element
      of elements
    ) {

      for (
        const attribute
        of ratingAttributes
      ) {

        const value =
          element.getAttribute(
            attribute
          );


        if (
          value === null ||
          value === ""
        ) {

          continue;

        }


        /*
          aria-valuenow can contain a
          clean number without "rating"
          wording.

          Only use it if the element itself
          looks rating-related.
        */

        if (
          attribute ===
          "aria-valuenow"
        ) {

          const descriptor =
            buildElementDescriptor(
              element
            );


          if (
            !/rating|star|score/i
              .test(
                descriptor
              )
          ) {

            continue;

          }


          const rating =
            validateRating(
              value
            );


          if (
            rating !== ""
          ) {

            return rating;

          }

        }


        const rating =
          extractRatingFromText(
            value
          );


        if (
          rating !== ""
        ) {

          return rating;

        }

      }

    }


    return "";

  }


  function detectNumericRating(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    for (
      const element
      of elements
    ) {

      const text =
        (
          element.innerText ||
          element.textContent ||
          ""
        ).trim();


      if (
        text === "" ||
        text.length > 150
      ) {

        continue;

      }


      const rating =
        extractRatingFromText(
          text
        );


      if (
        rating !== ""
      ) {

        return rating;

      }

    }


    return "";

  }


  function extractRatingFromText(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    const text =
      String(
        value
      ).trim();


    const patterns = [

      /(?:rating|rated|score)\s*[:\-]?\s*([0-5](?:\.\d+)?)/i,

      /([0-5](?:\.\d+)?)\s*\/\s*5/i,

      /([0-5](?:\.\d+)?)\s*(?:out\s+of)\s*5/i,

      /([0-5](?:\.\d+)?)\s*stars?\b/i,

      /([0-5](?:\.\d+)?)\s*★/i

    ];


    for (
      const pattern
      of patterns
    ) {

      const match =
        text.match(
          pattern
        );


      if (
        match
      ) {

        return validateRating(
          match[1]
        );

      }

    }


    return "";

  }


  function detectUnicodeStars(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    for (
      const element
      of elements
    ) {

      const text =
        (
          element.textContent ||
          ""
        ).trim();


      const match =
        text.match(
          /[★☆]{3,5}/
        );


      if (
        !match
      ) {

        continue;

      }


      const sequence =
        match[0];


      const filled =
        (
          sequence.match(
            /★/g
          ) ||
          []
        ).length;


      const empty =
        (
          sequence.match(
            /☆/g
          ) ||
          []
        ).length;


      const total =
        filled +
        empty;


      if (
        total >= 3 &&
        total <= 5
      ) {

        return validateRating(
          filled
        );

      }

    }


    return "";

  }


  function detectClassBasedRating(
    item
  ) {

    const wordValues = {

      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5

    };


    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    for (
      const element
      of elements
    ) {

      const className =
        getClassName(
          element
        )
          .toLowerCase()
          .trim();


      if (
        className === "" ||
        !/star|rating|score/i
          .test(
            className
          )
      ) {

        continue;

      }


      /*
        Books to Scrape:

        star-rating Three
    */

      for (
        const [
          word,
          number
        ]
        of Object.entries(
          wordValues
        )
      ) {

        const wordPattern =
          new RegExp(
            "(?:^|[\\s_-])" +
            word +
            "(?:$|[\\s_-])",
            "i"
          );


        if (
          wordPattern.test(
            className
          )
        ) {

          /*
            Zero from a class is only trusted
            when zero is explicitly written.
        */

          return String(
            number
          );

        }

      }


      const patterns = [

        /(?:rating|stars?|score)[-_ ]?([0-5](?:\.\d+)?)/i,

        /([0-5](?:\.\d+)?)[-_ ]?(?:rating|stars?|score)/i

      ];


      for (
        const pattern
        of patterns
      ) {

        const match =
          className.match(
            pattern
          );


        if (
          !match
        ) {

          continue;

        }


        const rating =
          validateRating(
            match[1]
          );


        if (
          rating !== ""
        ) {

          return rating;

        }

      }

    }


    return "";

  }


  /*
    Universal layered/CSS star detector.

    Many sites render rating like:

    gray stars underneath
    yellow stars above them

    The yellow layer may have:

    width: 84%

    Instead of containing a numeric value.
  */

  function detectCssOverlayRating(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    for (
      const element
      of elements
    ) {

      const descriptor =
        buildElementDescriptor(
          element
        ).toLowerCase();


      if (
        !/star|rating|score/i
          .test(
            descriptor
          )
      ) {

        continue;

      }


      const inlineStyle =
        element.getAttribute(
          "style"
        ) ||
        "";


      const percentageMatch =
        inlineStyle.match(
          /(?:width|max-width)\s*:\s*(\d+(?:\.\d+)?)%/i
        );


      if (
        percentageMatch
      ) {

        const percentage =
          Number(
            percentageMatch[1]
          );


        /*
          Don't accept 0% automatically.

          0 often belongs to a hidden or
          animation element rather than an
          actual zero-star rating.
        */

        if (
          percentage > 0 &&
          percentage <= 100
        ) {

          const rating =
            percentage /
            20;


          return formatRating(
            rating
          );

        }

      }

    }


    /*
      Detect two visual layers using
      their bounding rectangles.

      Example:

      full background stars width = 80px
      filled stars width = 67px

      67 / 80 × 5 = 4.19
    */

    const containers =
      findPossibleRatingContainers(
        item
      );


    for (
      const container
      of containers
    ) {

      const descendants =
        Array.from(
          container.querySelectorAll(
            "*"
          )
        );


      const candidates =
        descendants
          .map(
            function (element) {

              const descriptor =
                buildElementDescriptor(
                  element
                ).toLowerCase();


              if (
                !/star|rating|score|fill/i
                  .test(
                    descriptor
                  )
              ) {

                return null;

              }


              const rect =
                getRectSafe(
                  element
                );


              if (
                !rect ||
                rect.width <= 0 ||
                rect.height <= 0
              ) {

                return null;

              }


              return {

                element:
                  element,

                width:
                  rect.width,

                height:
                  rect.height,

                descriptor:
                  descriptor

              };

            }
          )
          .filter(Boolean);


      if (
        candidates.length < 2
      ) {

        continue;

      }


      const largestWidth =
        Math.max(
          ...candidates.map(
            function (candidate) {

              return candidate.width;

            }
          )
        );


      if (
        largestWidth <= 0
      ) {

        continue;

      }


      for (
        const candidate
        of candidates
      ) {

        if (
          candidate.width >=
          largestWidth * 0.99
        ) {

          continue;

        }


        const ratio =
          candidate.width /
          largestWidth;


        if (
          ratio <= 0 ||
          ratio > 1
        ) {

          continue;

        }


        if (
          /fill|filled|active|foreground|current|selected/i
            .test(
              candidate.descriptor
            )
        ) {

          const rating =
            ratio *
            5;


          if (
            rating >= 0.1 &&
            rating <= 5
          ) {

            return formatRating(
              rating
            );

          }

        }

      }

    }


    return "";

  }


  function detectIconRating(
    item
  ) {

    const containers =
      findPossibleRatingContainers(
        item
      );


    for (
      const container
      of containers
    ) {

      const icons =
        findStarIcons(
          container
        );


      if (
        icons.length < 3 ||
        icons.length > 10
      ) {

        continue;

      }


      /*
        Avoid counting duplicate nested
        elements such as:

        svg
          path

        as separate stars.
      */

      const normalizedIcons =
        removeNestedDuplicateStars(
          icons
        );


      if (
        normalizedIcons.length < 3 ||
        normalizedIcons.length > 5
      ) {

        continue;

      }


      let filled =
        0;

      let half =
        0;

      let empty =
        0;

      let uncertain =
        0;


      for (
        const icon
        of normalizedIcons
      ) {

        const state =
          classifyStar(
            icon
          );


        if (
          state === "filled"
        ) {

          filled++;

        } else if (
          state === "half"
        ) {

          half++;

        } else if (
          state === "empty"
        ) {

          empty++;

        } else {

          uncertain++;

        }

      }


      const total =
        filled +
        half +
        empty +
        uncertain;


      if (
        total < 3 ||
        total > 5
      ) {

        continue;

      }


      /*
        IMPORTANT FIX.

        Previously:

        5 stars found
        but all interpreted as empty
        => Rating 0

        That is too dangerous.

        If we cannot confidently detect
        even one filled/half star, return
        no result instead of fabricating 0.
      */

      if (
        filled === 0 &&
        half === 0
      ) {

        continue;

      }


      /*
        If too many icons are uncertain,
        this container isn't trustworthy.
      */

      if (
        uncertain >
        2
      ) {

        continue;

      }


      const rating =
        filled +
        (
          half *
          0.5
        );


      if (
        rating > 0 &&
        rating <= 5
      ) {

        return formatRating(
          rating
        );

      }

    }


    /*
      Last visual method:
      compare computed visual styles
      across exactly five stars.
    */

    return detectRelativeStarColors(
      item
    );

  }


  function findStarIcons(
    container
  ) {

    const elements =
      Array.from(
        container.querySelectorAll(
          "i, span, svg, use, path"
        )
      );


    return elements.filter(
      function (element) {

        const descriptor =
          buildElementDescriptor(
            element
          );


        return /star/i.test(
          descriptor
        );

      }
    );

  }


  function removeNestedDuplicateStars(
    icons
  ) {

    const result =
      [];


    for (
      const icon
      of icons
    ) {

      const hasAncestor =
        icons.some(
          function (other) {

            return (
              other !== icon &&
              other.contains(
                icon
              ) &&
              /star/i.test(
                buildElementDescriptor(
                  other
                )
              )
            );

          }
        );


      if (
        !hasAncestor
      ) {

        result.push(
          icon
        );

      }

    }


    return result;

  }


  function classifyStar(
    element
  ) {

    const descriptor =
      buildElementDescriptor(
        element
      ).toLowerCase();


    if (
      /half|50-percent|half-filled|star-half/i
        .test(
          descriptor
        )
    ) {

      return "half";

    }


    if (
      /empty|outline|outlined|regular|unfilled|inactive|star-o|off/i
        .test(
          descriptor
        )
    ) {

      return "empty";

    }


    if (
      /filled|solid|active|selected|checked|star-fill|star_filled|on/i
        .test(
          descriptor
        )
    ) {

      return "filled";

    }


    /*
      Font Awesome.
    */

    if (
      /\bfar\b/.test(
        descriptor
      ) ||
      /fa-regular/.test(
        descriptor
      )
    ) {

      return "empty";

    }


    if (
      /\bfas\b/.test(
        descriptor
      ) ||
      /fa-solid/.test(
        descriptor
      )
    ) {

      return "filled";

    }


    /*
      Bootstrap Icons.
    */

    if (
      /bi-star-fill/.test(
        descriptor
      )
    ) {

      return "filled";

    }


    if (
      /bi-star-half/.test(
        descriptor
      )
    ) {

      return "half";

    }


    /*
      Material-like names.
    */

    if (
      /star_border|star-outline/.test(
        descriptor
      )
    ) {

      return "empty";

    }


    /*
      SVG direct attributes.
    */

    const fillAttribute =
      (
        element.getAttribute(
          "fill"
        ) ||
        ""
      ).trim()
        .toLowerCase();


    const strokeAttribute =
      (
        element.getAttribute(
          "stroke"
        ) ||
        ""
      ).trim()
        .toLowerCase();


    if (
      fillAttribute &&
      fillAttribute !== "none" &&
      fillAttribute !== "transparent" &&
      fillAttribute !==
        "currentcolor"
    ) {

      return "filled";

    }


    if (
      fillAttribute === "none" &&
      strokeAttribute &&
      strokeAttribute !==
        "none"
    ) {

      return "empty";

    }


    /*
      Computed style fallback.

      We intentionally don't call a
      normal color "filled" by itself,
      because outline stars can also
      inherit color.
    */

    const style =
      getComputedStyleSafe(
        element
      );


    if (
      style
    ) {

      const fill =
        normalizeCssColor(
          style.fill
        );


      const stroke =
        normalizeCssColor(
          style.stroke
        );


      if (
        isVisibleColor(
          fill
        ) &&
        !isVisibleColor(
          stroke
        )
      ) {

        return "filled";

      }


      if (
        !isVisibleColor(
          fill
        ) &&
        isVisibleColor(
          stroke
        )
      ) {

        return "empty";

      }

    }


    return "uncertain";

  }


  /*
    Generic relative-color detection.

    Useful where five SVGs all have the
    same class but filled stars use one
    color and empty stars another.
  */

  function detectRelativeStarColors(
    item
  ) {

    const containers =
      findPossibleRatingContainers(
        item
      );


    for (
      const container
      of containers
    ) {

      const icons =
        removeNestedDuplicateStars(
          findStarIcons(
            container
          )
        );


      if (
        icons.length !== 5
      ) {

        continue;

      }


      const signatures =
        icons.map(
          function (icon) {

            return getVisualSignature(
              icon
            );

          }
        );


      if (
        signatures.some(
          function (signature) {

            return (
              signature === ""
            );

          }
        )
      ) {

        continue;

      }


      const groups =
        new Map();


      signatures.forEach(
        function (
          signature,
          index
        ) {

          if (
            !groups.has(
              signature
            )
          ) {

            groups.set(
              signature,
              []
            );

          }


          groups.get(
            signature
          ).push(
            index
          );

        }
      );


      /*
        One visual style for all five
        stars doesn't tell us the rating.
      */

      if (
        groups.size < 2
      ) {

        continue;

      }


      /*
        Rating stars normally fill from
        left to right.

        Find the longest prefix using
        the first star's visual style.
      */

      const firstSignature =
        signatures[0];


      let filledPrefix =
        0;


      for (
        const signature
        of signatures
      ) {

        if (
          signature ===
          firstSignature
        ) {

          filledPrefix++;

        } else {

          break;

        }

      }


      if (
        filledPrefix <= 0 ||
        filledPrefix >= 5
      ) {

        continue;

      }


      /*
        Verify remaining stars consistently
        use a different visual state.
      */

      const remaining =
        signatures.slice(
          filledPrefix
        );


      const remainingUnique =
        new Set(
          remaining
        );


      if (
        remainingUnique.size === 1 &&
        !remainingUnique.has(
          firstSignature
        )
      ) {

        return String(
          filledPrefix
        );

      }

    }


    return "";

  }


  function getVisualSignature(
    element
  ) {

    const style =
      getComputedStyleSafe(
        element
      );


    if (!style) {

      return "";

    }


    const fill =
      normalizeCssColor(
        style.fill
      );


    const stroke =
      normalizeCssColor(
        style.stroke
      );


    const color =
      normalizeCssColor(
        style.color
      );


    const opacity =
      String(
        style.opacity ||
        ""
      );


    return [

      fill,
      stroke,
      color,
      opacity

    ].join("|");

  }


  function findPossibleRatingContainers(
    item
  ) {

    const result =
      [];

    const seen =
      new Set();


    const candidates =
      item.querySelectorAll(
        "[class*='star' i], [class*='rating' i], [class*='review' i], [aria-label*='star' i], [aria-label*='rating' i], [data-rating], [data-score], svg, i"
      );


    candidates.forEach(
      function (element) {

        let current =
          element;


        for (
          let level = 0;
          level < 4;
          level++
        ) {

          if (
            !current ||
            current ===
              item.parentElement
          ) {

            break;

          }


          const descriptor =
            buildElementDescriptor(
              current
            );


          const starCount =
            current.querySelectorAll(
              "[class*='star' i], [data-icon*='star' i], use[href*='star' i], use[xlink\\:href*='star' i]"
            ).length;


          if (
            /star|rating|review|score/i
              .test(
                descriptor
              ) ||
            starCount >= 3
          ) {

            if (
              !seen.has(
                current
              )
            ) {

              seen.add(
                current
              );


              result.push(
                current
              );

            }

          }


          current =
            current.parentElement;

        }

      }
    );


    return result;

  }


  function detectReviewCount(
    item
  ) {

    /*
      Preferred rating/review-related
      elements first.
    */

    const preferred =
      item.querySelectorAll(
        "[class*='review' i], [class*='rating' i], [class*='star' i], [data-review-count], [data-rating-count], [itemprop='reviewCount'], [itemprop='ratingCount']"
      );


    for (
      const element
      of preferred
    ) {

      const values = [

        element.getAttribute(
          "data-review-count"
        ),

        element.getAttribute(
          "data-rating-count"
        ),

        element.getAttribute(
          "content"
        )

      ];


      for (
        const value
        of values
      ) {

        if (
          value === null ||
          value === ""
        ) {

          continue;

        }


        const count =
          extractWholeNumber(
            value
          );


        if (
          count !== ""
        ) {

          return count;

        }

      }


      const text =
        (
          element.innerText ||
          element.textContent ||
          ""
        ).trim();


      const explicit =
        text.match(
          /\b([\d,.]+[KkMm]?)\s*(?:reviews?|ratings?)\b/i
        );


      if (
        explicit
      ) {

        return normalizeCount(
          explicit[1]
        );

      }


      /*
        Common ecommerce pattern:

        ★★★★☆ (293)
      */

      const bracket =
        text.match(
          /\(\s*([\d,.]+[KkMm]?)\s*\)/
        );


      if (
        bracket
      ) {

        return normalizeCount(
          bracket[1]
        );

      }

    }


    /*
      Scan small descendant elements.

      This catches cases where the count
      is a sibling of SVG stars.
    */

    const elements =
      item.querySelectorAll(
        "span, small, div, p"
      );


    for (
      const element
      of elements
    ) {

      const text =
        (
          element.innerText ||
          element.textContent ||
          ""
        ).trim();


      if (
        text.length > 50
      ) {

        continue;

      }


      const bracketOnly =
        text.match(
          /^\(\s*([\d,.]+[KkMm]?)\s*\)$/
        );


      if (
        bracketOnly
      ) {

        const parent =
          element.parentElement;


        if (
          parent &&
          isRatingRelatedElement(
            parent
          )
        ) {

          return normalizeCount(
            bracketOnly[1]
          );

        }

      }

    }


    const text =
      (
        item.innerText ||
        item.textContent ||
        ""
      );


    const explicit =
      text.match(
        /\b([\d,.]+[KkMm]?)\s*(?:reviews?|ratings?)\b/i
      );


    if (
      explicit
    ) {

      return normalizeCount(
        explicit[1]
      );

    }


    return "";

  }


  function isRatingRelatedElement(
    element
  ) {

    if (!element) {

      return false;

    }


    const descriptor =
      buildElementDescriptor(
        element
      );


    if (
      /rating|review|star|score/i
        .test(
          descriptor
        )
    ) {

      return true;

    }


    const starElements =
      element.querySelectorAll(
        "[class*='star' i], [data-icon*='star' i], svg, use"
      );


    if (
      starElements.length >= 3
    ) {

      return true;

    }


    return false;

  }


  function buildElementDescriptor(
    element
  ) {

    if (!element) {

      return "";

    }


    return [

      getClassName(
        element
      ),

      element.id,

      element.getAttribute(
        "data-icon"
      ),

      element.getAttribute(
        "data-rating"
      ),

      element.getAttribute(
        "data-score"
      ),

      element.getAttribute(
        "aria-label"
      ),

      element.getAttribute(
        "title"
      ),

      element.getAttribute(
        "href"
      ),

      element.getAttribute(
        "xlink:href"
      ),

      element.getAttribute(
        "fill"
      ),

      element.getAttribute(
        "stroke"
      )

    ]
      .filter(Boolean)
      .join(" ");

  }


  function getClassName(
    element
  ) {

    if (!element) {

      return "";

    }


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


  function getComputedStyleSafe(
    element
  ) {

    try {

      return window.getComputedStyle(
        element
      );

    } catch (error) {

      return null;

    }

  }


  function getRectSafe(
    element
  ) {

    try {

      return element.getBoundingClientRect();

    } catch (error) {

      return null;

    }

  }


  function normalizeCssColor(
    value
  ) {

    return String(
      value ||
      ""
    )
      .replace(
        /\s+/g,
        ""
      )
      .toLowerCase();

  }


  function isVisibleColor(
    value
  ) {

    if (!value) {

      return false;

    }


    const invisibleValues = [

      "none",
      "transparent",
      "rgba(0,0,0,0)",
      "hsla(0,0%,0%,0)"

    ];


    return !invisibleValues.includes(
      value
    );

  }


  function firstValidRating(
    values
  ) {

    for (
      const value
      of values
    ) {

      const rating =
        validateRating(
          value
        );


      if (
        rating !== ""
      ) {

        return rating;

      }

    }


    return "";

  }


  function validateRating(
    value
  ) {

    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {

      return "";

    }


    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "";

    }


    if (
      number < 0 ||
      number > 5
    ) {

      return "";

    }


    return formatRating(
      number
    );

  }


  function formatRating(
    value
  ) {

    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return "";

    }


    const rounded =
      Math.round(
        number *
        10
      ) /
      10;


    return String(
      rounded
    );

  }


  function extractNumber(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    const match =
      String(
        value
      ).match(
        /\d+(?:\.\d+)?/
      );


    return (
      match
        ? match[0]
        : ""
    );

  }


  function extractWholeNumber(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    const match =
      String(
        value
      ).match(
        /[\d,.]+[KkMm]?/
      );


    return (
      match
        ? normalizeCount(
            match[0]
          )
        : ""
    );

  }


  function normalizeCount(
    value
  ) {

    if (!value) {

      return "";

    }


    const text =
      String(
        value
      )
        .trim()
        .replace(
          /,/g,
          ""
        );


    const match =
      text.match(
        /^(\d+(?:\.\d+)?)([KkMm])?$/
      );


    if (!match) {

      return text;

    }


    const number =
      Number(
        match[1]
      );


    const suffix =
      (
        match[2] ||
        ""
      ).toLowerCase();


    if (
      suffix === "k"
    ) {

      return String(
        Math.round(
          number *
          1000
        )
      );

    }


    if (
      suffix === "m"
    ) {

      return String(
        Math.round(
          number *
          1000000
        )
      );

    }


    return String(
      number
    );

  }

})();