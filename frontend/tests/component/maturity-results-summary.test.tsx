import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MaturityResultsSummary } from "@/components/maturity/MaturityResultsSummary";

describe("MaturityResultsSummary", () => {
  it("renders summary and allows expanding dimension details", async () => {
    render(
      <MaturityResultsSummary
        overallScore={3.75}
        overallPercent={75}
        respondentCount={2}
        results={[
          {
            dimensionId: 1,
            dimensionName: "Gobernanza de Datos",
            score: 3.75,
            percent: 75,
            weight: 0.12,
            questionCount: 4,
            subdomains: [
              {
                subdomainId: 1,
                subdomainName: "Estrategia y Roadmap",
                score: 4,
                percent: 80,
                questionCount: 1,
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText("Puntuación General de Madurez")).toBeInTheDocument();
    expect(screen.getByText("Respondentes:")).toBeInTheDocument();
    expect(screen.getByText("Resultados por Dimensión y Subdominio")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Gobernanza de Datos/i }));
    expect(screen.getByText("Estrategia y Roadmap")).toBeInTheDocument();
  });
});
