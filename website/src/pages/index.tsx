import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const APP_URL = 'https://remote-org-chart-plugin.onrender.com/';

/**
 * CSS/SVG mock of the actual app canvas — company node, person cards,
 * elbow connectors, chain highlight, selection ring, edge-case chip.
 * Pure markup: crisp at any DPI, themes with the site, no screenshot to
 * keep in sync.
 */
function ChartMock() {
  return (
    <div className={styles.mock} aria-hidden="true">
      <div className={styles.mockHeader}>
        <span className={styles.mockDot} />
        Live · 148 people
      </div>
      <svg className={styles.mockLines} viewBox="0 0 460 300" preserveAspectRatio="none">
        {/* Same centre-to-centre trick as the app: paths run from source
            centre to target centre and the opaque cards (higher z-index)
            hide the stubs, so lines meet card edges exactly. */}
        {/* Organisation → three roots (elbow bus) */}
        <path d="M230,38 L230,72 L80,72 L80,126" className={styles.mockLine} />
        <path d="M230,38 L230,72 L380,72 L380,126" className={styles.mockLine} />
        <path d="M230,38 L230,126" className={clsx(styles.mockLine, styles.mockLineChain)} />
        {/* Middle root → two reports */}
        <path d="M230,126 L230,188 L120,188 L120,250" className={clsx(styles.mockLine, styles.mockLineChain)} />
        <path d="M230,126 L230,188 L340,188 L340,250" className={styles.mockLine} />
      </svg>

      <div className={styles.mockOrg} style={{left: 230, top: 16}}>
        <span className={styles.mockOrgTitle}>Organisation</span>
        <span className={styles.mockOrgSub}>148 people · 9 branches</span>
      </div>

      <MockCard x={80} y={126} initials="AB" name="Abigail Baker" title="Senior Accountant" dept="FINANCE" color="#ec4899" />
      <MockCard x={230} y={126} initials="CR" name="Clara Robert" title="Marketing Director" dept="MARKETING" color="#3b82f6" chain />
      <MockCard x={380} y={126} initials="GC" name="Grace Contractor" title="UX Designer" dept="EXTERNAL" color="#64748b" chip="External manager" />
      <MockCard x={120} y={250} initials="KS" name="Kate Sibley" title="Dir. of Marketing" dept="MARKETING" color="#3b82f6" selected />
      <MockCard x={340} y={250} initials="KB" name="Kavita Bose" title="Digital Marketing" dept="MARKETING" color="#3b82f6" />
    </div>
  );
}

function MockCard({x, y, initials, name, title, dept, color, selected, chain, chip}: {
  x: number; y: number; initials: string; name: string; title: string;
  dept: string; color: string; selected?: boolean; chain?: boolean; chip?: string;
}) {
  return (
    <div
      className={clsx(
        styles.mockCard,
        selected && styles.mockCardSelected,
        chain && styles.mockCardChain,
      )}
      style={{left: x, top: y}}
    >
      <span className={styles.mockDept} style={{color}}>{dept}</span>
      <span className={styles.mockRow}>
        <span className={styles.mockAvatar} style={{color, background: `${color}1a`, borderColor: `${color}55`}}>
          {initials}
        </span>
        <span className={styles.mockText}>
          <span className={styles.mockName}>{name}</span>
          <span className={styles.mockTitle}>{title}</span>
        </span>
      </span>
      {chip && <span className={styles.mockChip}>⚠ {chip}</span>}
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={clsx('container', styles.heroInner)}>
        <div className={styles.heroCopy}>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>
            An org chart built on the Remote API: live data behind a
            server-side proxy, a snapshot fallback, and every messy
            hierarchy case — cycles, external managers, orphans — handled
            in the data layer, not hidden.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/getting-started">
              Get started
            </Link>
            <Link className="button button--secondary button--outline button--lg" to={APP_URL}>
              Open the app
            </Link>
          </div>
          <CodeBlock language="bash" className={styles.quickstart}>
            {`git clone https://github.com/Memnoc/remote-org-chart-plugin.git
npm install && npm run dev   # snapshot mode — no token needed`}
          </CodeBlock>
        </div>
        <ChartMock />
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Documentation for Remote Org Chart — interactive org hierarchies built on the Remote API.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
