// Fixed top navbar with the AssemblyOps logo

import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img src="/icon.svg" alt="AssemblyOps logo" className={styles.logo} />
          <span className={styles.wordmark}>AssemblyOps</span>
        </div>
      </div>
    </nav>
  );
}
