#!/usr/bin/env node
/**
 * Quick DNS template filler
 * Usage:
 *   node scripts/dns-template.mjs --domain yourdomain.com --sub app --target some-edge.fleek.co --txt abc123 (optional)
 */
import { argv } from 'node:process'

function arg(name, def=null) {
  const i = argv.indexOf(`--${name}`)
  if (i !== -1 && argv[i+1]) return argv[i+1]
  return def
}
const DOMAIN = arg('domain')
const SUB = arg('sub','app')
const TARGET = arg('target')
const TXT = arg('txt','')

if (!DOMAIN || !TARGET) {
  console.error('Usage: --domain yourdomain.com --sub app --target <FLEEK_EDGE_TARGET> [--txt <TXT_VERIFICATION_VALUE>]')
  process.exit(1)
}

const vars = { DOMAIN, SUBDOMAIN: SUB, FLEEK_EDGE_TARGET: TARGET, TXT_VERIFICATION_VALUE: TXT }

const yaml = `domain: ${vars.DOMAIN}
records:
  - type: CNAME
    name: ${vars.SUBDOMAIN}
    value: ${vars.FLEEK_EDGE_TARGET}
    ttl: 300
`

const cf = `resource "cloudflare_record" "app" {
  zone_id = var.zone_id
  name    = "${vars.SUBDOMAIN}"
  type    = "CNAME"
  value   = "${vars.FLEEK_EDGE_TARGET}"
  ttl     = 300
  proxied = true
}
${TXT ? `resource "cloudflare_record" "fleek_txt" {
  zone_id = var.zone_id
  name    = "_fleek-challenge.${vars.SUBDOMAIN}"
  type    = "TXT"
  value   = "${vars.TXT_VERIFICATION_VALUE}"
  ttl     = 300
}` : ''}
`

const r53 = `resource "aws_route53_record" "app_cname" {
  zone_id = var.zone_id
  name    = "${vars.SUBDOMAIN}.${vars.DOMAIN}"
  type    = "CNAME"
  ttl     = 300
  records = ["${vars.FLEEK_EDGE_TARGET}"]
}
${TXT ? `resource "aws_route53_record" "fleek_txt" {
  zone_id = var.zone_id
  name    = "_fleek-challenge.${vars.SUBDOMAIN}.${vars.DOMAIN}"
  type    = "TXT"
  ttl     = 300
  records = ["${vars.TXT_VERIFICATION_VALUE}"]
}` : ''}
`

console.log('--- YAML ---\n' + yaml)
console.log('--- Cloudflare (Terraform) ---\n' + cf)
console.log('--- Route53 (Terraform) ---\n' + r53)
