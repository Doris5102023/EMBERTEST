# GitHub Pages 盲测投票站

这是纯静态网页：每题展示七项匿名结果，评审必须选两项最佳；投票记录仅保存在评审浏览器，点击“下载本地 CSV”后交给组织者汇总。

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
