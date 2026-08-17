import type { TestResult } from "@/lib/types";

function ResultStatus({ result }: { result: TestResult }) {
  const label = result.direction === "unknown" ? "Range unknown" : result.direction;
  return (
    <span className={`status status-${result.isAbnormal ? "abnormal" : "normal"}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

export function ReportResultsTable({ results }: { results: TestResult[] }) {
  if (!results.length) return null;

  return (
    <section className="card">
      <h2>Test results</h2>
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Value</th>
              <th>Reference range</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr
                className={result.isAbnormal ? "row-abnormal" : ""}
                key={`${result.testName}-${index}`}
              >
                <td>
                  <strong>{result.testName}</strong>
                </td>
                <td>
                  {result.value} {result.unit}
                </td>
                <td>
                  {result.normalMin !== null && result.normalMax !== null
                    ? `${result.normalMin}–${result.normalMax} ${result.unit}`
                    : "Not available"}
                </td>
                <td>
                  <ResultStatus result={result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
