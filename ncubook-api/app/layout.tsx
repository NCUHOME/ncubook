export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-Hans">
            <body>{children}</body>
        </html>
    );
}
