import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

function TreeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="5" rx="1.5" />
      <rect x="3" y="16" width="6" height="5" rx="1.5" />
      <rect x="15" y="16" width="6" height="5" rx="1.5" />
      <path d="M12 8v4M12 12H6v4M12 12h6v4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M6 7.2v9.6M8 6.2c4 1 7.5 2.6 7.9 4M8 17.8c4-1 7.5-2.6 7.9-4" />
    </svg>
  );
}

type FeatureItem = {
  icon: ReactNode;
  title: string;
  to: string;
  description: ReactNode;
  linkLabel: string;
};

const FeatureList: FeatureItem[] = [
  {
    icon: <TreeIcon />,
    title: 'The whole org, one tree',
    to: '/features',
    linkLabel: 'Features',
    description: (
      <>
        148 active people across 9 real roots, joined under a render-only
        Organisation node — nobody hidden. Search, department filters with
        context dimming, subtree focus, reporting-chain highlight, stats,
        CSV export.
      </>
    ),
  },
  {
    icon: <ShieldIcon />,
    title: 'Proxy, cache, fallback',
    to: '/architecture',
    linkLabel: 'Architecture',
    description: (
      <>
        Express keeps the API token off the browser and acts as a PII
        filter — six org fields cross the wire, nothing else. Five-minute
        cache over the N+1 fetch; a committed snapshot serves when the
        live API can&apos;t.
      </>
    ),
  },
  {
    icon: <BranchIcon />,
    title: 'Edge cases in the data layer',
    to: '/edge-cases',
    linkLabel: 'Edge cases',
    description: (
      <>
        Reporting cycles broken at build time, external managers and
        dangling references promoted to labelled roots, all-null records
        dropped — each case unit-tested and badged in the UI, not assumed
        away.
      </>
    ),
  },
];

function Feature({icon, title, to, description, linkLabel}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={to} className={styles.featureCard}>
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <span className={styles.featureLink}>{linkLabel} →</span>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
