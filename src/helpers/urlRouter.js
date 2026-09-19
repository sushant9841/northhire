// Real URL <-> in-app page-key translation. The app itself still navigates by setting a
// `pg` string (see useStore.js's `go`) - this module just keeps that in sync with
// window.location so refresh, browser back/forward, and shared links all work.
//
// Each ROUTES entry may declare a `path` template with at most one `:id` segment. Which
// piece of store state fills that `:id` (jobId, empId, blogId, ...) is declared here rather
// than in routes.js, since routes.js has no knowledge of the store's state shape.
export const ID_STATE_FOR_ROUTE = {
  job: "jobId", employer: "empId", blog: "blogId", training: "trainingId",
  empCandidate: "candidateId", cvEdit: "cvId", empBlogEdit: "editId", empTrainEdit: "editId",
  invite: "inviteToken", offer: "offerToken",
  // H4 - Employee Profile as a real, linkable page (/hr/people/:id), separate from `empId`
  // (which is already the PUBLIC employer id used by the /employers/:id route).
  hrProfileView: "hrEmpId",
};

export function buildPath(routes, pg, id) {
  const r = routes[pg];
  if (!r?.path) return null;
  return id != null ? r.path.replace(":id", encodeURIComponent(id)) : r.path;
}

// Finds the route (and any :id it carries) matching a real pathname. Longer/more-specific
// static paths are checked before templated ones so e.g. "/jobs/new" (if it existed) would
// never be swallowed by "/jobs/:id" - not currently a collision, but keeps this safe to extend.
export function matchPath(routes, pathname) {
  const clean = (pathname || "/").replace(/\/+$/, "") || "/";
  const entries = Object.entries(routes).filter(([, r]) => r.path);
  const staticMatch = entries.find(([, r]) => !r.path.includes(":id") && r.path === clean);
  if (staticMatch) return { pg: staticMatch[0], id: null };
  for (const [pg, r] of entries) {
    if (!r.path.includes(":id")) continue;
    const [prefix, suffix = ""] = r.path.split(":id");
    if (clean.startsWith(prefix) && clean.endsWith(suffix) && clean.length > prefix.length + suffix.length) {
      const id = decodeURIComponent(clean.slice(prefix.length, clean.length - suffix.length));
      if (id && !id.includes("/")) return { pg, id };
    }
  }
  return null;
}
