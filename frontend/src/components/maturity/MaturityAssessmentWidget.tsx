import React from "react";

import { MaturityConsultorView } from "./MaturityConsultorView";

interface MaturityAssessmentWidgetProps {
  projectId: string;
  phase?: string;
}

export const MaturityAssessmentWidget: React.FC<MaturityAssessmentWidgetProps> = ({
  projectId,
}) => <MaturityConsultorView projectId={projectId} />;
