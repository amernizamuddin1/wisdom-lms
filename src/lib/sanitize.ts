import sanitizeHtml from "sanitize-html";

// Broader than sanitizeLessonHtml: email/notification content needs images,
// inline styles (color/alignment/buttons), and table-based layout, none of
// which lesson content uses. Still strips scripts/event handlers/iframes.
export function sanitizeCommunicationHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li",
      "a", "img",
      "table", "tbody", "tr", "td",
      "div", "span", "hr", "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "style"],
      img: ["src", "alt", "width", "height", "style"],
      table: ["style", "width", "cellpadding", "cellspacing", "role"],
      td: ["style", "align", "valign", "colspan"],
      div: ["style", "align"],
      span: ["style"],
      p: ["style"],
      h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
      li: ["style"], ul: ["style"], ol: ["style"],
      blockquote: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/],
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-size": [/^\d+(px|em|%)$/],
        "font-weight": [/^\d+$|^bold$|^normal$/],
        padding: [/^\d+(px|em|%)?(\s+\d+(px|em|%)?){0,3}$/],
        margin: [/^\d+(px|em|%)?(\s+\d+(px|em|%)?){0,3}$/],
        "border-radius": [/^\d+(px|em|%)$/],
        width: [/^\d+(px|%)$/],
        height: [/^\d+(px|%)$/],
        display: [/^inline-block$|^block$|^none$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}

// Allowlist matches the RichTextEditor toolbar exactly: bold, italic, headings,
// bullet/ordered lists, paragraphs, and links. Nothing else survives.
export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "h1", "h2", "h3", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}
