import React from "react";

import { MaturityConsultorView } from "./MaturityConsultorView";
import { MaturityEmpresaReadOnlyView } from "./MaturityEmpresaReadOnlyView";

interface MaturityAssessmentIntegratedProps {
  projectId: string;
  phase?: string;
  isConsultor?: boolean;
  consultorId?: string;
}

export const MaturityAssessmentIntegrated: React.FC<MaturityAssessmentIntegratedProps> = ({
  projectId,
  isConsultor = false,
}) => {
  if (isConsultor) {
    return <MaturityConsultorView projectId={projectId} />;
  }

  return <MaturityEmpresaReadOnlyView projectId={projectId} />;
};
