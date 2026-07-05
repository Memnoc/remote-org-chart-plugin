/**
 * IS_SAFARI — gates WebKit-only rendering workarounds.
 *
 * Safari (Mac + iOS; every iOS browser is WebKit) paints the HTML inside an
 * SVG <foreignObject> at the top SVG's origin — ignoring ancestor <g>
 * transforms — when that HTML uses `position`, `transform`, or `transition`
 * (WebKit bug 23113, open since 2009; react-d3-tree issue #284). Node cards
 * drop those properties when this is true; everything else is unaffected.
 *
 * Detection is the snippet from issue #284: vendor is "Apple Computer" only
 * in real Safari/WebKit — Chrome and Edge match /Safari/ in the UA but not
 * the vendor.
 */
export const IS_SAFARI =
  typeof navigator !== 'undefined' &&
  /Safari/.test(navigator.userAgent) &&
  /Apple Computer/.test(navigator.vendor)
