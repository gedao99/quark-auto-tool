import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { cookie, share_id, pwd } = req.body;
    const target_fid = "af08cecad2fb47a1b09cb0a20fdee2a9"; // 你的文件夹ID
    let log = "";

    const headers = {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    };

    // 1. 清空旧文件
    log += "✅ 正在清空旧文件...\n";
    try {
        let list = await fetch("https://pan.quark.cn/1/api/file/list", {
            method: "POST", headers, body: JSON.stringify({ fid: target_fid, page_index: 1, page_size: 200 })
        });
        let data = await list.json();
        let files = data.data?.list || [];
        if (files.length > 0) {
            let fids = files.map(i => i.fid);
            await fetch("https://pan.quark.cn/1/api/file/delete", {
                method: "POST", headers, body: JSON.stringify({ fids, is_delete: true })
            });
            log += "✅ 旧文件已清空\n";
        } else {
            log += "✅ 无旧文件\n";
        }
    } catch (e) { log += "⚠️ 清空完成\n"; }

    // 2. 获取分享内文件夹
    log += "🔍 获取分享目录...\n";
    let share = await fetch("https://pan.quark.cn/1/api/share/transfer/list", {
        method: "POST", headers,
        body: JSON.stringify({ share_id, pwd, page_index: 1, page_size: 100, fid: "" })
    });
    let shareData = await share.json();
    let folder = shareData.data?.list?.[0];
    if (!folder) {
        log += "❌ 无法获取分享目录\n";
        res.send(log);
        return;
    }

    // 3. 转存
    log += "📤 正在转存新资源...\n";
    let save = await fetch("https://pan.quark.cn/1/api/share/transfer/save", {
        method: "POST", headers,
        body: JSON.stringify({
            share_id, pwd,
            save_list: [{ fid: folder.fid, is_dir: folder.is_dir }],
            to_fid: target_fid
        })
    });
    let saveRes = await save.json();
    if (saveRes.code === 0) log += "🎉 全部更新成功！";
    else log += "❌ 转存失败：" + saveRes.message;

    res.send(log);
}
