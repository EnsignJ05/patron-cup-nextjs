import Link from 'next/link';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import { ADMIN_NAV_GROUPS } from '@/lib/adminNavGroups';
import styles from './page.module.css';

export default function AdminDashboard() {
  const totalTools = ADMIN_NAV_GROUPS.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className={styles.root}>
      <AdminHead title="Admin" sub={`Run the Cup. ${ADMIN_NAV_GROUPS.length} areas, ${totalTools} tools.`} />

      <div className={styles.groupList}>
        {ADMIN_NAV_GROUPS.map((group) => (
          <section key={group.name}>
            <div className={styles.groupHeader}>
              <span className={styles.groupDot} style={{ background: group.color }} />
              <h2 className={styles.groupName}>{group.name}</h2>
              <span className={styles.groupRule} />
              <span className={styles.groupCount}>{group.items.length}</span>
            </div>
            <div className={styles.tileGrid}>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="ad-card ad-gcard">
                  <div className={styles.tileTop}>
                    <div
                      className={styles.tileIcon}
                      style={{ background: `color-mix(in oklab, ${group.color} 14%, transparent)`, color: group.color }}
                    >
                      <AIcon name={item.icon} size={20} />
                    </div>
                    <span className={styles.tileChevron}>
                      <AIcon name="chev" size={16} />
                    </span>
                  </div>
                  <div>
                    <div className={styles.tileTitle}>{item.label}</div>
                    <div className={styles.tileDescription}>{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
