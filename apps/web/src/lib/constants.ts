// Shared UI constants (review L12) — the values that used to be scattered
// string/number literals with nothing keeping them in sync.

/** The xl breakpoint: at/above it the draft studio is the side panel; below
    it the OVERLAY (bottom sheet under md, right drawer md–xl — R20). Must
    match Tailwind's `xl:` usage in App/Thread. */
export const XL_QUERY = "(min-width: 1280px)";

/** The md breakpoint: below it the view/source rail lives in the drawer.
    Must match the `md:hidden` on the drawer overlay and the hamburger (R9). */
export const MD_QUERY = "(min-width: 768px)";

/** Row exit animation length. The CSS class reads this via inline
    animationDuration (TS is the single source; the keyframe's own duration
    is only a fallback) and exitThenCommit delays the data flip by it. */
export const EXIT_MS = 150;

/** Mock latencies — the fake work rhythm of the diegetic prototype. */
export const MOCK_SYNC_MS = 650;
export const MOCK_ANGLES_MS = 620;
export const MOCK_ITERATE_MS = 520;

/** One preview-truncation rule for list snippets (was duplicated between
    sendMock and the fixture generator). */
export const PREVIEW_MAX = 64;
export function toPreview(body: string): string {
  return body.length > PREVIEW_MAX ? `${body.slice(0, PREVIEW_MAX - 3)}…` : body;
}
