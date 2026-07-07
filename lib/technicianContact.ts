/** Link mailto con oggetto e corpo precompilati. */
export function mailtoLink(
  email: string,
  subject: string,
  body: string
): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Link WhatsApp con messaggio precompilato (phone in formato internazionale). */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
