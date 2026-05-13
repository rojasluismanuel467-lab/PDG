import React from "react";

import { MaturityEmpresaReadOnlyView } from "./MaturityEmpresaReadOnlyView";

interface MaturityEmpresaViewProps {
  projectId: string;
  phase?: string;
  empresaId?: string;
  empresaNombre?: string;
}

export const MaturityEmpresaView: React.FC<MaturityEmpresaViewProps> = ({
  projectId,
}) => <MaturityEmpresaReadOnlyView projectId={projectId} />;
