// web/src/components/Hero.tsx
// Above-the-fold hero with launch badge, headline, subheadline, and waitlist CTA.
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <span className={styles.badge}>Launching Fall 2026</span>
        <h1 className={styles.headline}>
          Assembly management, <br />
          simplified
        </h1>
        <p className={styles.subheadline}>
          The all-in-one platform for organizing departments, assigning
          volunteers, and tracking attendance at assemblies and conventions.
        </p>
        <a
          href="https://forms.gle/9NSgriXSmg2cHNnF9"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btn}>
          Join the waitlist
        </a>
      </div>
    </section>
  );
}
