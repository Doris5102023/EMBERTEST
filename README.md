# GitHub Pages 盲测投票站

这是 GitHub Pages 静态网页：每题展示七项匿名结果，评审必须选两项最佳。配置 Supabase 后，选择会自动上传至数据库；本地 CSV 下载仍保留为离线备份。

## 配置 Supabase 在线收集

1. 创建 Supabase 项目，在 **Authentication → Providers → Anonymous Sign-ins** 启用匿名登录。
2. 在 **SQL Editor** 中执行完整的 `supabase-schema.sql`。它只允许评审插入自己的投票，公开网页无法读取、修改或删除数据库记录。
3. 在 **Project Settings → API** 复制 `Project URL` 与 **anon public key**，替换 `supabase-config.js` 的两个占位符。
4. 将站点推送到 GitHub Pages。`anon key` 可以公开；绝不可使用或上传 `service_role key`。
5. 在 Supabase **Table Editor → votes** 查看投票，或导出 CSV。真实模型名只需用你私有的槽位映射表还原。

未配置 Supabase 时，网站自动退回为本地 CSV 模式，不会丢失投票。

## 准备图片与私有映射

将每道题的原图和七个**已匿名化**候选图放进以下结构：

```text
assets/originals/q001.png
assets/candidates/q001-s1.png
assets/candidates/q001-s2.png
...
assets/candidates/q001-s7.png
```

修改 `questions.json` 以增加所有题目。`slot` 是不公开的槽位 ID；每张题目页面会再次随机映射到 A–G。

在**不上传 GitHub 的本地私有文件**保存真实模型映射，例如：

```json
{
  "q001": { "s1": "bringold", "s2": "model_b", "s3": "model_c", "s4": "model_d", "s5": "model_e", "s6": "model_f", "s7": "model_g" }
}
```

不要把模型名称放进公开文件名、URL、`questions.json`、页面文本或 Git 历史。

## 本地预览

在这个目录启动任一静态 HTTP 服务，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。不要直接双击 `index.html`，浏览器会限制读取 JSON。

## 发布到 GitHub Pages

1. 创建一个新的公开或私有 GitHub 仓库，将本目录内容上传到仓库根目录。
2. 在仓库 **Settings → Pages** 中选择从 `main` 分支部署，目录选 `/(root)`。
3. 将生成的 Pages 链接发送给评审者。
4. 收集评审者下载并发回的 CSV，使用私有映射表将 `selected_slot_1/2` 还原为真实模型名。

每个浏览器会获得一个随机匿名 `participant_id`；清除浏览器数据或点击“清除本机记录”后会视为新投票者。
