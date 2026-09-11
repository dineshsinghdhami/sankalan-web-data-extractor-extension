(function () {

  globalThis.Sankalan =
    globalThis.Sankalan || {};


  globalThis.Sankalan.ratingExtractor = {
    extract: extractRatingData
  };


  function extractRatingData(item) {

    if (!item) {

      return {
        rating: "",
        reviews: "",
        scale: ""
      };

    }


    const detectors = [

      detectStructuredRating,
      detectRatingAttributes,
      detectClassRating,
      detectTextRating,
      detectUnicodeStars,
      detectCssRating

    ];


    let detected = null;


    for (
      const detector
      of detectors
    ) {

      detected =
        detector(item);


      if (
        detected &&
        detected.rating !== ""
      ) {
        break;
      }

    }


    return {

      rating:
        detected?.rating ||
        "",

      reviews:
        detectReviewCount(item),

      scale:
        detected?.scale ||
        ""

    };

  }


  /*
    ==================================================
    STRUCTURED DATA
    ==================================================
  */


  function detectStructuredRating(
    item
  ) {

    const elements =
      item.querySelectorAll(
        "[itemprop='ratingValue']"
      );


    for (
      const element
      of elements
    ) {

      const value =
        firstNumber(
          element.getAttribute(
            "content"
          ) ||
          element.getAttribute(
            "value"
          ) ||
          element.textContent
        );


      if (
        !Number.isFinite(value)
      ) {
        continue;
      }


      const container =
        element.closest(
          "[itemprop='aggregateRating'], [itemprop='reviewRating']"
        );


      let bestRating =
        NaN;


      if (container) {

        const best =
          container.querySelector(
            "[itemprop='bestRating']"
          );


        if (best) {

          bestRating =
            firstNumber(
              best.getAttribute(
                "content"
              ) ||
              best.textContent
            );

        }

      }


      if (
        Number.isFinite(bestRating) &&
        bestRating > 0
      ) {

        return makeRating(
          value,
          bestRating
        );

      }


      /*
        Structured rating values greater
        than five are commonly 10-point
        scores.

        We only allow this because the
        element explicitly declares itself
        as ratingValue.
      */

      if (
        value >= 0 &&
        value <= 10
      ) {

        return makeRating(
          value,
          value > 5
            ? 10
            : 5
        );

      }

    }


    return null;

  }


  /*
    ==================================================
    DATA / ARIA ATTRIBUTES
    ==================================================
  */


  function detectRatingAttributes(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    const numericAttributes = [

      "data-rating",
      "data-rating-value",
      "data-score",
      "data-stars",
      "data-star-rating"

    ];


    for (
      const element
      of elements
    ) {

      const descriptor =
        getDescriptor(
          element
        );


      if (
        !hasRatingSemantics(
          descriptor
        )
      ) {
        continue;
      }


      for (
        const attribute
        of numericAttributes
      ) {

        const raw =
          element.getAttribute(
            attribute
          );


        if (
          raw === null ||
          raw === ""
        ) {
          continue;
        }


        const number =
          firstNumber(raw);


        const result =
          validateSemanticRating(
            number,
            raw +
            " " +
            descriptor
          );


        if (result) {
          return result;
        }

      }


      const ariaValue =
        element.getAttribute(
          "aria-valuenow"
        );


      if (ariaValue) {

        const ariaMax =
          firstNumber(
            element.getAttribute(
              "aria-valuemax"
            )
          );


        const number =
          firstNumber(
            ariaValue
          );


        if (
          Number.isFinite(
            ariaMax
          ) &&
          ariaMax > 0
        ) {

          const result =
            makeRating(
              number,
              ariaMax
            );


          if (result) {
            return result;
          }

        }


        const result =
          validateSemanticRating(
            number,
            descriptor
          );


        if (result) {
          return result;
        }

      }


      const label =
        element.getAttribute(
          "aria-label"
        );


      if (label) {

        const result =
          ratingFromText(
            label
          );


        if (result) {
          return result;
        }

      }


      const title =
        element.getAttribute(
          "title"
        );


      if (title) {

        const result =
          ratingFromText(
            title
          );


        if (result) {
          return result;
        }

      }

    }


    return null;

  }


  /*
    ==================================================
    CLASS RATINGS
    ==================================================
  */


  function detectClassRating(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "*"
      )

    ];


    const words = {

      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5

    };


    for (
      const element
      of elements
    ) {

      const classes =
        Array.from(
          element.classList ||
          []
        );


      if (
        classes.length === 0
      ) {
        continue;
      }


      const combined =
        classes
          .join(" ")
          .toLowerCase();


      if (
        !hasRatingSemantics(
          combined
        )
      ) {
        continue;
      }


      /*
        Books to Scrape:

        star-rating Three
      */

      for (
        const className
        of classes
      ) {

        const token =
          className
            .trim()
            .toLowerCase();


        if (
          Object.prototype
            .hasOwnProperty
            .call(
              words,
              token
            )
        ) {

          return makeRating(
            words[token],
            5
          );

        }

      }


      for (
        const [word, value]
        of Object.entries(
          words
        )
      ) {

        const pattern =
          new RegExp(
            "(?:rating|rate|stars?|score)[-_ ]+" +
            word +
            "(?:$|[\\s_-])",
            "i"
          );


        if (
          pattern.test(
            combined
          )
        ) {

          return makeRating(
            value,
            5
          );

        }

      }


      /*
        rating-4
        rating-4.5
        score-9.3
      */

      const match =
        combined.match(
          /(?:rating|rate|stars?|score)[-_ ]+([0-9]+(?:\.[0-9]+)?)(?:$|[\s_-])/i
        );


      if (match) {

        const number =
          Number(
            match[1]
          );


        const result =
          validateSemanticRating(
            number,
            combined
          );


        if (result) {
          return result;
        }

      }

    }


    return null;

  }


  /*
    ==================================================
    TEXT RATINGS
    ==================================================
  */


  function detectTextRating(
    item
  ) {

    const elements = [

      item,

      ...item.querySelectorAll(
        "span, p, div, small, strong"
      )

    ];


    for (
      const element
      of elements
    ) {

      const text =
        normalize(
          element.textContent
        );


      if (
        !text ||
        text.length > 150
      ) {
        continue;
      }


      const descriptor =
        getDescriptor(
          element
        );


      /*
        A bare number such as 9.3 is only
        treated as a rating if the surrounding
        DOM has rating/score semantics.
      */

      if (
        /^[0-9]+(?:\.[0-9]+)?$/
          .test(text) &&
        hasRatingSemantics(
          descriptor
        )
      ) {

        const number =
          Number(text);


        const result =
          validateSemanticRating(
            number,
            descriptor
          );


        if (result) {
          return result;
        }

      }


      const result =
        ratingFromText(
          text
        );


      if (result) {
        return result;
      }

    }


    return null;

  }


  function ratingFromText(
    value
  ) {

    const text =
      normalize(value);


    if (!text) {
      return null;
    }


    /*
      Explicit 10-point scales.
    */

    let match =
      text.match(
        /([0-9]+(?:\.[0-9]+)?)\s*(?:\/|out\s+of)\s*10\b/i
      );


    if (match) {

      return makeRating(
        Number(
          match[1]
        ),
        10
      );

    }


    /*
      Explicit five-point scales.
    */

    match =
      text.match(
        /([0-9]+(?:\.[0-9]+)?)\s*(?:\/|out\s+of)\s*5\b/i
      );


    if (match) {

      return makeRating(
        Number(
          match[1]
        ),
        5
      );

    }


    /*
      Named rating/score.

      Examples:

      Rating 9.3
      Score: 8.6
      Rated 4.7
    */

    match =
      text.match(
        /(?:rating|score)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i
      );


    if (match) {

      const number =
        Number(
          match[1]
        );


      return validateSemanticRating(
        number,
        text
      );

    }


    /*
      "Rated" can also mean movie
      certification, so require a number.
    */

    match =
      text.match(
        /\brated\s+([0-9]+(?:\.[0-9]+)?)(?:\s*(?:\/\s*(5|10)))?/i
      );


    if (match) {

      const number =
        Number(
          match[1]
        );


      const scale =
        Number(
          match[2] ||
          (
            number > 5
              ? 10
              : 5
          )
        );


      return makeRating(
        number,
        scale
      );

    }


    match =
      text.match(
        /([0-5](?:\.\d+)?)\s*stars?\b/i
      );


    if (match) {

      return makeRating(
        Number(
          match[1]
        ),
        5
      );

    }


    match =
      text.match(
        /([0-5](?:\.\d+)?)\s*★/i
      );


    if (match) {

      return makeRating(
        Number(
          match[1]
        ),
        5
      );

    }


    return null;

  }


  /*
    ==================================================
    UNICODE STARS
    ==================================================
  */


  function detectUnicodeStars(
    item
  ) {

    const elements =
      item.querySelectorAll(
        "span, p, div, small"
      );


    for (
      const element
      of elements
    ) {

      const text =
        normalize(
          element.textContent
        );


      const match =
        text.match(
          /[★☆]{3,5}/
        );


      if (!match) {
        continue;
      }


      const stars =
        match[0];


      const filled =
        (
          stars.match(/★/g) ||
          []
        ).length;


      if (
        filled > 0
      ) {

        return makeRating(
          filled,
          stars.length
        );

      }

    }


    return null;

  }


  /*
    ==================================================
    CSS RATING
    ==================================================
  */


  function detectCssRating(
    item
  ) {

    const elements =
      item.querySelectorAll(
        "[class*='rating' i], [class*='star' i], [class*='rate' i], [class*='score' i]"
      );


    for (
      const element
      of elements
    ) {

      const descriptor =
        getDescriptor(
          element
        );


      if (
        !hasRatingSemantics(
          descriptor
        )
      ) {
        continue;
      }


      const style =
        element.getAttribute(
          "style"
        ) ||
        "";


      const match =
        style.match(
          /(?:width|max-width)\s*:\s*(\d+(?:\.\d+)?)%/i
        );


      if (!match) {
        continue;
      }


      const percentage =
        Number(
          match[1]
        );


      if (
        percentage <= 0 ||
        percentage > 100
      ) {
        continue;
      }


      return makeRating(
        percentage / 20,
        5
      );

    }


    return null;

  }


  /*
    ==================================================
    REVIEW / RATING COUNT
    ==================================================
  */


  function detectReviewCount(
    item
  ) {

    const elements =
      item.querySelectorAll(
        [
          "[itemprop='reviewCount']",
          "[itemprop='ratingCount']",
          "[data-review-count]",
          "[data-rating-count]",
          "[class*='review' i]",
          "[class*='rating' i]",
          "[class*='rate' i]",
          "[class*='score' i]"
        ].join(",")
      );


    for (
      const element
      of elements
    ) {

      const values = [

        element.getAttribute(
          "content"
        ),

        element.getAttribute(
          "data-review-count"
        ),

        element.getAttribute(
          "data-rating-count"
        )

      ];


      for (
        const value
        of values
      ) {

        const result =
          normalizeCount(
            value
          );


        if (
          result !== ""
        ) {
          return result;
        }

      }


      const text =
        normalize(
          element.textContent
        );


      const explicit =
        text.match(
          /\b([\d,.]+(?:\.\d+)?[KkMm]?)\s*(?:reviews?|ratings?|votes?)\b/i
        );


      if (explicit) {

        return normalizeCount(
          explicit[1]
        );

      }


      const brackets =
        text.match(
          /\(\s*([\d,.]+(?:\.\d+)?[KkMm]?)\s*\)/
        );


      if (brackets) {

        return normalizeCount(
          brackets[1]
        );

      }

    }


    return "";

  }


  /*
    ==================================================
    HELPERS
    ==================================================
  */


  function validateSemanticRating(
    value,
    context
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number) ||
      number < 0
    ) {
      return null;
    }


    const text =
      String(
        context ||
        ""
      );


    if (
      /\b(?:\/|out\s+of)\s*10\b/i
        .test(text) ||
      /\b10[-_ ]?(?:point|star|rating|score)\b/i
        .test(text)
    ) {

      return makeRating(
        number,
        10
      );

    }


    if (
      /\b(?:\/|out\s+of)\s*5\b/i
        .test(text) ||
      /\b5[-_ ]?(?:point|star|rating|score)\b/i
        .test(text)
    ) {

      return makeRating(
        number,
        5
      );

    }


    if (
      number <= 5
    ) {

      return makeRating(
        number,
        5
      );

    }


    /*
      Values between 5 and 10 are accepted
      only when the surrounding element is
      explicitly a rating/score component.
    */

    if (
      number <= 10 &&
      hasRatingSemantics(
        text
      )
    ) {

      return makeRating(
        number,
        10
      );

    }


    return null;

  }


  function makeRating(
    value,
    scale
  ) {

    const number =
      Number(value);


    const maximum =
      Number(scale);


    if (
      !Number.isFinite(number) ||
      !Number.isFinite(maximum) ||
      maximum <= 0 ||
      number < 0 ||
      number > maximum
    ) {
      return null;
    }


    return {

      rating:
        formatRating(
          number
        ),

      scale:
        String(
          maximum
        )

    };

  }


  function hasRatingSemantics(
    value
  ) {

    return /rating|ratings|rate|score|stars?|aggregate[-_ ]?rating/i
      .test(
        String(
          value ||
          ""
        )
      );

  }


  function getDescriptor(
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
        "data-testid"
      ),

      element.getAttribute(
        "data-rating"
      ),

      element.getAttribute(
        "data-rating-value"
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


    return match
      ? Number(
          match[0]
        )
      : NaN;

  }


  function formatRating(
    value
  ) {

    return String(
      Math.round(
        Number(value) *
        10
      ) / 10
    );

  }


  function normalizeCount(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }


    const text =
      String(value)
        .replace(
          /,/g,
          ""
        )
        .trim();


    const match =
      text.match(
        /(\d+(?:\.\d+)?)([KkMm])?/
      );


    if (!match) {
      return "";
    }


    let number =
      Number(
        match[1]
      );


    const suffix =
      (
        match[2] ||
        ""
      )
        .toLowerCase();


    if (
      suffix === "k"
    ) {
      number *= 1000;
    }


    if (
      suffix === "m"
    ) {
      number *= 1000000;
    }


    /*
      Preserve large counts as normal
      numbers for analysis.
    */

    return String(
      Math.round(number)
    );

  }


  function normalize(
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

})();