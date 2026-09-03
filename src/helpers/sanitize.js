import DOMPurify from "dompurify";

/* RichText's toolbar only ever produces bold/italic/underline/lists/links/images via
   document.execCommand/insertHTML, but the same HTML string round-trips through localStorage
   and seed data with no other gate before it's rendered via dangerouslySetInnerHTML — so every
   render site sanitizes on the way out. `img`+`src` is safe to allow here: DOMPurify already
   strips javascript:-scheme sources by default, and event-handler attributes (onerror etc.)
   are never in ALLOWED_ATTR, so there's no script-execution path through an <img> tag. */
export const sanitizeHtml = (html) =>
  DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "br", "p", "div", "span", "img"],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt"],
  });
