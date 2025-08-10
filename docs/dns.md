# Custom Domain on Fleek — DNS Quickstart

There are two common cases:

## 1) Subdomain (recommended)
Example: `app.yourdomain.com`

- Create a **CNAME** record:
```
Type:   CNAME
Name:   app
Value:  <FLEEK_EDGE_TARGET>
TTL:    300
```
You will get `<FLEEK_EDGE_TARGET>` (the target hostname) from the Fleek dashboard when you add the domain to your site.

## 2) Apex domain
Example: `yourdomain.com`

Use one of the following (depending on your DNS provider):

- **ALIAS/ANAME** (preferred if supported):
```
Type:   ALIAS (or ANAME)
Name:   @
Value:  <FLEEK_EDGE_TARGET>
TTL:    300
```
- **CNAME flattening** (if your DNS supports it): point a CNAME at the apex to `<FLEEK_EDGE_TARGET>`.
- **A/AAAA** records (fallback): If your provider requires A/AAAA records for apex, consult Fleek docs for current IPs. (IPs can change; prefer ALIAS/ANAME if possible.)

## Optional: TXT verification
Some providers or setups require a TXT record for domain verification. Fleek will show the TXT name and value if needed:
```
Type: TXT
Name: _fleek-challenge.app
Value: <TXT_VERIFICATION_VALUE>
TTL: 300
```

## One-click templates (copy/paste)

### YAML (generic)
```yaml
domain: ${DOMAIN}
records:
  - type: CNAME
    name: ${SUBDOMAIN}
    value: ${FLEEK_EDGE_TARGET}
    ttl: 300
```

### Cloudflare DNS (Terraform)
```hcl
# subdomain CNAME
resource "cloudflare_record" "app" {
  zone_id = var.zone_id
  name    = "${SUBDOMAIN}"
  type    = "CNAME"
  value   = "${FLEEK_EDGE_TARGET}"
  ttl     = 300
  proxied = true
}
# optional TXT verification
resource "cloudflare_record" "fleek_txt" {
  zone_id = var.zone_id
  name    = "_fleek-challenge.${SUBDOMAIN}"
  type    = "TXT"
  value   = "${TXT_VERIFICATION_VALUE}"
  ttl     = 300
}
```

### Route53 (Terraform)
```hcl
# CNAME for subdomain
resource "aws_route53_record" "app_cname" {
  zone_id = var.zone_id
  name    = "${SUBDOMAIN}.${DOMAIN}"
  type    = "CNAME"
  ttl     = 300
  records = ["${FLEEK_EDGE_TARGET}"]
}
# optional TXT verification
resource "aws_route53_record" "fleek_txt" {
  zone_id = var.zone_id
  name    = "_fleek-challenge.${SUBDOMAIN}.${DOMAIN}"
  type    = "TXT"
  ttl     = 300
  records = ["${TXT_VERIFICATION_VALUE}"]
}
```

> Replace placeholders: `${DOMAIN}`, `${SUBDOMAIN}`, `${FLEEK_EDGE_TARGET}`, `${TXT_VERIFICATION_VALUE}` with values from Fleek when you connect your domain.

## Steps
1. In Fleek, open your site → **Domains** → **Add Domain**. Enter `app.yourdomain.com` (or apex).
2. Copy the suggested target into your DNS as shown above.
3. Wait for DNS to propagate (usually minutes, can be up to 24h).
4. Back in Fleek, click **Verify**. Once verified, Fleek will issue TLS automatically.
