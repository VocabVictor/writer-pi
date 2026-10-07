别再用 JSON.stringify 做深拷贝

JavaScript 里流传最广的深拷贝写法，从 ES3 时代起就是它（下文代码均在 Node v20.11.0、Linux x64 下运行）：

    const copy = JSON.parse(JSON.stringify(state));

它的毛病不在慢，而在静默丢数据：Date 变成字符串，Map 和 Set 变成空对象，值为 undefined 的字段直接消失，遇到循环引用抛 TypeError。除了循环引用会抛错，其余都悄无声息：数据在拷贝那一刻就悄悄变了，往往要到用的时候才被发现。

替代写法是 structuredClone，Node 17.0.0（2021 年 10 月）起可用，浏览器端 Chrome 98、Firefox 94 起支持：

    const copy = structuredClone(state);

Date、Map 和 Set 都能正确拷贝（见下方对照）。

剩下的顾虑通常是速度。我在本机把同一个含 Map、Set、Date 的对象分别用两种写法各深拷贝 100 万次做对照：JSON 往返约 3.1 秒，结果错误，Map 和 Set 已经丢了；structuredClone 约 5.4 秒，结果正确。

structuredClone 在本机更慢，但正确性不能拿速度换。这组数字是本机测得的，不构成普适结论；方向却足够清楚：深拷贝默认写 structuredClone，别再把数据交给 JSON 往返。