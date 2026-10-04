export function phoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/** Ultime 9 cifre: tollera +39, spazi e zeri di prefisso. */
export function phoneKey(phone: string | null | undefined): string {
  const digits = phoneDigits(phone);
  if (digits.length < 6) return "";
  return digits.slice(-9);
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const ka = phoneKey(a);
  const kb = phoneKey(b);
  return Boolean(ka) && ka === kb;
}

export type CallerRef = {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type TicketCallerRef = {
  id: string;
  summary: string;
  status: string;
  customerId?: string | null;
  customerName?: string | null;
  customerCompany?: string | null;
  customerPhone?: string | null;
};

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = a?.trim().toLowerCase() ?? "";
  const right = b?.trim().toLowerCase() ?? "";
  return Boolean(left) && left === right;
}

export function matchCustomer<T extends CallerRef>(
  phone: string,
  customers: T[]
): T | null {
  return customers.find((customer) => phonesMatch(customer.phone, phone)) ?? null;
}

export function ticketBelongsToCaller(
  ticket: TicketCallerRef,
  phone: string,
  customer: CallerRef | null
): boolean {
  if (phonesMatch(ticket.customerPhone, phone)) return true;
  if (!customer) return false;
  if (ticket.customerId && ticket.customerId === customer.id) return true;
  if (
    sameText(ticket.customerName, customer.name) ||
    sameText(ticket.customerName, customer.contactName)
  ) {
    return true;
  }
  return sameText(ticket.customerCompany, customer.name);
}

export function openTicketsForCaller(
  tickets: TicketCallerRef[],
  phone: string,
  customer: CallerRef | null,
  terminalStatuses: string[]
): TicketCallerRef[] {
  const closed = new Set(terminalStatuses);
  return tickets.filter(
    (ticket) =>
      !closed.has(ticket.status) &&
      ticketBelongsToCaller(ticket, phone, customer)
  );
}
