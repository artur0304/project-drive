// Общая оболочка Next.js. Пока дизайн живёт в готовых HTML-прототипах,
// поэтому здесь нет отдельной визуальной разметки.
export const metadata = {
  title: 'Project Drive',
  description: 'See it on your car first.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0C0E13' }}>{children}</body>
    </html>
  );
}
