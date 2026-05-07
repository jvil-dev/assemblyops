// web/src/components/Footer.tsx
// Bottom footer with logo, tagline, and copyright.
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <img src="/icon.svg" alt="AssemblyOps logo" className={styles.logo} />
        <p className={styles.tagline}>Built for the work behind the program.</p>
        <p className={styles.copyright}>© 2026 AssemblyOps</p>
      </div>
    </footer>
  );
}
