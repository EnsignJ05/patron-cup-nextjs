/** Backdrop for a dialog (desktop) or bottom sheet (mobile) -- positions via .ad-scrim/.ad-scrim.sheet. */
export default function AdminScrim({
  children,
  sheet,
}: {
  children: React.ReactNode;
  /** Mobile bottom-sheet variant: content slides up from the bottom edge instead of centering. */
  sheet?: boolean;
}) {
  return <div className={`ad-scrim${sheet ? ' sheet' : ''}`}>{children}</div>;
}
