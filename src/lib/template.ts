export function replaceTemplateVariables(
  body: string,
  contact: { firstName: string; companyName: string | null; email: string },
  unsubscribeUrl: string
): string {
  return body
    .replaceAll("{{firstName}}", contact.firstName)
    .replaceAll("{{companyName}}", contact.companyName ?? "")
    .replaceAll("{{email}}", contact.email)
    .replaceAll("{{unsubscribeUrl}}", unsubscribeUrl);
}
