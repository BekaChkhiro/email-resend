type ContactForTemplate = {
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  companyName: string | null;
  companyIndustry?: string | null;
  location?: string | null;
  country?: string | null;
  email: string;
};

export function replaceTemplateVariables(
  body: string,
  contact: ContactForTemplate,
  unsubscribeUrl?: string
): string {
  let result = body
    .replaceAll("{{firstName}}", contact.firstName)
    .replaceAll("{{lastName}}", contact.lastName ?? "")
    .replaceAll("{{title}}", contact.title ?? "")
    .replaceAll("{{companyName}}", contact.companyName ?? "")
    .replaceAll("{{companyIndustry}}", contact.companyIndustry ?? "")
    .replaceAll("{{location}}", contact.location ?? "")
    .replaceAll("{{country}}", contact.country ?? "")
    .replaceAll("{{email}}", contact.email);

  if (unsubscribeUrl) {
    result = result.replaceAll("{{unsubscribeUrl}}", unsubscribeUrl);
  }

  return result;
}
