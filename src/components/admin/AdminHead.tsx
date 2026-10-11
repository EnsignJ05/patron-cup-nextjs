import Link from 'next/link';
import { AIcon } from './AdminIcons';

type AdminHeadProps = {
  /** Breadcrumb segment after "Admin", e.g. "Courses". Omit for the dashboard hub itself. */
  crumb?: string;
  title: string;
  sub?: string;
  /** Page actions (buttons), rendered at the trailing edge. */
  actions?: React.ReactNode;
};

/**
 * Per-page admin header: breadcrumb, title, subtitle, action buttons. One responsive
 * component rather than separate desktop/mobile versions -- same approach as every other
 * page in this redesign (see AGENTS.md's Design system section).
 */
export default function AdminHead({ crumb, title, sub, actions }: AdminHeadProps) {
  return (
    <div className="ad-head">
      <div>
        <div className="ad-crumb">
          <Link href="/admin/dashboard" className="ad-crumb-link">
            <AIcon name="back" size={12} />
            <span>Admin</span>
          </Link>
          {crumb && (
            <>
              <span className="sep">/</span>
              <span>{crumb}</span>
            </>
          )}
        </div>
        <h1 className="ad-head-title">{title}</h1>
        {sub && <p className="ad-sub">{sub}</p>}
      </div>
      {actions && <div className="ad-head-actions">{actions}</div>}
    </div>
  );
}
