import Link from "next/link";

export function NormalSupplementGuidance() {
  return (
    <div className="supplement-guidance">
      <div>
        <p className="eyebrow">Medicine and supplements</p>
        <h3>No routine medicine is suggested</h3>
        <p>
          The recognized results are within their listed ranges. This automated report
          does not identify a reason to start a medicine.
        </p>
      </div>
      <div className="supplement-options">
        <div>
          <strong>Standard multivitamin/mineral</strong>
          <p>
            Consider one only when a clinician or dietitian identifies a dietary gap,
            restricted diet, life-stage need, or other risk. Avoid high-dose products.
          </p>
        </div>
        <div>
          <strong>Targeted nutrients</strong>
          <p>
            Iron, vitamin B12, vitamin D, calcium, and similar supplements should match a
            confirmed need rather than being started from a normal report.
          </p>
        </div>
        <div>
          <strong>Health essentials</strong>
          <p>
            Prefer varied food, regular activity, adequate sleep, hydration, preventive
            checkups, and vaccines recommended for your age and health history.
          </p>
        </div>
      </div>
      <p className="muted small supplement-note">
        Supplements can interact with medicines and affect some lab tests. Ask a doctor or
        pharmacist before starting one, especially during pregnancy, before surgery, or if
        you have a long-term condition.
      </p>
    </div>
  );
}

export function MedicineOptions({ medicines }: { medicines: string[] }) {
  const uniqueMedicines = [...new Set(medicines)];

  return (
    <section className="card">
      <p className="eyebrow">Treatment discussion</p>
      <h2>Medicines or supplements a clinician may consider</h2>
      <p className="lead medicine-intro">
        These options are related to the flagged results, but the report alone cannot
        confirm a diagnosis, the right product, or a safe dose.
      </p>

      {uniqueMedicines.length ? (
        <ul className="medicine-option-list">
          {uniqueMedicines.map((medicine) => (
            <li key={medicine}>
              <strong>{medicine}</strong>
              <span>Discuss after the result and possible cause are confirmed.</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="notice notice-in-card">
          No specific medicine can be safely associated with the recognized abnormal
          result. The underlying cause needs clinical assessment first.
        </div>
      )}

      <div className="medicine-actions">
        <Link className="button button-secondary button-small" href="/nearby">
          Find a hospital or clinic
        </Link>
        <Link className="button button-secondary button-small" href="/nearby">
          Find a nearby pharmacy
        </Link>
      </div>
      <div className="disclaimer">
        Do not start, stop, combine, purchase, or change the dose of a medicine or
        supplement from this automated report. Review allergies, pregnancy, kidney or
        liver health, existing medicines, and possible interactions with a qualified
        clinician or pharmacist.
      </div>
    </section>
  );
}
