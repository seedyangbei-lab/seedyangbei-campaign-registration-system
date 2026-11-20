export function getLineLoginUrl(redirectAfter = '/register') {
  const state = encodeURIComponent(redirectAfter)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_LINE_CALLBACK_URL!,
    state,
    scope: 'profile openid email',
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`
}
