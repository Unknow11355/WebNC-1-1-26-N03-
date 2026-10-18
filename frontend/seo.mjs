export function publicOrigin(env = process.env) {
  const value = env.PUBLIC_ORIGIN || (env.CODESPACE_NAME
    ? `https://${env.CODESPACE_NAME}-${env.PORT || 5173}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`
    : `http://localhost:${env.PORT || 5173}`);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_ORIGIN must be an HTTP(S) origin without credentials, path, query or fragment');
  }
  return url.origin;
}

export function renderSeo(template, origin) {
  const escaped = origin.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[c]);
  return template.replaceAll('{{PUBLIC_ORIGIN}}', escaped);
}
