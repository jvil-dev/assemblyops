// web/src/components/FeaturesSection.tsx
// "Made for the work behind the program" — three feature cards in a responsive grid.
import FeatureCard from "./FeatureCard";
import styles from "./FeaturesSection.module.css";

export default function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>Made for the work behind the program</h2>
        <div className={styles.grid}>
          <FeatureCard
            title="Organized from the first session"
            body="Give every volunteer their assignment, location, and time in one place. Volunteers confirm from their phone before the  
  doors open - so you know who's assigned where, and where you still need coverage."
          />
          <FeatureCard
            title="Reach your whole department instantly"
            body="Send updates to individual volunteers, your keymen, or the whole department with a tap. Push notifications make sure 
  last-minute changes reach everyone."
          />
          <FeatureCard
            title="Delegate to your assistants and keymen"
            body="Give assistant overseers and keymen the access they need in the app. They handle their part of the department while you 
  keep the full picture."
          />
        </div>
      </div>
    </section>
  );
}
