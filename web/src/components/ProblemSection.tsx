// web/src/components/ProblemSection.tsx
// "One app, five departments" — pitch paragraph covering all five departments.
import styles from "./ProblemSection.module.css";

export default function ProblemSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>One app, five departments</h2>
        <p className={styles.body}>
          Whether you're filling attendant posts across multiple sessions,
          assigning audio operators to mixers, figuring out who's running
          cameras, coordinating stage assignments, or organizing parking
          coverage — the work behind an assembly doesn't stop when the program
          starts. AssemblyOps gives every department the tools to schedule
          volunteers, track attendance, and stay coordinated — all from one app.
        </p>
      </div>
    </section>
  );
}
