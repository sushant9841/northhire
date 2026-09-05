/* JSON.stringify silently turns Infinity/-Infinity into null, which corrupts any "unlimited"
   business value (Enterprise's unlimited job count, an open-ended tax bracket ceiling) the moment
   it crosses a network boundary or a database column. This sentinel-string replacer/reviver pair
   round-trips those values losslessly - used as Express's global `json replacer` (server/index.js)
   and platformConfig.js's DB storage on the way out, and by the client's fetch wrapper (api.js) on
   the way back in. The sentinel strings are specific enough that no real field value should ever
   collide with them. */
export function infinityReplacer(_key, value) {
  return value === Infinity ? "__Infinity__" : value === -Infinity ? "__-Infinity__" : value;
}
export function infinityReviver(_key, value) {
  return value === "__Infinity__" ? Infinity : value === "__-Infinity__" ? -Infinity : value;
}
