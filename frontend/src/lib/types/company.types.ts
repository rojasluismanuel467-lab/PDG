export interface CompanyResponse {
  id: string;
  name: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyListResponse {
  total: number;
  items: CompanyResponse[];
}

export interface CreateCompanyRequest {
  name: string;
  contact_email: string;
}
