import type { ConditionMapping } from "@/lib/types";

export function ConditionGuidanceCard({ mapping }: { mapping: ConditionMapping }) {
  return (
    <section className="card">
      <p className="eyebrow">
        Related to {mapping.testName} · {mapping.direction}
      </p>
      <h2>{mapping.conditionName}</h2>
      <p>{mapping.description}</p>
      <div className="two-column">
        <div className="guidance-box">
          <h3>Diet guidance</h3>
          <p>{mapping.dietAdvice}</p>
        </div>
        <div className="guidance-box">
          <h3>Activity guidance</h3>
          <p>{mapping.exerciseAdvice}</p>
        </div>
      </div>
      <div className="recommendation">
        <strong>Best recommendation:</strong> Consult a{" "}
        <strong>{mapping.consultSpecialty}</strong> to confirm the cause and receive an
        individual plan. {mapping.severityNote}
      </div>
      {!!mapping.medicines.length && (
        <>
          <h3>Medicines a doctor may consider</h3>
          <p className="muted small">For discussion only—this is not a prescription.</p>
          <ul className="medicine-list">
            {mapping.medicines.map((medicine) => (
              <li key={medicine}>{medicine}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
