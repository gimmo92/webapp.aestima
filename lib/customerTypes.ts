export interface Customer {
  id: string;
  name: string;
  contactName?: string;
  contactUserId?: string;
  email?: string;
  phone?: string;
  vat?: string;
  city?: string;
  address?: string;
  notes?: string;
}

export type CustomerInput = Omit<Customer, "id">;
