export function getLineLoginUrl(redirectAfter = '/register') {
  const state = encodeURIComponent(redirectAfter)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_LINE_CALLBACK_URL!,
    state,
    scope: 'profile openid email',
    // 登入時一併邀請加入官方帳號「央北跨世代共居」好友，才收得到上課前一天的提醒
    bot_prompt: 'aggressive',
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`
}
