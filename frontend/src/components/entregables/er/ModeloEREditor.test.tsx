import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { vi, describe, it, expect, beforeEach } from "vitest";

import ModeloEREditor from "./ModeloEREditor";
import type { ModeloER } from "@/lib/types/modelo-er.types";

vi.mock("./ERCanvas", () => ({
  default: () => <div data-testid="er-canvas-mock">ERCanvas</div>,
}));

vi.mock("./PanelEntidad", () => ({
  default: () => <div data-testid="panel-entidad-mock">PanelEntidad</div>,
}));

vi.mock("./PanelRelacion", () => ({
  default: () => <div data-testid="panel-relacion-mock">PanelRelacion</div>,
}));

function makeModel(overrides: Partial<ModeloER> = {}): ModeloER {
  return {
    id: "model-1",
    entregable_id: "artifact-1",
    proyecto_id: "project-1",
    nombre: "AS-IS Conceptual Diagram",
    descripcion: "",
    entidades: [],
    relaciones: [],
    comentarios: [],
    version_actual: "5",
    historial_versiones: [
      {
        version: "5",
        fecha: "2026-04-01T12:00:00Z",
        autor: "admin@arqdata.local",
        descripcion_cambio: "Current version",
      },
      {
        version: "v4",
        fecha: "2026-04-01T11:00:00Z",
        autor: "consultor@arqdata.local",
        descripcion_cambio: "Previous version",
      },
    ],
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T12:00:00Z",
    ...overrides,
  };
}

describe("ModeloEREditor - version preview/restore flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens preview modal from version history and supports v-prefixed version numbers", async () => {
    const user = userEvent.setup();
    const previewModel = makeModel({
      version_actual: "4",
      entidades: [
        {
          id: "ent-1",
          nombre: "Customer",
          descripcion: "",
          atributos: [],
          posicion_x: 0,
          posicion_y: 0,
        },
      ],
      relaciones: [],
    });
    const onPreviewVersion = vi.fn().mockResolvedValue(previewModel);

    render(
      <ModeloEREditor
        modelo={makeModel()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreviewVersion={onPreviewVersion}
        onRestoreVersion={vi.fn().mockResolvedValue(makeModel({ version_actual: "6" }))}
        isSaving={false}
        isGenerating={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "v5" }));
    await user.click(screen.getByRole("button", { name: "Previsualizar" }));

    await waitFor(() => expect(onPreviewVersion).toHaveBeenCalledWith(4));
    expect(await screen.findByText(/Vista previa de versi.n v4/i)).toBeInTheDocument();
  });

  it("restores version from preview modal", async () => {
    const user = userEvent.setup();
    const onRestoreVersion = vi.fn().mockResolvedValue(makeModel({ version_actual: "6" }));

    render(
      <ModeloEREditor
        modelo={makeModel()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreviewVersion={vi.fn().mockResolvedValue(makeModel({ version_actual: "4" }))}
        onRestoreVersion={onRestoreVersion}
        isSaving={false}
        isGenerating={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "v5" }));
    await user.click(screen.getByRole("button", { name: "Previsualizar" }));
    await user.click(await screen.findByRole("button", { name: /Restaurar versi.n/i }));

    expect(await screen.findByText(/Confirmar restauraci.n/i)).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: /Restaurar versi.n/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(onRestoreVersion).toHaveBeenCalledWith(4));
  });

  it("shows feedback modal when preview endpoint returns 404", async () => {
    const user = userEvent.setup();
    const axios404 = { isAxiosError: true, response: { status: 404 } } as unknown as Error;
    const isAxiosSpy = vi.spyOn(axios, "isAxiosError").mockImplementation(
      (value): value is axios.AxiosError => (value as { isAxiosError?: boolean })?.isAxiosError === true
    );

    render(
      <ModeloEREditor
        modelo={makeModel()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreviewVersion={vi.fn().mockRejectedValue(axios404)}
        onRestoreVersion={vi.fn().mockResolvedValue(makeModel({ version_actual: "6" }))}
        isSaving={false}
        isGenerating={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "v5" }));
    await user.click(screen.getByRole("button", { name: "Previsualizar" }));

    expect(
      await screen.findByText(/No se encontr.*versi.n v4.*previsualizar\./i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Entendido" }));
    expect(isAxiosSpy).toHaveBeenCalled();
  });

  it("does not show restore action in preview modal for read-only mode", async () => {
    const user = userEvent.setup();

    render(
      <ModeloEREditor
        modelo={makeModel()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreviewVersion={vi.fn().mockResolvedValue(makeModel({ version_actual: "4" }))}
        onRestoreVersion={vi.fn().mockResolvedValue(makeModel({ version_actual: "6" }))}
        isSaving={false}
        isGenerating={false}
        readOnly
      />
    );

    await user.click(screen.getByRole("button", { name: "v5" }));
    await user.click(screen.getByRole("button", { name: "Previsualizar" }));

    expect(await screen.findByText(/Vista previa de versi.n v4/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restaurar versiÃ³n" })).not.toBeInTheDocument();
  });
});
