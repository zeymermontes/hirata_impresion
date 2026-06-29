# Auth email templates

Brand-themed HTML to paste in **Supabase Dashboard → Authentication →
Email Templates**. Files are kept here in git for traceability — the
dashboard is the source of truth at send time.

| Supabase template      | File                  | Suggested subject                              |
| ---------------------- | --------------------- | ---------------------------------------------- |
| Confirm signup         | `confirm-signup.html` | Confirma tu cuenta en Hirata                   |
| Reset Password         | `recovery.html`       | Recupera tu contraseña de Hirata               |
| Magic Link             | `magic-link.html`     | Tu link mágico de acceso a Hirata              |
| Invite user            | `invite.html`         | Te invitaron a Hirata                          |
| Change Email Address   | `change-email.html`   | Confirma tu nuevo correo en Hirata             |

## Variables

Supabase substitutes these at send time:

- `{{ .ConfirmationURL }}` — full URL with the confirmation token
- `{{ .Email }}` — recipient address
- `{{ .NewEmail }}` — for the change-email template
- `{{ .Token }}` / `{{ .TokenHash }}` — OTP if you use them

## Logo

All templates reference `https://hirata.mx/hirata-logo.webp`. If the
production domain changes, update each template's `<img src=...>` to
match. Email clients block remote images by default, so the alt text
("Hirata") plus the tagline directly under it keep the brand readable.

## Why HTML in git when Supabase owns the live copy

- Reviewability: changes to copy / layout go through PR review.
- Disaster recovery: re-paste from git if the dashboard copy is lost.
- Consistency: keeps the auth emails visually aligned with the
  transactional ones rendered by `src/lib/email.ts`.
