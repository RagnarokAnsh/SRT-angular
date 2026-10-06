# Deployment

The app is a static site: build it and serve `dist/sri/browser/` from any web server.

```bash
npm ci
npm run build          # → dist/sri/browser
```

To show the app without the backend (sample data stored in the browser):

```bash
npm run build:demo     # → dist/demo/browser
```

## What the server must do

1. **Send every unknown path to `index.html`**, so links like `/children/12/edit` work after a
   refresh. Files that exist (scripts, images, fonts) are served as they are.
2. **Cache correctly.** File names of scripts and styles contain a hash, so they can be cached
   for a year. `index.html` must not be cached, or users keep an old version after a deploy.
   (If a tab still runs an old version, the app reloads itself once when it notices.)
3. **Use HTTPS**, and once the API also uses HTTPS, send `Strict-Transport-Security`.
4. **Send the security headers** below. The Content-Security-Policy is also in
   `src/index.prod.html` as a meta tag; the header version adds `frame-ancestors`, which a meta
   tag can't set. Keep `connect-src` in both places in line with `apiUrl` in
   `src/environments/environment.prod.ts`.

## nginx

```nginx
server {
  listen 443 ssl http2;
  server_name example.org;
  root /var/www/srt;          # contents of dist/sri/browser

  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self' https://ready.unilearn.org.in; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
  add_header Strict-Transport-Security "max-age=31536000" always;

  location = /index.html {
    add_header Cache-Control "no-cache";
  }

  location ~* \.(?:js|css|woff2?|webp|png|ico|mp4)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Note that nginx doesn't inherit `add_header` into a `location` that has its own `add_header`;
repeat the security headers there if your nginx version needs it.

## Apache (`.htaccess` in the site folder)

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self' https://ready.unilearn.org.in; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"

  <FilesMatch "^index\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\.(js|css|woff2?|webp|png|ico|mp4)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
```

## Until the API has HTTPS

Browsers refuse `http://` API calls from an `https://` page. While the API is HTTP-only, the app
can only talk to it when it is also served over plain HTTP, which exposes passwords and children's
data on the network. Treat enabling HTTPS on the API as a blocker for going live (see
[SECURITY.md](SECURITY.md), S1).
