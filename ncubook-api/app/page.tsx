export default function Home() {
    return (
        <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
            <h1>ncubook API</h1>
            <p>南昌大学生存手册 AI 问答后端</p>
            <p>
                <code>POST /api/chat</code> — AI 对话接口
            </p>
            <p>
                <code>GET /admin</code> — 校园信息运营中台
            </p>
            <p>
                <code>GET /api/cron/crawl-official-sources</code> — 官网来源定时抓取
            </p>
        </main>
    );
}
