import DOMPurify from "dompurify";

/* RichText's toolbar only ever produces bold/italic/underline/lists/links via document.execCommand,
   but the same HTML string round-trips through localStorage and seed data with no other gate before
   it's rendered via dangerouslySetInnerHTML — so every render site sanitizes on the way out. */
export const sanitizeHtml = (html) =>
  DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "br", "p", "div", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
