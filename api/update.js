import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 跨域处理，避免前端请求报错
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { cookie, share_id, pwd } = req.body;
  // 你的目标文件夹ID，固定不变
  const target_fid = "fe59d8d669e64f8e8e646480ef33f21c
";
  let log = "";

  // 完整请求头，彻底解决夸克反爬拦截
  const headers = {
    "Cookie": cookie,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
    "Referer": "https://pan.quark.cn/",
    "Origin": "https://pan.quark.cn"
  };

  try {
    // 1. 清空目标文件夹旧文件
    log += "✅ 正在清空旧文件...\n";
    const listRes = await fetch("https://pan.quark.cn/1/api/file/list", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ fid: target_fid, page_index: 1, page_size: 200 }),
      timeout: 30000
    });

    if (!listRes.ok) {
      log += `⚠️ 列表接口异常: ${listRes.status}\n`;
    } else {
      const listData = await listRes.json();
      const files = listData.data?.list || [];
      if (files.length > 0) {
        const fids = files.map(f => f.fid);
        await fetch("https://pan.quark.cn/1/api/file/delete", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ fids, is_delete: true }),
          timeout: 30000
        });
        log += `✅ 已清理旧文件 ${files.length} 个\n`;
      } else {
        log += "✅ 文件夹无旧文件\n";
      }
    }

    // 2. 获取分享目录，找到子文件夹
    log += "🔍 获取分享目录...\n";
    const shareRes = await fetch("https://pan.quark.cn/1/api/share/transfer/list", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        share_id: share_id,
        pwd: pwd,
        page_index: 1,
        page_size: 100,
        fid: ""
      }),
      timeout: 30000
    });

    if (!shareRes.ok) {
      log += `❌ 分享接口异常: ${shareRes.status}\n`;
      return res.send(log);
    }

    const shareData = await shareRes.json();
    if (shareData.code !== 0) {
      log += `❌ 分享目录获取失败: ${shareData.message || "无错误信息"}\n`;
      return res.send(log);
    }

    const shareList = shareData.data?.list || [];
    if (shareList.length === 0) {
      log += "❌ 分享目录为空，无文件可转存\n";
      return res.send(log);
    }

    // 取第一个文件夹（你的「新黎明软件库」）
    const targetFolder = shareList[0];

    // 3. 转存子文件夹到目标目录
    log += "📤 正在转存新资源...\n";
    const saveRes = await fetch("https://pan.quark.cn/1/api/share/transfer/save", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        share_id: share_id,
        pwd: pwd,
        save_list: [{ fid: targetFolder.fid, is_dir: targetFolder.is_dir }],
        to_fid: target_fid
      }),
      timeout: 60000
    });

    if (!saveRes.ok) {
      log += `❌ 转存接口异常: ${saveRes.status}\n`;
      return res.send(log);
    }

    const saveData = await saveRes.json();
    if (saveData.code === 0) {
      log += "🎉 全部更新成功！\n";
    } else {
      log += `❌ 转存失败: ${saveData.message || "无错误信息"}\n`;
      log += "👉 请检查：提取码是否正确 / 链接是否失效\n";
    }

    res.send(log);

  } catch (error) {
    log += `❌ 程序异常: ${error.message}\n`;
    res.send(log);
  }
}
