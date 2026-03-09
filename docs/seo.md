# SEO Guide

## Canonical Domain
- Primary domain: https://caminhodoperdao.com.br
- All canonical, Open Graph URLs, sitemap entries, and schema URLs must use `.com.br`.
- Keep redirects active from Pages subdomain and any alternative hostnames.

## Routing SEO Strategy
- Route-level SEO is managed in src/seo/seoConfig.ts.
- Runtime application of title/meta/canonical/schema is done by src/components/seo/SeoManager.tsx.
- Add each new public route to seoConfig with title, description, keywords, and schema when relevant.

## Structured Data
- Reusable schema builders live in src/seo/schemas.ts.
- Landing page should keep Organization + Event + FAQ.
- Gallery pages should keep CollectionPage + BreadcrumbList.
- Admin and error routes must remain noindex.

## Robots and Sitemap
- robots.txt must point to https://caminhodoperdao.com.br/sitemap.xml.
- Keep public/sitemap.xml updated when adding/removing public routes.
- Avoid including private/auth routes in sitemap.

## Content Guidelines (Ranking)
- Publish dedicated pages for specific intents (ex.: peregrinacao em Sao Paulo, retiro espiritual, FAQ).
- Use unique H1, title, and description per route.
- Avoid duplicate metadata across different pages.

## Pre-Deploy SEO Checklist
- Canonical URL and og:url match current route and `.com.br` domain.
- Page title and meta description are unique and intent-focused.
- JSON-LD validates and matches visible page content.
- Sitemap contains all indexable routes and no private routes.
- robots.txt points to the correct sitemap URL.
