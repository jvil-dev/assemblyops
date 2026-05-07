// web/src/components/FeatureCard.tsx
// Single white rounded card with title + body, used in FeaturesSection's grid.
import styles from "./FeatureCard.module.css";

type Props = {
  title: string;
  body: string;
};

export default function FeatureCard({ title, body }: Props) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
    </article>
  );
}
