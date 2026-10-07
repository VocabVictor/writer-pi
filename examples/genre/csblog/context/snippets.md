# 代码与命令核对

- const copy = JSON.parse(JSON.stringify(state)); → sources/snippets.md 代码一：当前写法，Date 变字符串、Map/Set 变空对象、undefined 字段消失、循环引用抛 TypeError
- const copy = structuredClone(state); → sources/snippets.md 代码二：Node 17.0.0（2021 年 10 月）引入；浏览器端 Chrome 98、Firefox 94 起可用
- 性能对照（本机 Node v20.11.0、Linux x64，含 Map/Set/Date 对象深拷贝 100 万次）：JSON 往返约 3.1 秒（结果错误）、structuredClone 约 5.4 秒（正确）→ sources/snippets.md
- 「从 ES3 时代起就是最常见的深拷贝写法」→ sources/snippets.md 版本事实
- 运行环境注记：Node v20.11.0、Linux x64 → sources/snippets.md
