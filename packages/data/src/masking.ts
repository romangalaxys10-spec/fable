export class DataMasker {
  private static readonly EMAIL_REGEX = /([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})/g;
  private static readonly CC_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  private static readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  private static readonly JWT_REGEX = /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g;
  private static readonly BEARER_REGEX = /Bearer\s+[a-zA-Z0-9_.\-~+/=]+/gi;

  static maskEmail(text: string): string {
    return text.replace(this.EMAIL_REGEX, (match, user, domain, tld) => {
      const visible = user.slice(0, 2);
      return `${visible}***@${domain}.${tld}`;
    });
  }

  static maskCreditCard(text: string): string {
    return text.replace(this.CC_REGEX, (match) => {
      const clean = match.replace(/[\s-]/g, '');
      const last4 = clean.slice(-4);
      return `****-****-****-${last4}`;
    });
  }

  static maskSecrets(text: string): string {
    return text
      .replace(this.JWT_REGEX, '[REDACTED_JWT_TOKEN]')
      .replace(this.BEARER_REGEX, 'Bearer [REDACTED_AUTH_TOKEN]')
      .replace(this.SSN_REGEX, '***-**-****');
  }

  static maskPayload<T extends Record<string, any>>(obj: T): T {
    const serialized = JSON.stringify(obj);
    const masked = this.maskSecrets(this.maskCreditCard(this.maskEmail(serialized)));
    return JSON.parse(masked);
  }
}
