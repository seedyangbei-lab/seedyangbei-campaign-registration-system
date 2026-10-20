import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'

// 瀏覽器端只會用到 supabase.from(...)（資料表）跟 supabase.storage（上傳圖片），
// 完全沒用到登入（auth）、即時訂閱（realtime）、edge functions。
// 原本用 @supabase/ssr 的 createBrowserClient 會把整包 supabase-js（含 auth-js、realtime-js）
// 打包進每一頁，後台／中台每頁多下載約 65kB。這裡直接組合真正用到的兩個子套件，
// 對外介面跟原本一樣（.from() / .storage），呼叫端不用改。
//
// 送出去的 header 跟 supabase-js 沒有登入 session 時完全相同：apikey + Authorization: Bearer <anon key>，
// 所以 RLS 權限判斷不變。
export function createClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, '')
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    const rest = new PostgrestClient(`${url}/rest/v1`, { headers, schema: 'public' })
    client = {
      from: ((relation: string) => rest.from(relation)) as typeof rest.from,
      storage: new StorageClient(`${url}/storage/v1`, headers),
    }
  }
  return client
}

// 跟原本 createBrowserClient 一樣在瀏覽器端共用同一個 client，元件每次 render 呼叫 createClient() 不會重建
let client: { from: PostgrestClient['from']; storage: StorageClient } | null = null
