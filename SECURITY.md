# Security Policy

## Reporting a Vulnerability

The security of Jacare is important to us. If you discover a security vulnerability, please report it responsibly.

**Please do NOT:**
- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly until it has been addressed

**To report a security vulnerability:**

1. **Email:** Send details to the maintainer at **luandev** via GitHub's private vulnerability reporting feature:
   - Go to https://github.com/luandev/jacare/security/advisories/new
   - Click "Report a vulnerability"
   - Fill in the details of the vulnerability

2. **Alternative contact:** If you prefer not to use GitHub's reporting feature, you can create a private security advisory or reach out through GitHub Issues with a generic title (e.g., "Security concern - please contact me") and we'll follow up with a secure communication channel.

**Please include in your report:**
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations (if applicable)
- Your contact information for follow-up questions

## Response Timeline

- **Initial Response:** We aim to acknowledge your report within 48-72 hours
- **Status Updates:** You will receive updates on our progress at least every 7 days
- **Resolution:** We will work to address confirmed vulnerabilities as quickly as possible, typically within 30-90 days depending on severity and complexity

## Disclosure Policy

- We will coordinate with you on the disclosure timeline
- We prefer to disclose vulnerabilities after a fix is available
- You will be credited for your discovery (unless you prefer to remain anonymous)
- We may request that you delay public disclosure until affected users have had time to update

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

**Recommendation:** Always use the latest version of Jacare to ensure you have the most recent security patches and improvements.

You can check for updates:
- [GitHub Releases](https://github.com/luandev/jacare/releases)
- [GitHub Container Registry](https://github.com/luandev/jacare/pkgs/container/jacare) for container images

## Security Best Practices

When using Jacare, we recommend the following security practices:

### For Users

1. **Keep Updated:** Regularly update to the latest version
2. **Network Security:** If exposing the web interface, use a reverse proxy with HTTPS and authentication
3. **File Permissions:** Ensure your library and data directories have appropriate file permissions
4. **Download Safety:** Only download ROMs from trusted sources
5. **Firewall:** If running locally, consider restricting network access to localhost only

### For Developers

1. **Dependencies:** Keep dependencies updated and monitor for known vulnerabilities
2. **Code Review:** All code changes should be reviewed before merging
3. **Input Validation:** Always validate and sanitize user inputs
4. **Secrets:** Never commit API keys, passwords, or other sensitive data
5. **Testing:** Run security scanning tools (ESLint, CodeQL) before releases

## Known Security Considerations

- **Local-First Design:** Jacare is designed to run locally and store data on your machine. Be aware of who has access to your system.
- **Network Access:** The web interface (default port 3333) should not be exposed to the internet without proper authentication and HTTPS.
- **External Metadata:** Jacare fetches metadata from Crocdb API. This external service is cached locally but requires network access.
- **Downloads:** ROM downloads are disabled by default. Enable only if you trust your sources and understand the legal implications.

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed and fixed. Updates will be announced through:

- GitHub Security Advisories
- GitHub Releases with security tags
- CHANGELOG.md with security notes

## Questions?

If you have questions about this security policy or Jacare's security in general, please open a GitHub issue with the `security` label or contact the maintainer through GitHub.

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities and helping keep Jacare safe for everyone.
