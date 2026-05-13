import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RelacionEdgeComponent from "./RelacionEdge";

vi.mock("@xyflow/react", () => ({
  BaseEdge: ({ path }: { path: string }) => <div data-testid="base-edge" data-path={path} />,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  getSmoothStepPath: () => ["M 0 0 L 100 100", 50, 50],
}));

describe("RelacionEdgeComponent", () => {
  it("renders source and target crowfoot notations when provided", () => {
    render(
      <RelacionEdgeComponent
        id="rel-1"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        sourcePosition="right"
        targetPosition="left"
        source="ent-a"
        target="ent-b"
        selected={false}
        data={{
          nombre: "customer_orders",
          cardinalidad: "1:N",
          sourceNotation: "|<",
          targetNotation: "O|",
          seleccionada: false,
          onSelect: vi.fn(),
          comentariosCount: 1,
        }}
      />
    );

    expect(screen.getByText("|<")).toBeInTheDocument();
    expect(screen.getByText("O|")).toBeInTheDocument();
    expect(screen.getByText("customer_orders")).toBeInTheDocument();
    expect(screen.getByText("1:N")).toBeInTheDocument();
  });
});
