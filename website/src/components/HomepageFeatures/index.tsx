import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  emoji: string;
  title: string;
  to: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    emoji: '🌳',
    title: 'Interactive org tree',
    to: '/features',
    description: (
      <>
        Pan, zoom, and collapse a forest of reporting trees. Reporting-chain highlight,
        subtree focus, search, department filters, and a list view.
      </>
    ),
  },
  {
    emoji: '🔌',
    title: 'Live API + snapshot',
    to: '/api-integration',
    description: (
      <>
        Express proxies the Remote API server-side and falls back to a committed snapshot,
        so a reviewer always sees a working chart.
      </>
    ),
  },
  {
    emoji: '🧭',
    title: 'Handles messy data',
    to: '/edge-cases',
    description: (
      <>
        No manager, external managers, dangling references, reporting cycles, missing
        fields, multiple roots — each handled explicitly, not assumed away.
      </>
    ),
  },
];

function Feature({emoji, title, to, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={to} className={styles.featureCard}>
        <div className={styles.featureEmoji} role="img" aria-hidden="true">
          {emoji}
        </div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
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
