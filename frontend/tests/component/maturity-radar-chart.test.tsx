import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MaturityRadarChart } from "@/components/maturity/MaturityRadarChart";

describe("MaturityRadarChart", () => {
  const data = [
    { dimension: "Gobernanza de Datos", score: 3.5, fullMark: 5 },
    { dimension: "Arquitectura de Datos", score: 4.0, fullMark: 5 },
  ];

  it("renders only domain radar context and hides old subdomain legend", async () => {
    render(<MaturityRadarChart data={data} title="Gráfico de Araña - Evaluación de Madurez" />);

    expect(
      screen.getByRole("heading", { name: "Gráfico de Araña - Evaluación de Madurez" })
    ).toBeInTheDocument();
    expect(screen.getByText("2 de 2 dominios seleccionados")).toBeInTheDocument();
    expect(screen.getByText("Gráfico de Araña:")).toBeInTheDocument();
    expect(screen.queryByText("Subdominios (promedio)")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ninguno" }));
    expect(screen.getByText("Selecciona al menos un dominio")).toBeInTheDocument();
  });
});
