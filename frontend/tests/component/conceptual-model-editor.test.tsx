import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ModeloEREditor from "@/components/entregables/er/ModeloEREditor";
import type { ModeloER } from "@/lib/types/modelo-er.types";

vi.mock("@/components/entregables/er/ERCanvas", () => ({
  default: () => <div data-testid="er-canvas-mock">ERCanvas</div>,
}));

vi.mock("@/components/entregables/er/PanelEntidad", () => ({
  default: () => <div data-testid="panel-entidad-mock">PanelEntidad</div>,
}));

vi.mock("@/components/entregables/er/PanelRelacion", () => ({
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

describe("Conceptual editor flow", () => {
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
    expect(await screen.findByText(/Vista previa de versi/i)).toBeInTheDocument();
  });

  it("restores version from confirmation modal", async () => {
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
    await user.click(await screen.findByRole("button", { name: /Restaurar versi/i }));

    expect(await screen.findByText(/Confirmar restauraci/i)).toBeInTheDocument();
    const restoreButtons = screen.getAllByRole("button", { name: /Restaurar versi/i });
    await user.click(restoreButtons[restoreButtons.length - 1]);

    await waitFor(() => expect(onRestoreVersion).toHaveBeenCalledWith(4));
  });

  it("does not call restore when confirmation is cancelled", async () => {
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
    await user.click(await screen.findByRole("button", { name: /Restaurar versi/i }));

    expect(await screen.findByText(/Confirmar restauraci/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByText(/Confirmar restauraci/i)).not.toBeInTheDocument());
    expect(onRestoreVersion).not.toHaveBeenCalled();
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

    expect(await screen.findByText(/No se encontr/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Entendido" }));
    await waitFor(() => expect(screen.queryByText(/No se encontr/i)).not.toBeInTheDocument());
    expect(isAxiosSpy).toHaveBeenCalled();
  });

  it("shows generic feedback modal for non-404 preview errors", async () => {
    const user = userEvent.setup();
    vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

    render(
      <ModeloEREditor
        modelo={makeModel()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreviewVersion={vi.fn().mockRejectedValue(new Error("boom"))}
        onRestoreVersion={vi.fn().mockResolvedValue(makeModel({ version_actual: "6" }))}
        isSaving={false}
        isGenerating={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "v5" }));
    await user.click(screen.getByRole("button", { name: "Previsualizar" }));

    expect(await screen.findByText(/No fue posible previsualizar la versi/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/Vista previa de versi/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restaurar versi/i })).not.toBeInTheDocument();
  });
});
