import './base.css';

export const metadata = {
  title: 'Project Drive',
  description: 'See it on your car first.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
